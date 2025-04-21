"use client";

import { ReservationProvider } from "@/contexts/ReservationContext";
import React from "react";

export function MapWrapper({ children }: { children: React.ReactNode }) {
  return <ReservationProvider>{children}</ReservationProvider>;
}
