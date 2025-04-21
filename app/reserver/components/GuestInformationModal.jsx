// app/reserver/components/GuestInformationModal.jsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function GuestInformationModal({ onSubmit, onCancel }) {
  const [guestData, setGuestData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGuestData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Effacer l'erreur quand l'utilisateur modifie un champ
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation du nom
    if (!guestData.name.trim()) {
      newErrors.name = "Votre nom est requis";
    }

    // Validation de l'email
    if (!guestData.email.trim()) {
      newErrors.email = "Votre email est requis";
    } else if (!/\S+@\S+\.\S+/.test(guestData.email)) {
      newErrors.email = "Format d'email invalide";
    }

    // Validation du téléphone
    if (!guestData.phone.trim()) {
      newErrors.phone = "Votre numéro de téléphone est requis";
    } else if (!/^[0-9+\s()-]{8,15}$/.test(guestData.phone)) {
      newErrors.phone = "Format de téléphone invalide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(guestData);
    } catch (error) {
      console.error("Erreur lors de la soumission :", error);
      setErrors({ submit: "Une erreur est survenue. Veuillez réessayer." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-lg w-full h-full sm:h-auto sm:w-full sm:max-w-md mx-auto flex flex-col sm:max-h-[90vh]">
        <div className="bg-[#ffc107] p-4 rounded-t-lg flex-shrink-0">
          <h3 className="text-xl font-bold text-black">Vos informations</h3>
        </div>

        {/* Conteneur avec scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm">
                {errors.submit}
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              Veuillez fournir vos informations pour recevoir votre devis par
              email.
            </p>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom complet*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={guestData.name}
                onChange={handleChange}
                className={`block w-full p-2 border ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } rounded-md text-base`}
                placeholder="Votre nom"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email*
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={guestData.email}
                onChange={handleChange}
                className={`block w-full p-2 border ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } rounded-md text-base`}
                placeholder="votre@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Téléphone*
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={guestData.phone}
                onChange={handleChange}
                className={`block w-full p-2 border ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                } rounded-md text-base`}
                placeholder="06 xx xx xx xx"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes supplémentaires
              </label>
              <textarea
                id="notes"
                name="notes"
                value={guestData.notes}
                onChange={handleChange}
                className="block w-full p-2 border border-gray-300 rounded-md text-base"
                rows={3}
                placeholder="Détails supplémentaires pour votre devis..."
              />
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition text-sm"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Traitement..." : "Demander un devis"}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600 mb-2">
                  Vous avez déjà un compte ?
                </p>
                <div className="flex space-x-3">
                  <Link
                    href="/connexion"
                    className="flex-1 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition text-sm text-center"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/inscription"
                    className="flex-1 py-2 bg-gray-800 text-white rounded-md hover:bg-black transition text-sm text-center"
                  >
                    S'inscrire
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
