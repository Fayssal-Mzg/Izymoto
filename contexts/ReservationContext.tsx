// contexts/ReservationContext.tsx
"use client";

import { useReservation } from "@/lib/hooks/useReservation";
import React, { createContext, useContext, ReactNode } from "react";

// Créer un type pour toutes les valeurs retournées par useReservation
type ReservationContextType = ReturnType<typeof useReservation>;

// Créer le contexte
const ReservationContext = createContext<ReservationContextType | undefined>(
  undefined
);

// Provider qui wrap notre composant
export function ReservationProvider({ children }: { children: ReactNode }) {
  const reservationValues = useReservation();

  return (
    <ReservationContext.Provider value={reservationValues}>
      {children}
    </ReservationContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useReservationContext() {
  const context = useContext(ReservationContext);

  if (context === undefined) {
    throw new Error(
      "useReservationContext doit être utilisé à l'intérieur d'un ReservationProvider"
    );
  }

  return context;
}
