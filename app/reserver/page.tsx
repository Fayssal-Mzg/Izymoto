// app/reserver/page.jsx
"use client";

import ReservationProcess from "@/components/reservation/ReservationProcess";
import { ReservationProvider } from "@/contexts/ReservationContext";

export default function ReservationPage() {
  return (
    <ReservationProvider>
      <ReservationProcess isStandalone={true} />
    </ReservationProvider>
  );
}
