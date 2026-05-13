"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";
import { type DriverProfile } from "@/lib/firebase/drivers";

function coerceDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

// Hook temps réel pour la fiche chauffeur. Reflète immédiatement les
// changements de statut (validation admin, toggle availability) sans reload.
export function useDriver(): {
  driver: DriverProfile | null;
  isDriver: boolean;
  loading: boolean;
  hasFiche: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDriver(null);
      setIsDriver(false);
      setDocLoading(false);
      return;
    }

    const unsubUser = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const role = snap.exists() ? (snap.data() as any).role : null;
        setIsDriver(role === "driver");
      },
      () => setIsDriver(false)
    );

    const unsubDriver = onSnapshot(
      doc(db, "drivers", user.uid),
      (snap) => {
        if (!snap.exists()) {
          setDriver(null);
          setDocLoading(false);
          return;
        }
        const data = snap.data();
        setDriver({
          uid: user.uid,
          email: data.email ?? user.email ?? "",
          status: data.status ?? "pending",
          availability: data.availability ?? "offline",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
          dateOfBirth: data.dateOfBirth ?? null,
          address: data.address ?? "",
          legalForm: data.legalForm ?? null,
          companyName: data.companyName ?? "",
          siret: data.siret ?? "",
          vatNumber: data.vatNumber ?? "",
          licenseNumber: data.licenseNumber ?? "",
          licenseDeliveryDate: data.licenseDeliveryDate ?? null,
          moto: {
            brand: data.moto?.brand ?? "",
            model: data.moto?.model ?? "",
            year: data.moto?.year ?? null,
            plate: data.moto?.plate ?? "",
            color: data.moto?.color ?? "",
          },
          bank: {
            iban: data.bank?.iban ?? "",
            bic: data.bank?.bic ?? "",
            accountHolder: data.bank?.accountHolder ?? "",
          },
          documents: data.documents
            ? Object.fromEntries(
                Object.entries(data.documents).map(([k, v]: [string, any]) => [
                  k,
                  v
                    ? {
                        url: v.url,
                        path: v.path,
                        filename: v.filename ?? "",
                        uploadedAt: coerceDate(v.uploadedAt) ?? new Date(),
                      }
                    : null,
                ])
              )
            : {},
          acceptedAt: coerceDate(data.acceptedAt),
          rejectedAt: coerceDate(data.rejectedAt),
          rejectionReason: data.rejectionReason ?? "",
          createdAt: coerceDate(data.createdAt),
          updatedAt: coerceDate(data.updatedAt),
          stats: {
            totalRides: data.stats?.totalRides ?? 0,
            totalEarningsCents: data.stats?.totalEarningsCents ?? 0,
          },
        });
        setDocLoading(false);
      },
      (err) => {
        console.error("[useDriver] snapshot error:", err);
        setDocLoading(false);
      }
    );

    return () => {
      unsubUser();
      unsubDriver();
    };
  }, [user, authLoading]);

  return {
    driver,
    isDriver,
    loading: authLoading || docLoading,
    hasFiche: driver !== null,
  };
}
