"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  User,
  Phone,
  FileText,
  Mail,
  X,
  ArrowRight,
} from "lucide-react";

export default function ReservationModal({
  reservationDate,
  setReservationDate,
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  notes,
  setNotes,
  onCancel,
  onProceed,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animateIn, setAnimateIn] = useState(false);
  const { user } = useAuth();
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  // Récupération des données Firestore (nom, tel, email)
  useEffect(() => {
    if (dataFetchedRef.current) return;
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (!name && (userData.displayName || user.displayName)) {
            setName(userData.displayName || user.displayName);
          }
          if (!phone && userData.phoneNumber) {
            setPhone(userData.phoneNumber);
          }
          if (!email && userData.email) {
            setEmail(userData.email);
          }
        } else {
          if (user.displayName && !name) setName(user.displayName);
          if (user.email && !email) setEmail(user.email);
        }

        dataFetchedRef.current = true;
      } catch (err) {
        console.error(
          "Erreur lors de la récupération des données utilisateur:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, name, phone, email, setName, setPhone, setEmail]);

  // Validation
  const handleProceed = () => {
    setError("");

    if (!name || !name.trim()) {
      setError("Le nom complet est obligatoire");
      return;
    }
    if (!phone || !phone.trim()) {
      setError("Le numéro de téléphone est obligatoire");
      return;
    }
    if (!email || !email.trim()) {
      setError("L'adresse email est obligatoire");
      return;
    }
    if (!reservationDate) {
      setError("La date et l'heure sont obligatoires");
      return;
    }

    const selectedDate = new Date(reservationDate);
    const currentDate = new Date();
    if (selectedDate <= currentDate) {
      setError("La date de réservation doit être dans le futur");
      return;
    }

    onProceed();
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl transform transition-all duration-300 ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            Finaliser votre réservation
          </h3>
          <button
            onClick={onCancel}
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 78px)" }}
        >
          <p className="text-gray-600 mb-6">
            Veuillez compléter les informations pour finaliser votre
            réservation.
          </p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-3 border-black border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Date */}
              <div className="space-y-2">
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date et heure <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="datetime-local"
                    id="date"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all"
                    min={getMinDateTime()}
                    required
                  />
                </div>
              </div>

              {/* Nom */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all"
                    placeholder="Votre nom et prénom"
                    required
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all"
                    placeholder="06 xx xx xx xx"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all"
                    placeholder="Votre adresse email"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Instructions particulières
                </label>
                <div className="relative">
                  <FileText
                    size={18}
                    className="absolute left-3 top-3 text-gray-500"
                  />
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all"
                    rows={3}
                    placeholder="Instructions pour le chauffeur..."
                  />
                </div>
              </div>

              {/* Boutons */}
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-4">
                  * Champs obligatoires
                </p>
                <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 text-center"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleProceed}
                    className="py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex-1 text-center flex items-center justify-center space-x-2 group"
                  >
                    <span>Continuer</span>
                    <ArrowRight
                      size={16}
                      className="transform group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
