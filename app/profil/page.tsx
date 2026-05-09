"use client";

import AdminButton from "@/components/AdminButton";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/lib/hooks/useWallet";
import { formatEuro } from "@/lib/wallet/tiers";
import { getUserBookings } from "@/lib/firebase/bookings";
import { db } from "@/lib/firebaseConfig";
import {
  updateProfile,
  updateEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Wallet, ArrowRight, Loader2 } from "lucide-react";

// Définir l'interface pour une réservation
interface Booking {
  id: string;
  reservationId: string;
  createdAt: Date | number | string;
  depart: string;
  arrivee: string;
  prix: number;
  status: string;
}

export default function ProfilPage() {
  const { user, loading, logOut, updatePhoneNumber } = useAuth();
  const { balanceEur, loading: walletLoading } = useWallet();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isEditing, setIsEditing] = useState(false);

  // États pour les réservations avec le type correct
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // États pour la suppression de compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    if (!loading && !user) {
      router.push("/connexion");
    }

    if (user) {
      // Récupérer les données complètes de l'utilisateur depuis Firestore
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Nom complet (priorité : Firestore > Firebase Auth > chaîne vide)
            setDisplayName(userData.displayName || user.displayName || "");

            // Email (toujours depuis Firebase Auth)
            setEmail(user.email || "");

            // Numéro de téléphone (priorité : Firestore > chaîne vide)
            setPhoneNumber(userData.phoneNumber || "");
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des données utilisateur:",
            error
          );
        }

        // Charger les réservations de l'utilisateur
        try {
          setIsLoading(true);
          const userBookings = await getUserBookings(user.uid);

          // Filtrer les réservations pour ne garder que celles correspondant à l'utilisateur
          const filteredBookings = userBookings.filter(
            (booking) =>
              booking.userId === user.uid ||
              booking.userId === `registered_${user.uid}` ||
              booking.email === user.email
          );

          setBookings(filteredBookings as Booking[]);
        } catch (error) {
          console.error("Erreur lors du chargement des réservations:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserData();
    }
  }, [user, loading, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (user) {
        await updateProfile(user, {
          displayName: displayName,
        });

        if (email !== user.email && user.email !== null) {
          await updateEmail(user, email);
        }

        // Mettre à jour le numéro de téléphone
        if (phoneNumber !== user.phoneNumber) {
          await updatePhoneNumber(phoneNumber);
        }

        setMessage({ text: "Profil mis à jour avec succès!", isError: false });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      setMessage({
        text: "Erreur lors de la mise à jour du profil. Veuillez réessayer.",
        isError: true,
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      setDeleteError("Veuillez entrer votre mot de passe pour confirmer");
      return;
    }

    try {
      if (!user || !user.email) {
        setDeleteError("Utilisateur non connecté ou email manquant");
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      router.push("/");
    } catch (error: any) {
      console.error("Erreur lors de la suppression du compte:", error);
      setDeleteError(
        error.code === "auth/wrong-password"
          ? "Mot de passe incorrect"
          : "Erreur lors de la suppression du compte. Veuillez réessayer."
      );
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon Profil</h1>

        {/* Informations de profil */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6">
            {message.text && (
              <div
                className={`p-4 mb-6 rounded-md ${
                  message.isError
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nom complet
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!isEditing}
                    className={`mt-1 block w-full p-3 border ${
                      isEditing
                        ? "border-gray-300"
                        : "border-gray-200 bg-gray-50"
                    } rounded-md shadow-sm`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    className={`mt-1 block w-full p-3 border ${
                      isEditing
                        ? "border-gray-300"
                        : "border-gray-200 bg-gray-50"
                    } rounded-md shadow-sm`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Numéro de téléphone
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!isEditing}
                    className={`mt-1 block w-full p-3 border ${
                      isEditing
                        ? "border-gray-300"
                        : "border-gray-200 bg-gray-50"
                    } rounded-md shadow-sm`}
                  />
                </div>

                {isEditing ? (
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="py-3 px-6 bg-[#ffc107] rounded-md font-medium hover:bg-yellow-500 transition-colors"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-3 px-6 bg-gray-200 rounded-md font-medium hover:bg-gray-300 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="py-3 px-6 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
                  >
                    Modifier mon profil
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Mon portefeuille */}
        <div className="relative bg-black text-white rounded-lg shadow overflow-hidden mb-8">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.4), transparent 50%)",
            }}
          />
          <div className="relative p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400">
                  Mon portefeuille
                </div>
                <div className="text-2xl sm:text-3xl font-bold tabular-nums mt-0.5">
                  {walletLoading || balanceEur === null ? (
                    <span className="inline-flex items-center gap-2 text-base text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement…
                    </span>
                  ) : (
                    formatEuro(balanceEur)
                  )}
                </div>
              </div>
            </div>
            <Link
              href="/profil/portefeuille"
              className="inline-flex items-center justify-center gap-2 bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-md hover:bg-amber-300 transition-colors text-sm"
            >
              Voir mon portefeuille
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Historique des réservations */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Mes réservations</h2>

            {bookings.length === 0 ? (
              <p className="text-gray-500 italic">
                Aucune réservation trouvée.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Référence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trajet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prix
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.reservationId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="truncate max-w-xs">
                            <div>
                              <span className="font-medium">De:</span>{" "}
                              {booking.depart}
                            </div>
                            <div>
                              <span className="font-medium">À:</span>{" "}
                              {booking.arrivee}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.prix.toFixed(2)}€
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {booking.status === "confirmed"
                              ? "Confirmée"
                              : booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Options avancées</h2>
            <AdminButton />
          </div>
        </div>

        {/* Section suppression de compte */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">
              Supprimer mon compte
            </h2>
            <p className="text-gray-600 mb-4">
              Attention : La suppression de votre compte est définitive et
              entraînera la perte de toutes vos données.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Supprimer mon compte
              </button>
            ) : (
              <div className="border border-red-200 rounded-md p-4 bg-red-50">
                <p className="text-red-600 font-medium mb-3">
                  Veuillez confirmer la suppression de votre compte en
                  saisissant votre mot de passe :
                </p>
                {deleteError && (
                  <div className="p-3 mb-3 bg-red-100 text-red-700 rounded-md">
                    {deleteError}
                  </div>
                )}
                <div className="mb-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Confirmer la suppression
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setPassword("");
                      setDeleteError("");
                    }}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function updateUserPhoneNumber(phoneNumber: string) {
  throw new Error("Function not implemented.");
}
