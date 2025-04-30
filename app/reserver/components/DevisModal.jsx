"use client";

import DateTimeInput from "./DateTimeInput";
import { useState, useEffect } from "react";
import { formatDistance, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Calendar, Clock, AlertCircle, Navigation, Euro, ArrowRight, X } from "lucide-react";

export default function DevisModal({
  depart,
  arrivee,
  distance,
  duree,
  prix,
  prioriteReservation,
  setPrioriteReservation,
  reservationDate,
  setReservationDate,
  onCancel,
  onProceed,
  onRequestDevis,
  setPrixFinal, // Added missing prop
}) {
  // État pour gérer les erreurs de validation
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  
  // Console log pour déboguer
  useEffect(() => {
    console.log("DevisModal - Props disponibles:", { 
      onCancel: !!onCancel, 
      onProceed: !!onProceed, 
      onRequestDevis: !!onRequestDevis 
    });
  }, [onCancel, onProceed, onRequestDevis]);

  // Animation d'entrée
  useEffect(() => {
    setAnimateIn(true);
  }, []);

  // Calculer le prix final en fonction des options
  useEffect(() => {
    // Calculate the final price based on prioriteReservation
    const calculatedFinalPrice = prix ? Math.round(prix + (prioriteReservation ? 20 : 0)) : 0;
    
    // Update the final price using the setPrixFinal prop
    if (typeof setPrixFinal === 'function') {
      setPrixFinal(calculatedFinalPrice);
    }
  }, [prix, prioriteReservation, setPrixFinal]);

  // Validation avant de passer à onRequestDevis
  const validateAndRequestDevis = () => {
    console.log("validateAndRequestDevis appelé");
    if (!reservationDate) {
      setValidationError("Veuillez sélectionner une date et heure pour votre course");
      return;
    }

    // Vérification de la date
    const selectedDate = new Date(reservationDate);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);

    // Vérification de la réservation dans l'heure
    const diffInHours = (selectedDate - now) / (1000 * 60 * 60);
    if (diffInHours < 1 && !prioriteReservation) {
      setValidationError("Pour une réservation dans l'heure, l'option priorité est obligatoire");
      return;
    }

    // Réinitialiser l'erreur si tout est correct
    setValidationError("");
    setIsLoading(true);

    try {
      // Simulation d'un temps de chargement avec un effet visuel
      setTimeout(() => {
        setIsLoading(false);
        if (typeof onRequestDevis === 'function') {
          console.log("Appel de onRequestDevis");
          onRequestDevis();
        } else {
          console.error("onRequestDevis n'est pas une fonction");
        }
      }, 800);
    } catch (error) {
      console.error("Erreur lors de l'appel à onRequestDevis:", error);
      setIsLoading(false);
      setValidationError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  // Fonction de validation pour le bouton Réserver
  const handleProceed = () => {
    console.log("handleProceed appelé");
    if (!reservationDate) {
      setValidationError("Veuillez sélectionner une date et heure pour votre course");
      return;
    }

    const selectedDate = new Date(reservationDate);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);

    // Vérification de la réservation dans l'heure
    const diffInHours = (selectedDate - now) / (1000 * 60 * 60);
    if (diffInHours < 1 && !prioriteReservation) {
      setValidationError("Pour une réservation dans l'heure, l'option priorité est obligatoire");
      return;
    }

    // Réinitialiser l'erreur si tout est correct
    setValidationError("");
    setIsLoading(true);

    try {
      // Simulation d'un temps de chargement avec un effet visuel
      setTimeout(() => {
        setIsLoading(false);
        if (typeof onProceed === 'function') {
          console.log("Appel de onProceed");
          onProceed();
        } else {
          console.error("onProceed n'est pas une fonction");
        }
      }, 800);
    } catch (error) {
      console.error("Erreur lors de l'appel à onProceed:", error);
      setIsLoading(false);
      setValidationError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  // Formatage de la durée pour affichage
  const formattedDuration = () => {
    if (!duree) return "0 min";
    
    if (duree < 60) {
      return `${duree} min`;
    } else {
      const hours = Math.floor(duree / 60);
      const minutes = duree % 60;
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
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
          <h3 className="text-xl font-bold text-gray-900">Détails de votre trajet</h3>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteneur scrollable */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 78px)' }}>
          {/* Trajet avec icônes */}
          <div className="mb-6 relative">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <MapPin size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Départ</p>
                <p className="text-gray-600 text-sm">{depart}</p>
              </div>
            </div>
            
            {/* Ligne verticale reliant les points */}
            <div className="absolute left-4 top-8 w-0.5 h-10 bg-gray-200"></div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Navigation size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Arrivée</p>
                <p className="text-gray-600 text-sm">{arrivee}</p>
              </div>
            </div>
          </div>

          {/* Détails de distance et durée */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Clock size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Durée</span>
              </div>
              <p className="text-gray-900 font-medium">{formattedDuration()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Navigation size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Distance</span>
              </div>
              <p className="text-gray-900 font-medium">{distance ? Math.round(distance * 10) / 10 : 0} km</p>
            </div>
          </div>

          {/* Composant de gestion de date et heure */}
          <div className="mb-6">
            {typeof DateTimeInput === 'function' ? (
              <DateTimeInput
                reservationDate={reservationDate}
                setReservationDate={setReservationDate}
                prioriteReservation={prioriteReservation}
                setPrioriteReservation={setPrioriteReservation}
              />
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-700">
                  Le composant DateTimeInput n'est pas disponible.
                </p>
              </div>
            )}
          </div>

          {/* Affichage des erreurs de validation */}
          {validationError && (
            <div
              className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded mb-6 flex items-start space-x-2"
              role="alert"
            >
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{validationError}</span>
            </div>
          )}

          {/* Section Option Priorité */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 transition-colors hover:bg-gray-100">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="priority"
                checked={prioriteReservation}
                onChange={() => setPrioriteReservation(!prioriteReservation)}
                className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <div>
                <label
                  htmlFor="priority"
                  className="font-medium block mb-1 text-gray-900"
                >
                  Option priorité (+20€)
                </label>
                <p className="text-gray-600 text-sm">
                  Service prioritaire : votre course sera traitée en priorité,
                  garantissant l'arrivée d'un chauffeur dans les meilleurs
                  délais.
                </p>
              </div>
            </div>
          </div>

          {/* Récapitulatif des prix */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm">Prix de base</span>
                <span className="text-gray-900">{prix ? Math.round(prix) : 0}€</span>
              </div>
              
              {prioriteReservation && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 text-sm">Option priorité</span>
                  <span className="text-gray-900">+20€</span>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold">{prix ? Math.round(prix + (prioriteReservation ? 20 : 0)) : 0}€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                TVA incluse. Paiement sécurisé en ligne.
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleProceed}
              disabled={isLoading}
              className={`py-3 px-4 bg-black text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                isLoading ? 'opacity-80' : 'hover:bg-gray-800'
              }`}
              type="button"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <span>Réserver maintenant</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            
            {onRequestDevis && (
              <button
                onClick={validateAndRequestDevis}
                disabled={isLoading}
                className={`py-3 px-4 border border-gray-300 bg-white text-gray-800 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  isLoading ? 'opacity-80' : 'hover:bg-gray-50'
                }`}
                type="button"
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                ) : (
                  <span>Demander un devis</span>
                )}
              </button>
            )}
            
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="py-2 px-4 text-gray-500 font-medium hover:text-gray-700 transition-colors text-sm"
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}