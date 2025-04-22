"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useReservation } from "@/lib/hooks/useReservation";
import { Phone, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// Ajoute cette import

const Header = () => {
  const { user, logOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resetForm } = useReservation(); // Récupère la fonction resetForm

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fonction qui réinitialise l'état avant la navigation
  const handleNavigation = () => {
    resetForm(); // Réinitialise le formulaire de réservation
    if (isMenuOpen) {
      toggleMenu(); // Ferme le menu si ouvert
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
              className="object-contain"
            />
          </Link>

          {/* Navigation principale */}
          <nav className="hidden md:block">
            <ul className="flex justify-center space-x-10">
              <li>
                <Link
                  href="/reserver"
                  className="text-white text-sm tracking-wider  relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  RÉSERVER UN TRAJET
                </Link>
              </li>
              <li>
                <Link
                  href="/nos-tarifs"
                  className="text-white text-sm tracking-wider  relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  NOS TARIFS
                </Link>
              </li>
              <li>
                <Link
                  href="/aeroports"
                  className="text-white text-sm tracking-wider  relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  AÉROPORTS PARIS
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-white text-sm tracking-wider  relative py-2 inline-block transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-white hover:after:w-full after:transition-all after:duration-300"
                  onClick={handleNavigation}
                >
                  À PROPOS DE IZYMOTO
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact et authentification desktop */}
          <div className="hidden md:flex items-center space-x-6 text-white">
            <div className="flex items-center space-x-2 group">
              <Phone className="h-4 w-4 group- transition-colors duration-300" />
              <span className="text-sm group- transition-colors duration-300">
                (+33) 6 52 75 35 21
              </span>
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profil"
                  className="text-sm font-medium  transition-colors duration-300"
                  onClick={handleNavigation}
                >
                  Mon Profil
                </Link>
                <button
                  onClick={() => logOut()}
                  className="text-sm font-medium  transition-colors duration-300"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link
                href="/connexion"
                className="inline-block px-4 py-2 border border-white/40 text-white text-sm hover:bg-white hover:text-black transition-all duration-300 tracking-wider font-light"
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
              className="text-white text-2xl uppercase tracking-widest  transition-colors duration-300"
              onClick={toggleMenu}
            >
              Accueil
            </Link>
            <Link
              href="/reserver"
              className="text-white text-2xl uppercase tracking-widest  transition-colors duration-300"
              onClick={toggleMenu}
            >
              Réserver un trajet
            </Link>
            <Link
              href="/nos-tarifs"
              className="text-white text-2xl uppercase tracking-widest  transition-colors duration-300"
              onClick={toggleMenu}
            >
              Nos tarifs
            </Link>
            <Link
              href="/aeroports"
              className="text-white text-2xl uppercase tracking-widest  transition-colors duration-300"
              onClick={toggleMenu}
            >
              Aéroports Paris
            </Link>
            <Link
              href="/about"
              className="text-white text-2xl uppercase tracking-widest  transition-colors duration-300"
              onClick={toggleMenu}
            >
              À propos
            </Link>
            <div className="pt-8 flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2 text-white">
                <Phone className="h-5 w-5" />
                <span>(+33) 6 52 75 35 21</span>
              </div>

              {user ? (
                <div className="flex flex-col space-y-4">
                  <Link
                    href="/profil"
                    className="inline-block px-6 py-2 border border-white/40 text-white hover:bg-white hover:text-black transition-all duration-300 tracking-wider"
                    onClick={toggleMenu}
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
                  onClick={toggleMenu}
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
