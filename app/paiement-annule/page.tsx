"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useReservation } from "@/lib/hooks/useReservation";

export default function PaiementAnnule() {
  const router = useRouter();
  const { navigateToReservation } = useReservation();

  useEffect(() => {
    // Afficher un toast d'information
    toast.info("Le paiement a été annulé");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center">
        <div className="mb-6">
          <div className="bg-yellow-100 rounded-full p-3 mx-auto w-16 h-16 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Paiement annulé
        </h1>

        <p className="text-gray-600 mb-6">
          Votre processus de paiement a été interrompu ou annulé. Aucun montant
          n'a été débité de votre compte.
        </p>

        <div className="space-y-3">
          <a
            href="#reservation"
            onClick={navigateToReservation}
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition cursor-pointer"
          >
            Réessayer la réservation
          </a>
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
