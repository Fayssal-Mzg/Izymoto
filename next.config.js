"use client";

import ReservationProcess from "@/components/reservation/ReservationProcess";
import { ReservationProvider } from "@/contexts/ReservationContext";
import Head from "next/head";
import { useEffect, useState } from "react";
import { ActivitySquare, Sparkles } from "lucide-react";

export default function ReservationPage() {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Optimisation et préchargement
  useEffect(() => {
    setPageLoaded(true);
    
    // Préchargement intelligent des ressources critiques
    const preloadResources = () => {
      const resources = [
        { rel: 'preconnect', href: 'https://maps.googleapis.com' },
        { rel: 'preconnect', href: 'https://maps.gstatic.com' },
        { rel: 'preload', href: '/fonts/primary-font.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }
      ];

      resources.forEach(resource => {
        const link = document.createElement('link');
        Object.entries(resource).forEach(([key, value]) => {
          link.setAttribute(key, value);
        });
        document.head.appendChild(link);
      });
    };

    preloadResources();

    return () => {
      // Nettoyage des ressources préchargées si nécessaire
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 selection:bg-black selection:text-white">
      <Head>
        <title>Réservez votre trajet | IZYMOTO</title>
        <meta 
          name="description" 
          content="Réservation de moto-taxi à Paris. Élégance, rapidité et professionnalisme." 
        />
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" 
        />
        <meta name="theme-color" content="#000000" />
      </Head>
      
      {/* Conteneur principal avec animation subtle */}
      <div 
        className={`
          relative 
          min-h-screen 
          overflow-hidden 
          transition-all 
          duration-700 
          ease-in-out
          ${pageLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* Header élégant */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm py-4 px-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles 
                className="text-white/80 animate-pulse" 
                size={24} 
              />
              <h1 className="text-white font-medium text-lg tracking-tight">
                IZYMOTO
              </h1>
            </div>
            <nav className="hidden md:block">
              <ul className="flex space-x-4 text-white/80 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Accueil</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </nav>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="relative z-10">
          <ReservationProvider>
            <ReservationProcess 
              isStandalone={true} 
              customContainerClass="
                px-0 
                md:px-4 
                transition-all 
                duration-500 
                ease-in-out
              "
            />
          </ReservationProvider>
        </main>

        {/* Footer minimaliste */}
        <footer className="bg-black text-white/80 py-6 px-4 mt-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm">
              © {new Date().getFullYear()} IZYMOTO. Tous droits réservés.
            </div>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white transition-colors">
                Mentions légales
              </a>
              <a href="#" className="hover:text-white transition-colors">
                CGV
              </a>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Performance Monitor - Développement uniquement */}
      {showPerformanceMonitor && <PerformanceMonitor />}
      
      {/* Bouton Moniteur de Performance */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          className="
            fixed 
            bottom-20 
            right-4 
            z-50 
            bg-black 
            text-white 
            p-3 
            rounded-full 
            shadow-xl 
            hover:bg-neutral-800 
            transition-all 
            duration-300 
            transform 
            hover:scale-105 
            focus:outline-none 
            focus:ring-2 
            focus:ring-white/30
          "
          title={showPerformanceMonitor ? "Masquer le moniteur" : "Afficher le moniteur de performance"}
          aria-label="Toggle Performance Monitor"
        >
          <ActivitySquare size={20} />
        </button>
      )}
    </div>
  );
}