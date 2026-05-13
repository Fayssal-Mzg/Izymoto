"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import {
  hasRequiredDocs,
  missingDocs,
  DOC_LABELS,
  type DriverProfile,
} from "@/lib/firebase/drivers";

// Bandeau de statut KYC : visible en haut de chaque page chauffeur,
// rappelle où en est l'utilisateur dans le parcours de validation.
export default function DriverStatusBanner({
  driver,
}: {
  driver: DriverProfile;
}) {
  if (driver.status === "active") return null;

  if (driver.status === "rejected") {
    return (
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">
              Candidature refusée
            </p>
            {driver.rejectionReason && (
              <p className="text-sm text-red-700 mt-1">
                Motif : {driver.rejectionReason}
              </p>
            )}
            <p className="text-xs text-red-700 mt-2">
              Contactez contact@izymoto.com pour plus d'informations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (driver.status === "suspended") {
    return (
      <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-900">
              Compte suspendu
            </p>
            {driver.rejectionReason && (
              <p className="text-sm text-orange-700 mt-1">
                Motif : {driver.rejectionReason}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // status === pending
  const docsComplete = hasRequiredDocs(driver);
  const missing = missingDocs(driver);
  const profileComplete =
    driver.firstName && driver.lastName && driver.phone && driver.moto.plate;

  if (!profileComplete || !docsComplete) {
    return (
      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Complétez votre dossier
            </p>
            <p className="text-sm text-amber-800 mt-1">
              {!profileComplete
                ? "Renseignez d'abord vos informations personnelles et celles de votre moto."
                : `Documents manquants : ${missing
                    .map((k) => DOC_LABELS[k])
                    .join(", ")}.`}
            </p>
            <Link
              href="/chauffeur/profil"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-900 hover:underline"
            >
              Compléter mon profil
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">
            Dossier en cours de validation
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Notre équipe vérifie vos documents. Vous recevrez un email dès que
            votre compte sera activé (24-48h ouvrées).
          </p>
        </div>
      </div>
    </div>
  );
}
