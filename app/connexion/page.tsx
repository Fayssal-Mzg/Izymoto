"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { logIn, signInWithGoogle, reservationDetails, setReservationDetails } =
    useAuth();
  const router = useRouter();

  // Vérifier localStorage au chargement
  useEffect(() => {
    const pendingReservation = localStorage.getItem("pendingReservation");
    if (pendingReservation && !reservationDetails) {
      try {
        const details = JSON.parse(pendingReservation);
        setReservationDetails(details);
      } catch (error) {
        console.error(
          "Erreur lors de la lecture des détails de réservation:",
          error
        );
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation améliorée
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      await logIn(email, password);
      toast.success("Connexion réussie!");

      // Nettoyer localStorage
      localStorage.removeItem("pendingReservation");

      // Rediriger vers la page de réservation si des détails sont en attente
      if (reservationDetails) {
        router.push("/reserver");
      } else {
        router.push("/"); // Sinon, rediriger vers la page d&apos;accueil
      }
    } catch (err) {
      toast.error("Échec de la connexion. Veuillez vérifier vos identifiants.");
      console.error(err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success("Connexion avec Google réussie!");

      // Nettoyer localStorage
      localStorage.removeItem("pendingReservation");

      // Même logique pour la connexion Google
      if (reservationDetails) {
        router.push("/reserver");
      } else {
        router.push("/");
      }
    } catch (err) {
      toast.error("Échec de la connexion avec Google.");
      console.error(err);
    }
  };

  // Afficher un message si l&apos;utilisateur a une réservation en attente
  const reservationMessage = reservationDetails ? (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-700">
      <p>
        Connectez-vous pour finaliser votre réservation de{" "}
        {reservationDetails.depart} à {reservationDetails.arrivee}
      </p>
    </div>
  ) : null;

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Connexion</h1>
          <p className="mt-2 text-gray-600">Connectez-vous à votre compte</p>
        </div>

        {/* Afficher le message de réservation en attente s&apos;il y en a un */}
        {reservationMessage}

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffc107]"
              placeholder="Votre adresse email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffc107]"
              placeholder="Votre mot de passe"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-black rounded-md hover:bg-gray-800"
            >
              Se connecter
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">Ou</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              className="w-full px-4 py-2 flex justify-center items-center bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
              Continuer avec Google
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Vous n&apos;avez pas de compte ?{" "}
            <Link
              href="/inscription"
              className="font-medium text-[#ffc107] hover:text-yellow-500"
            >
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
