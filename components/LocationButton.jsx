"use client";

import { Locate } from "lucide-react";
import { useState } from "react";

export default function LocationButton({
  onGetLocation,
  className = "px-4 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition",
}) {
  const [isLocating, setIsLocating] = useState(false);

  const handleGetLocation = () => {
    setIsLocating(true);
    
    // Check if geolocation is available
    if (navigator.geolocation) {
      // Options for high precision location
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      // Get current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success handler
          const { latitude, longitude } = position.coords;
          
          // Pass coordinates to parent component
          onGetLocation(latitude, longitude);
          
          // Reset loading state
          setIsLocating(false);
        },
        (error) => {
          // Error handler
          console.error("Geolocation error:", error.code, error.message);
          
          // Show appropriate error message based on error code
          let errorMessage = "Impossible d'obtenir votre position.";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "L'accès à votre position a été refusé. Veuillez vérifier les permissions de votre navigateur.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Votre position est actuellement indisponible.";
              break;
            case error.TIMEOUT:
              errorMessage = "La demande de géolocalisation a expiré.";
              break;
          }
          
          alert(errorMessage);
          setIsLocating(false);
        },
        options
      );
    } else {
      // Browser doesn't support geolocation
      alert("La géolocalisation n'est pas prise en charge par votre navigateur.");
      setIsLocating(false);
    }
  };

  return (
    <button
      onClick={handleGetLocation}
      className={`${className} ${isLocating ? 'bg-gray-300' : ''}`}
      title="Ma position actuelle"
      aria-label="Utiliser ma position actuelle"
      disabled={isLocating}
      type="button"
    >
      {isLocating ? (
        <div className="flex items-center justify-center h-5 w-5">
          <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <Locate size={20} className="text-gray-700" />
      )}
    </button>
  );
}