"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useReservation } from "@/lib/hooks/useReservation";
import { Phone, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import HeaderWalletBadge from "@/components/wallet/HeaderWalletBadge";

const Header = () => {
  const { user, logOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resetForm } = useReservation();
  const router = useRouter();

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
      <div className="bg-black backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 transition-transform duration-300 hover:scale-105"
            onClick={handleNavigation}
          >
            <Image
              src="/Izymoto1.svg"
              alt="Izymoto"
              width={120}
              height={40}
              className="object-contain h-10 w-auto"
              priority
            />
          </Link>

          {/* Navigation principale */}
          <nav className="hidden md:block">
            <ul className="flex justify-center space-x-10">
              <li>
                <a
                  href="#reservation"
                  className="text-white text-sm tracking-wider relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300 cursor-pointer"
                  onClick={handleReservationClick}
                >
                  RÉSERVER UN TRAJET
                </a>
              </li>
              <li>
                <Link
                  href="/nos-tarifs"
                  className="text-white text-sm tracking-wider relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  NOS TARIFS
                </Link>
              </li>
              <li>
                <Link
                  href="/portefeuille"
                  className="text-white text-sm tracking-wider relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  PORTEFEUILLE
                </Link>
              </li>
              <li>
                <Link
                  href="/aeroports"
                  className="text-white text-sm tracking-wider relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  AÉROPORTS PARIS
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-white text-sm tracking-wider relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  À PROPOS DE IZYMOTO
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact et authentification desktop */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6 text-white">
            <HeaderWalletBadge />
            <div className="hidden lg:flex items-center space-x-2 group">
              <Phone className="h-4 w-4 group-hover:text-gold-400 transition-colors duration-300" />
              <span className="text-sm group-hover:text-gold-400 transition-colors duration-300">
                (+33) 6 49 50 25 25
              </span>
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profil"
                  className="text-sm font-medium hover:text-gold-400 transition-colors duration-300"
                  onClick={handleNavigation}
                >
                  Mon Profil
                </Link>
                <button
                  onClick={() => logOut()}
                  className="text-sm font-medium hover:text-gold-400 transition-colors duration-300"
                >
                  Déconnexion
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
        className={`fixed inset-0 bg-black/95 z-40 transform transition-transform duration-500 ease-in-out ${
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
              Portefeuille
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
