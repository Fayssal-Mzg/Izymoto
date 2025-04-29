"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { User, Mail, Phone, FileText, X, ArrowRight, LogIn, UserPlus } from "lucide-react";

export default function GuestInformationModal({ onSubmit, onCancel }) {
  const [guestData, setGuestData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Animation d'entrée
  useEffect(() => {
    setAnimateIn(true);
  }, []);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className={`bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl transform transition-all duration-300 ${
          animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header avec bouton de fermeture */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Vos informations</h3>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteneur scrollable */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 78px)' }}>
          <p className="text-gray-600 mb-6">
            Veuillez fournir vos informations pour recevoir votre devis par email.
          </p>

          {errors.submit && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded mb-6">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom complet */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={guestData.name}
                  onChange={handleChange}
                  className={`pl-10 block w-full p-3 border ${
                    errors.name ? "border-red-500 ring-red-100" : "border-gray-300 focus:ring-black focus:border-black"
                  } rounded-lg bg-white transition-all`}
                  placeholder="Votre nom et prénom"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={guestData.email}
                  onChange={handleChange}
                  className={`pl-10 block w-full p-3 border ${
                    errors.email ? "border-red-500 ring-red-100" : "border-gray-300 focus:ring-black focus:border-black"
                  } rounded-lg bg-white transition-all`}
                  placeholder="exemple@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={guestData.phone}
                  onChange={handleChange}
                  className={`pl-10 block w-full p-3 border ${
                    errors.phone ? "border-red-500 ring-red-100" : "border-gray-300 focus:ring-black focus:border-black"
                  } rounded-lg bg-white transition-all`}
                  placeholder="06 xx xx xx xx"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes supplémentaires
              </label>
              <div className="relative">
                <FileText size={18} className="absolute left-3 top-3 text-gray-500" />
                <textarea
                  id="notes"
                  name="notes"
                  value={guestData.notes}
                  onChange={handleChange}
                  className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all"
                  rows={3}
                  placeholder="Détails supplémentaires pour votre devis..."
                />
              </div>
            </div>

            {/* Bouton Demander un devis */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 bg-black text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                isSubmitting ? 'opacity-80' : 'hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <span>Demander un devis</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Options de connexion */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-4 text-center">
                Vous avez déjà un compte ?
              </p>
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <Link
                  href="/connexion"
                  className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 text-center flex items-center justify-center"
                >
                  <LogIn size={16} className="mr-2" />
                  <span>Se connecter</span>
                </Link>
                <Link
                  href="/inscription"
                  className="py-3 px-4 bg-gray-800 text-white rounded-lg font-medium hover:bg-black transition-colors flex-1 text-center flex items-center justify-center"
                >
                  <UserPlus size={16} className="mr-2" />
                  <span>S'inscrire</span>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}