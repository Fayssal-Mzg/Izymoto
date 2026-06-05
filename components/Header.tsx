"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useReservation } from "@/lib/hooks/useReservation";
import { Phone, Menu, X, User, LogOut, Bike } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import HeaderWalletBadge from "@/components/wallet/HeaderWalletBadge";

// Pill de navigation : cadre + léger fond + glow mint au survol, sur une ligne
const navPillClass =
  "inline-block whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-mint-400/70 hover:bg-mint-400/10 hover:text-mint-300 hover:shadow-[0_0_18px_-4px_rgba(45,212,191,0.55)]";

const Header = () => {
  const { user, logOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resetForm } = useReservation();
  const router = useRouter();
  const pathname = usePathname();

  // Sur /admin et /chauffeur, le layout dédié fournit sa propre nav — on
  // masque le Header global pour éviter le doublon.
  if (pathname?.startsWith("/admin")) return null;
  if (pathname?.startsWith("/chauffeur")) return null;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fonction qui réinitialise l'état avant la navigation
  const handleNavigation = () => {
    resetForm();
    if (isMenuOpen) {
      toggleMenu();
    }
  };

  // Fonction pour gérer le scroll vers la section réservation
  const handleReservationClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Fermer le menu mobile si ouvert
    if (isMenuOpen) {
      toggleMenu();
    }

    // Réinitialiser le formulaire
    resetForm();

    // Vérifier si on est déjà sur la page d'accueil
    const currentPath = window.location.pathname;

    if (currentPath === "/") {
      // Si on est déjà sur la page d'accueil, scroller directement
      scrollToReservation();
    } else {
      // Si on est sur une autre page, naviguer d'abord vers l'accueil
      router.push("/");
      // Attendre que la navigation soit terminée puis scroller
      setTimeout(() => {
        scrollToReservation();
      }, 100);
    }
  };

  // Fonction pour scroller vers la section réservation
  const scrollToReservation = () => {
    const reservationSection = document.getElementById("reservation");
    if (reservationSection) {
      reservationSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <header className="w-full z-50 bg-transparent">
      {/* Barre supérieure combinée */}
      <div className="bg-navy-950 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-2.5 md:py-3 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 -ml-3 md:-ml-6 transition-transform duration-300 hover:scale-105"
            onClick={handleNavigation}
            aria-label="Izymoto — accueil"
          >
            <Image
              src="/izymoto-logo-v6.png"
              alt="Izymoto — Taxi moto Paris & moto-taxi premium"
              width={640}
              height={200}
              className="object-contain h-16 md:h-[68px] w-auto"
              priority
            />
          </Link>

          {/* Navigation principale — pills encadrés, accent mint au survol */}
          <nav className="hidden md:block">
            <ul className="flex items-center justify-center gap-2 lg:gap-3">
              <li>
                <a
                  href="#reservation"
                  className={navPillClass}
                  onClick={handleReservationClick}
                >
                  Réserver
                </a>
              </li>
              <li>
                <Link href="/nos-tarifs" className={navPillClass} onClick={handleNavigation}>
                  Nos tarifs
                </Link>
              </li>
              <li>
                <Link href="/portefeuille" className={navPillClass} onClick={handleNavigation}>
                  Forfaits
                </Link>
              </li>
              <li>
                <Link href="/aeroports" className={navPillClass} onClick={handleNavigation}>
                  Aéroports
                </Link>
              </li>
              <li>
                <Link href="/about" className={navPillClass} onClick={handleNavigation}>
                  À propos
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact et authentification desktop */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 text-white">
            <HeaderWalletBadge />
            <Link
              href="/chauffeur/inscription"
              onClick={handleNavigation}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs tracking-wider text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-md transition-colors"
              title="Espace chauffeur"
            >
              <Bike className="h-3.5 w-3.5" />
              Espace chauffeur
            </Link>
            <a
              href="tel:+33649502525"
              title="Nous appeler : (+33) 6 49 50 25 25"
              aria-label="Nous appeler au (+33) 6 49 50 25 25"
              className="p-2 rounded-full hover:bg-white/10 hover:text-gold-400 transition-colors duration-300"
            >
              <Phone className="h-5 w-5" />
            </a>

            {user ? (
              <div className="flex items-center gap-1">
                <Link
                  href="/profil"
                  title="Mon profil"
                  aria-label="Mon profil"
                  className="p-2 rounded-full hover:bg-white/10 hover:text-gold-400 transition-colors duration-300"
                  onClick={handleNavigation}
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => logOut()}
                  title="Déconnexion"
                  aria-label="Déconnexion"
                  className="p-2 rounded-full hover:bg-white/10 hover:text-gold-400 transition-colors duration-300"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/connexion"
                className="inline-block px-4 py-2 border border-white/40 text-white text-sm hover:bg-white hover:text-black transition-all duration-300 tracking-wider font-light"
                onClick={handleNavigation}
              >
                Connexion
              </Link>
            )}
          </div>

          {/* Menu burger mobile */}
          <button
            className="md:hidden z-50 relative"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        className={`fixed inset-0 bg-navy-950/95 z-40 transform transition-transform duration-500 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col justify-center items-center">
          <nav className="flex flex-col space-y-8 text-center">
            <Link
              href="/"
              className="text-white text-2xl uppercase tracking-widest hover:text-gold-400 transition-colors duration-300"
              onClick={handleNavigation}
            >
              Accueil
            </Link>
            <a
              href="#reservation"
              className="text-white text-2xl uppercase tracking-widest hover:text-gold-400 transition-colors duration-300 cursor-pointer"
              onClick={handleReservationClick}
            >
              Réserver un trajet
            </a>
            <Link
              href="/nos-tarifs"
              className="text-white text-2xl uppercase tracking-widest hover:text-gold-400 transition-colors duration-300"
              onClick={handleNavigation}
            >
              Nos tarifs
            </Link>
            <Link
              href="/portefeuille"
              className="text-white text-2xl uppercase tracking-widest hover:text-gold-400 transition-colors duration-300"
              onClick={handleNavigation}
            >
              Forfaits
            </Link>
            <Link
              href="/aeroports"
              className="text-white text-2xl uppercase tracking-widest hover:text-gold-400 transition-colors duration-300"
              onClick={handleNavigation}
            >
              Aéroports Paris
            </Link>
            <Link
              href="/about"
              className="text-white text-2xl uppercase tracking-widest hover:text-gold-400 transition-colors duration-300"
              onClick={handleNavigation}
            >
              À propos
            </Link>

            <Link
              href="/chauffeur/inscription"
              onClick={handleNavigation}
              className="inline-flex items-center justify-center gap-2 text-amber-400 text-base uppercase tracking-widest border border-amber-400/40 hover:bg-amber-400 hover:text-black transition-all duration-300 px-6 py-2.5 rounded-md mt-4"
            >
              <Bike className="h-4 w-4" />
              Espace chauffeur
            </Link>

            <div className="pt-8 flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2 text-white">
                <Phone className="h-5 w-5" />
                <span>(+33) 6 49 50 25 25</span>
              </div>

              {user ? (
                <div className="flex flex-col space-y-4">
                  <Link
                    href="/profil"
                    className="inline-block px-6 py-2 border border-white/40 text-white hover:bg-white hover:text-black transition-all duration-300 tracking-wider"
                    onClick={handleNavigation}
                  >
                    MON PROFIL
                  </Link>
                  <button
                    onClick={() => {
                      logOut();
                      toggleMenu();
                    }}
                    className="inline-block px-6 py-2 border border-white/40 text-white hover:bg-white hover:text-black transition-all duration-300 tracking-wider"
                  >
                    DÉCONNEXION
                  </button>
                </div>
              ) : (
                <Link
                  href="/connexion"
                  className="inline-block px-6 py-2 border border-white/40 text-white hover:bg-white hover:text-black transition-all duration-300 tracking-wider"
                  onClick={handleNavigation}
                >
                  CONNEXION
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
