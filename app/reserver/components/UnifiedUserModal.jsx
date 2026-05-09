"use client";

import { useUserInformation } from "@/lib/hooks/useUserInformation";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  User,
  Phone,
  FileText,
  Mail,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

/**
 * Modal unifié pour la collecte des informations utilisateur
 *
 * @param {Object} props - Les propriétés du composant
 * @param {"devis"|"reservation"} props.type - Type de modal (par défaut: "devis")
 * @param {string} props.title - Titre personnalisé du modal
 * @param {string} props.subtitle - Sous-titre personnalisé du modal
 * @param {string} props.submitButtonText - Texte du bouton de soumission
 * @param {Function} props.onSubmit - Callback appelé lors de la soumission avec les données
 * @param {Function} props.onCancel - Callback appelé lors de l'annulation
 * @param {string} props.reservationDate - Date de réservation sélectionnée
 * @param {Function} props.setReservationDate - Setter pour la date de réservation
 * @param {string} props.notes - Notes/instructions
 * @param {Function} props.setNotes - Setter pour les notes
 * @param {boolean} props.showDateField - Forcer l'affichage du champ date
 * @param {boolean} props.showNotesField - Forcer l'affichage du champ notes
 * @param {Function} props.additionalValidation - Validation personnalisée supplémentaire
 * @param {string} props.customButtonClass - Classes CSS personnalisées pour le bouton
 * @param {boolean} props.disabled - Désactiver le formulaire
 * @param {boolean} props.autoFocus - Focus automatique sur le premier champ
 */
export default function UnifiedUserModal({
  type = "devis",
  title,
  subtitle,
  submitButtonText,
  onSubmit,
  onCancel,
  onClose,
  reservationDate,
  setReservationDate,
  notes,
  setNotes,
  showDateField,
  showNotesField,
  additionalValidation,
  customButtonClass,
  disabled = false,
  autoFocus = true,
}) {
  // États locaux
  const [animateIn, setAnimateIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Refs pour l'accessibilité
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Hook d'authentification
  const { user } = useAuth();

  // Hook personnalisé pour les données utilisateur
  const {
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    loading: userDataLoading,
    setLoading,
    error: userDataError,
    setError,
    validateUserData,
    saveUserData,
    userData,
  } = useUserInformation();

  // Configuration dynamique selon le type
  const isReservation = type === "reservation";
  const shouldShowDateField = showDateField ?? isReservation;
  const shouldShowNotesField = showNotesField ?? isReservation;

  const config = {
    title:
      title ||
      (isReservation ? "Finaliser votre réservation" : "Vos informations"),
    subtitle:
      subtitle ||
      (isReservation
        ? "Veuillez compléter les informations pour finaliser votre réservation"
        : "Pour recevoir votre devis personnalisé"),
    submitButtonText:
      submitButtonText || (isReservation ? "Continuer" : "Recevoir le devis"),
  };

  // Animation d'entrée
  useEffect(() => {
    setAnimateIn(true);

    // Focus automatique sur le premier champ si activé
    if (autoFocus && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 300);
    }
  }, [autoFocus]);

  // Gestion du focus trap pour l'accessibilité
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        (onClose ?? onCancel)?.();
      }

      if (e.key === "Tab") {
        // Logique de focus trap basique
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Fonction de validation en temps réel
  const validateField = useCallback(
    (fieldName, value) => {
      const errors = {};

      switch (fieldName) {
        case "name":
          if (!value.trim()) {
            errors.name = "Le nom complet est obligatoire";
          } else if (value.trim().length < 2) {
            errors.name = "Le nom doit contenir au moins 2 caractères";
          } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) {
            errors.name =
              "Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets";
          }
          break;

        case "phone":
          if (!value.trim()) {
            errors.phone = "Le numéro de téléphone est obligatoire";
          } else if (
            !/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(
              value.replace(/\s/g, "")
            )
          ) {
            errors.phone =
              "Veuillez saisir un numéro de téléphone français valide";
          }
          break;

        case "email":
          if (!value.trim()) {
            errors.email = "L'adresse email est obligatoire";
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.email = "Veuillez saisir une adresse email valide";
          }
          break;

        case "reservationDate":
          if (shouldShowDateField && !value) {
            errors.reservationDate = "La date et l'heure sont obligatoires";
          } else if (value) {
            const selectedDate = new Date(value);
            const now = new Date();
            now.setMinutes(now.getMinutes() + 15);

            if (selectedDate <= now) {
              errors.reservationDate =
                "La date de réservation doit être au moins 15 minutes dans le futur";
            }

            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (selectedDate > maxDate) {
              errors.reservationDate =
                "La date de réservation ne peut pas dépasser 6 mois";
            }
          }
          break;
      }

      return errors;
    },
    [shouldShowDateField]
  );

  // Gestionnaire de changement de champ avec validation
  const handleFieldChange = useCallback(
    (fieldName, value, setter) => {
      setter(value);

      // Marquer le champ comme touché
      setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

      // Valider le champ
      const fieldErrors = validateField(fieldName, value);
      setValidationErrors((prev) => {
        const newErrors = { ...prev, ...fieldErrors };

        // Supprimer l'erreur si la validation passe
        if (Object.keys(fieldErrors).length === 0 && newErrors[fieldName]) {
          delete newErrors[fieldName];
        }

        return newErrors;
      });
    },
    [validateField]
  );

  // Validation complète du formulaire
  const validateForm = useCallback(() => {
    const errors = {};

    // Validation des champs utilisateur
    Object.assign(errors, validateField("name", name));
    Object.assign(errors, validateField("phone", phone));
    Object.assign(errors, validateField("email", email));

    // Validation de la date si nécessaire
    if (shouldShowDateField) {
      Object.assign(
        errors,
        validateField("reservationDate", reservationDate || "")
      );
    }

    // Validation additionnelle personnalisée
    if (additionalValidation) {
      const formData = {
        name,
        phone,
        email,
        ...(shouldShowDateField && { reservationDate }),
        ...(shouldShowNotesField && { notes }),
      };

      const customError = additionalValidation(formData);
      if (customError) {
        errors.custom = customError;
      }
    }

    return errors;
  }, [
    name,
    phone,
    email,
    reservationDate,
    notes,
    shouldShowDateField,
    shouldShowNotesField,
    validateField,
    additionalValidation,
  ]);

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (disabled || isSubmitting) return;

    // Marquer tous les champs comme touchés
    setTouchedFields({
      name: true,
      phone: true,
      email: true,
      ...(shouldShowDateField && { reservationDate: true }),
    });

    // Validation complète
    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Focus sur le premier champ avec erreur
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstErrorField);
      errorElement?.focus();
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Logique de sauvegarde selon le contexte :
      // - Utilisateurs connectés + réservations : sauvegarde Firebase via useUserInformation
      // - Utilisateurs connectés + devis : sauvegarde Firebase via useUserInformation
      // - Utilisateurs non connectés + devis : pas de sauvegarde Firebase
      // - Utilisateurs non connectés + réservations : gérés via le système de bookings avec userId="guest"

      const shouldSaveUserData =
        user && (isReservation || type === "reservation" || type === "devis");

      if (shouldSaveUserData) {
        try {
          await saveUserData();
          console.log("Données utilisateur sauvegardées dans Firebase");

          // Afficher un feedback de succès temporaire
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1000);
        } catch (saveError) {
          console.warn("Échec de la sauvegarde Firebase:", saveError);

          // Pour les réservations d'utilisateurs connectés, on veut vraiment que ça marche
          if (isReservation) {
            throw new Error(
              "Erreur lors de la sauvegarde de vos informations. Veuillez réessayer."
            );
          }

          // Pour les devis, on peut continuer même si la sauvegarde échoue
          console.log(
            "Poursuite du processus de devis malgré l'échec de sauvegarde"
          );
        }
      } else {
        console.log(
          "Utilisateur non connecté - pas de sauvegarde Firebase nécessaire"
        );
      }

      // Préparer les données à retourner
      const submissionData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ...(shouldShowDateField && { reservationDate }),
        ...(shouldShowNotesField && { notes: notes?.trim() }),
        // Ajouter des métadonnées utiles
        userType: user ? "registered" : "guest",
        userId: user ? user.uid : "guest",
      };

      // Délai d'affichage conditionnel
      if (shouldSaveUserData && showSuccess) {
        // Petit délai pour montrer le succès si sauvegarde réussie
        setTimeout(() => {
          onSubmit(submissionData);
        }, 1000);
      } else {
        // Soumission immédiate pour les invités ou en cas d'échec de sauvegarde
        onSubmit(submissionData);
      }
    } catch (err) {
      console.error("Erreur lors de la soumission:", err);
      setError(
        err.message || "Erreur lors de la soumission. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction utilitaire pour obtenir la date/heure minimum
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  };

  // Fonction utilitaire pour obtenir la date/heure maximum
  const getMaxDateTime = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    return maxDate.toISOString().slice(0, 16);
  };

  // Formatage du téléphone en temps réel
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    let formatted = cleaned;

    if (cleaned.startsWith("33")) {
      formatted = `+${cleaned}`;
    } else if (cleaned.startsWith("0") && cleaned.length <= 10) {
      formatted = cleaned.replace(/(\d{2})(?=\d)/g, "$1 ");
    }

    return formatted;
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-xl w-full max-w-md md:max-w-lg mx-auto shadow-2xl transform transition-all duration-300 flex flex-col ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header — hauteur fixe, ne défile pas */}
        <div className="relative p-6 border-b border-gray-100 flex-shrink-0">
          <h3 id="modal-title" className="text-xl font-bold text-gray-900 pr-10">
            {config.title}
          </h3>
          <p id="modal-description" className="text-sm text-gray-600 mt-1 pr-10">
            {config.subtitle}
          </p>
          <button
            type="button"
            onClick={onClose ?? onCancel}
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            aria-label="Fermer le modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Zone scrollable — prend la place restante */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Messages d'erreur globaux */}
          {userDataError && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded mb-6 flex items-start space-x-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{userDataError}</span>
            </div>
          )}

          {/* Message de succès */}
          {showSuccess && (
            <div className="bg-green-50 border-l-4 border-green-400 text-green-700 p-4 rounded mb-6 flex items-start space-x-2">
              <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">
                {user
                  ? "Données sauvegardées avec succès !"
                  : "Formulaire validé !"}
              </span>
            </div>
          )}

          {/* Indicateur pour utilisateurs non connectés */}
          {!user && type === "devis" && (
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4 rounded mb-6 flex items-start space-x-2">
              <svg
                className="h-5 w-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm">
                <p className="font-medium">Mode invité</p>
                <p>
                  Vous recevrez votre devis par email. Créez un compte pour
                  suivre vos demandes.
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {userDataLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-3 border-black border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">
                Chargement de vos informations...
              </span>
            </div>
          ) : (
            <form id="unified-user-form" onSubmit={handleSubmit} noValidate>
              <div className="space-y-6">
                {/* Date et heure - Conditionnel */}
                {shouldShowDateField && (
                  <div className="space-y-2">
                    <label
                      htmlFor="reservationDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Date et heure <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        size={18}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        aria-hidden="true"
                      />
                      <input
                        type="datetime-local"
                        id="reservationDate"
                        value={reservationDate || ""}
                        onChange={(e) => {
                          setReservationDate?.(e.target.value);
                          handleFieldChange(
                            "reservationDate",
                            e.target.value,
                            () => {}
                          );
                        }}
                        min={getMinDateTime()}
                        max={getMaxDateTime()}
                        className={`pl-10 block w-full p-3 border rounded-lg focus:ring-black focus:border-black bg-white transition-all ${
                          touchedFields.reservationDate &&
                          validationErrors.reservationDate
                            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300"
                        }`}
                        required={shouldShowDateField}
                        aria-describedby={
                          validationErrors.reservationDate
                            ? "reservationDate-error"
                            : undefined
                        }
                        disabled={disabled}
                      />
                    </div>
                    {touchedFields.reservationDate &&
                      validationErrors.reservationDate && (
                        <p
                          id="reservationDate-error"
                          className="text-sm text-red-600 flex items-center space-x-1"
                        >
                          <AlertCircle size={14} />
                          <span>{validationErrors.reservationDate}</span>
                        </p>
                      )}
                  </div>
                )}

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
                      aria-hidden="true"
                    />
                    <input
                      ref={firstInputRef}
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value, setName)
                      }
                      className={`pl-10 block w-full p-3 border rounded-lg focus:ring-black focus:border-black bg-white transition-all ${
                        touchedFields.name && validationErrors.name
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Votre nom et prénom"
                      required
                      aria-describedby={
                        validationErrors.name ? "name-error" : undefined
                      }
                      disabled={disabled}
                      autoComplete="name"
                    />
                  </div>
                  {touchedFields.name && validationErrors.name && (
                    <p
                      id="name-error"
                      className="text-sm text-red-600 flex items-center space-x-1"
                    >
                      <AlertCircle size={14} />
                      <span>{validationErrors.name}</span>
                    </p>
                  )}
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
                      aria-hidden="true"
                    />
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        handleFieldChange("phone", formatted, setPhone);
                      }}
                      className={`pl-10 block w-full p-3 border rounded-lg focus:ring-black focus:border-black bg-white transition-all ${
                        touchedFields.phone && validationErrors.phone
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="06 12 34 56 78"
                      required
                      aria-describedby={
                        validationErrors.phone ? "phone-error" : undefined
                      }
                      disabled={disabled}
                      autoComplete="tel"
                    />
                  </div>
                  {touchedFields.phone && validationErrors.phone && (
                    <p
                      id="phone-error"
                      className="text-sm text-red-600 flex items-center space-x-1"
                    >
                      <AlertCircle size={14} />
                      <span>{validationErrors.phone}</span>
                    </p>
                  )}
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
                      aria-hidden="true"
                    />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) =>
                        handleFieldChange(
                          "email",
                          e.target.value.toLowerCase(),
                          setEmail
                        )
                      }
                      className={`pl-10 block w-full p-3 border rounded-lg focus:ring-black focus:border-black bg-white transition-all ${
                        touchedFields.email && validationErrors.email
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="votre.email@exemple.com"
                      required
                      aria-describedby={
                        validationErrors.email ? "email-error" : undefined
                      }
                      disabled={disabled}
                      autoComplete="email"
                    />
                  </div>
                  {touchedFields.email && validationErrors.email && (
                    <p
                      id="email-error"
                      className="text-sm text-red-600 flex items-center space-x-1"
                    >
                      <AlertCircle size={14} />
                      <span>{validationErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Notes - Conditionnel */}
                {shouldShowNotesField && (
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
                        aria-hidden="true"
                      />
                      <textarea
                        id="notes"
                        value={notes || ""}
                        onChange={(e) => setNotes?.(e.target.value)}
                        className="pl-10 block w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black bg-white transition-all resize-none"
                        rows={3}
                        placeholder="Instructions pour le chauffeur..."
                        disabled={disabled}
                        maxLength={500}
                      />
                    </div>
                    {notes && (
                      <p className="text-xs text-gray-500 text-right">
                        {notes.length}/500 caractères
                      </p>
                    )}
                  </div>
                )}

                {/* Erreur de validation personnalisée */}
                {validationErrors.custom && (
                  <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded flex items-start space-x-2">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{validationErrors.custom}</span>
                  </div>
                )}

              </div>
            </form>
          )}
        </div>

        {/* Footer fixe — toujours visible (sauf en loading) */}
        {!userDataLoading && (
          <div className="px-6 pt-4 pb-6 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-xl">
            <p className="text-xs text-gray-500 mb-3">* Champs obligatoires</p>
            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 min-w-0 text-center disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Retour
              </button>
              <button
                ref={submitButtonRef}
                type="submit"
                form="unified-user-form"
                disabled={disabled || isSubmitting}
                className={`py-3 px-4 rounded-lg font-medium transition-colors flex-1 min-w-0 text-center flex items-center justify-center space-x-2 group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  customButtonClass ||
                  "bg-black text-white hover:bg-gray-800 focus:ring-black"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Traitement...</span>
                  </>
                ) : showSuccess ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Sauvegardé !</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">{config.submitButtonText}</span>
                    <ArrowRight
                      size={16}
                      className="transform group-hover:translate-x-1 transition-transform flex-shrink-0"
                    />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
