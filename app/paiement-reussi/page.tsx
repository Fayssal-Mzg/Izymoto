// app/paiement-reussi/page.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";

export default function PaiementReussi() {
  const router = useRouter();

  useEffect(() => {
    // Afficher un toast de succès
    toast.success("Paiement confirmé! Merci pour votre réservation.");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
        <div className="mb-6">
          <div className="bg-green-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Paiement réussi !
        </h1>

        <p className="text-gray-600 mb-6">
          Votre réservation a été confirmée. Vous allez recevoir un email de
          confirmation dans quelques instants.
        </p>

        <div className="space-y-3">
          <Link
            href="/profil"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
          >
            Voir mes réservations
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
