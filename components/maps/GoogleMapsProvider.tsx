"use client";

import { LoadScript } from "@react-google-maps/api";
import React from "react";

// Définir les bibliothèques à charger une seule fois
const libraries = ["places"];

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode,
}) {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      libraries={libraries}
      loadingElement={
        <div className="h-full w-full flex items-center justify-center">
          Chargement de Google Maps...
        </div>
      }
    >
      {children}
    </LoadScript>
  );
}
