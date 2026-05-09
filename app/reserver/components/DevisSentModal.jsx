"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Mail, X } from "lucide-react";

export default function DevisSentModal({
  clientEmail,
  depart,
  arrivee,
  onClose,
}) {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        className={`bg-white rounded-xl w-full max-w-md md:max-w-lg mx-auto shadow-2xl transform transition-all duration-300 flex flex-col ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header — fixe */}
        <div className="relative p-5 sm:p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-3 pr-10">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Devis envoyé !
              </h3>
              <p className="text-sm text-gray-600 truncate">
                Consultez votre boîte email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-5 top-5 sm:right-6 sm:top-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu — scrollable si trop long */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-green-600" />
            </div>

            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Votre devis a été envoyé
            </h4>

            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              Un email contenant votre devis détaillé pour le trajet a été
              envoyé.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Trajet
              </div>
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="w-px h-4 bg-gray-300 my-0.5" />
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-sm text-gray-900 break-words">
                    {depart}
                  </div>
                  <div className="text-sm text-gray-900 break-words">
                    {arrivee}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Email
              </div>
              <div className="text-sm font-medium text-gray-900 break-all">
                {clientEmail}
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-left rounded-r">
              <p className="text-sm text-blue-700 font-semibold">
                Prochaines étapes :
              </p>
              <ul className="text-sm text-blue-600 mt-1 space-y-1">
                <li>• Consultez votre email pour voir le devis détaillé</li>
                <li>• Le devis est valable 30 jours</li>
                <li>• Contactez-nous pour toute question</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer — bouton fixe en bas */}
        <div className="p-5 sm:p-6 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Nouvelle recherche
          </button>
        </div>
      </div>
    </div>
  );
}
