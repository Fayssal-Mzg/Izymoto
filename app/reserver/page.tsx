"use client";

import ReservationProcess from "@/components/reservation/ReservationProcess";
import { ReservationProvider } from "@/contexts/ReservationContext";
import Head from "next/head";
import { useEffect, useState } from "react";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import { ActivitySquare } from "lucide-react";

export default function ReservationPage() {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Optimisation SEO et performance
  useEffect(() => {
    // Indiquer que la page est chargée pour les animations
    setPageLoaded(true);
    
    // Précharger les scripts Google Maps pour améliorer les performances
    const preconnectGoogle = document.createElement("link");
    preconnectGoogle.rel = "preconnect";
    preconnectGoogle.href = "https://maps.googleapis.com";
    document.head.appendChild(preconnectGoogle);

    const preconnectGstatic = document.createElement("link");
    preconnectGstatic.rel = "preconnect";
    preconnectGstatic.href = "https://maps.gstatic.com";
    document.head.appendChild(preconnectGstatic);

    // Nettoyage
    return () => {
      document.head.removeChild(preconnectGoogle);
      document.head.removeChild(preconnectGstatic);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Réservez votre trajet en moto-taxi | IZYMOTO</title>
        <meta 
          name="description" 
          content="Réservez votre trajet en moto-taxi à Paris. Service rapide et professionnel. Tarifs transparents et sécurité assurée." 
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
      </Head>
      
      <div className={`fade-in ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <ReservationProvider>
          <ReservationProcess 
            isStandalone={true} 
            customContainerClass="transition-all duration-500"
          />
        </ReservationProvider>
      </div>
      
      {/* Performance Monitor Integration */}
      {showPerformanceMonitor && <PerformanceMonitor />}
      
      {/* Performance Monitor Button - Only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          className="fixed bottom-20 right-4 z-50 bg-black text-white p-2.5 rounded-full shadow-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          title={showPerformanceMonitor ? "Masquer le moniteur" : "Afficher le moniteur de performance"}
          aria-label="Toggle Performance Monitor"
        >
          <ActivitySquare size={20} />
        </button>
      )}
    </>
  );
}