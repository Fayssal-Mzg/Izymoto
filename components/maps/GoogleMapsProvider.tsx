"use client";

import { ReservationProvider } from "@/contexts/ReservationContext";
import { LoadScript } from "@react-google-maps/api";
import React, { useEffect } from "react";

// Liste des bibliothèques Google Maps à charger
const libraries = ["places"];

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Masque le texte par défaut "chargement de Google Maps" si Google l'injecte.
  // Le loader d'entrée (moto qui défile) est géré globalement par SiteLoader.
  useEffect(() => {
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

    hideLoadingText();
    const observer = new MutationObserver(hideLoadingText);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      libraries={libraries as any}
      loadingElement={<div style={{ display: "none" }}></div>}
    >
      <ReservationProvider>{children}</ReservationProvider>
    </LoadScript>
  );
}

// Composant MapWrapper simple pour compatibilité avec le code existant
// Il ne fait rien de spécial maintenant puisque toute la logique est dans GoogleMapsProvider
export function MapWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
