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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl transform transition-all duration-300 ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Devis envoyé !
              </h3>
              <p className="text-sm text-gray-600">
                Consultez votre boîte email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-green-600" />
            </div>

            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Votre devis a été envoyé
            </h4>

            <p className="text-gray-600 mb-4">
              Un email contenant votre devis détaillé pour le trajet <br />
              <strong>{depart}</strong> → <strong>{arrivee}</strong> <br />a été
              envoyé à :
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-gray-900">{clientEmail}</p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Prochaines étapes :</strong>
                  </p>
                  <ul className="text-sm text-blue-600 mt-1 space-y-1">
                    <li>• Consultez votre email pour voir le devis détaillé</li>
                    <li>• Le devis est valable 30 jours</li>
                    <li>• Contactez-nous pour toute question</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Nouvelle recherche
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
