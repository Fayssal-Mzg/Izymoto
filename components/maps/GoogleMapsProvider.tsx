"use client";

import { ReservationProvider } from "@/contexts/ReservationContext";
import { LoadScript } from "@react-google-maps/api";
import React, { useState, useEffect } from "react";

// Composant SkeletonLoader intégré
const SkeletonLoader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="text-center">
        <img
          src="/Izymoto1.svg"
          alt="IZYMOTO"
          className="mx-auto mb-6"
          width="64"
          height="64"
          style={{ width: "64px", height: "64px" }}
        />

        <div className="flex space-x-3 justify-center">
          <div className="w-3 h-3 bg-gold-500 rounded-full animate-pulse"></div>
          <div
            className="w-3 h-3 bg-gold-500 rounded-full animate-pulse"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-3 h-3 bg-gold-500 rounded-full animate-pulse"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>

        <p className="mt-4 text-sm text-slate-600 font-medium">
          Préparation de votre expérience...
        </p>
      </div>
    </div>
  );
};

// Liste des bibliothèques Google Maps à charger
const libraries = ["places"];

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // État pour contrôler l'affichage du skeleton loader
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Effet pour masquer le message de chargement Google Maps
  useEffect(() => {
    // Fonction pour masquer le texte "chargement de Google Maps"
    const hideLoadingText = () => {
      document.querySelectorAll("*").forEach((el) => {
        if (
          el.textContent &&
          el.textContent.includes("Google Maps") &&
          el.textContent.includes("chargement")
        ) {
          if (el instanceof HTMLElement) {
            el.style.display = "none";
          }
        }
      });
    };

    // Exécuter immédiatement
    hideLoadingText();

    // Observer les changements DOM pour continuer à masquer
    const observer = new MutationObserver(() => {
      hideLoadingText();
    });

    // Observer tout le body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Afficher le skeleton pendant un temps minimum
    const timer = setTimeout(() => {
      setShowSkeleton(false);
      observer.disconnect();
    }, 1500);

    // Nettoyage
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Composant LoadScript avec skeleton loader personnalisé
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      libraries={libraries as any}
      loadingElement={
        // Élément de chargement caché (ne sera jamais visible)
        <div style={{ display: "none" }}></div>
      }
    >
      {/* Afficher soit le skeleton, soit les enfants avec ReservationProvider */}
      {showSkeleton ? (
        <SkeletonLoader />
      ) : (
        <ReservationProvider>{children}</ReservationProvider>
      )}
    </LoadScript>
  );
}

// Composant MapWrapper simple pour compatibilité avec le code existant
// Il ne fait rien de spécial maintenant puisque toute la logique est dans GoogleMapsProvider
export function MapWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
