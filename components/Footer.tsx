"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, MapPin } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="bg-black text-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo and intro */}
          <div className="md:col-span-1">
            <img
              src="/Izymoto1.svg"
              alt="Logo IZYMOTO"
              className="h-10 mb-4"
              loading="lazy"
            />
            <p className="text-gray-400 mb-4 text-sm">
              Service de transport premium à Paris et en Île-de-France. Navettes
              aéroports, trajets professionnels et sorties.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-bold mb-4">Liens rapides</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-y-3 gap-x-4">
              <li>
                <Link
                  href="#reservation"
                  scroll={false}
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Réserver
                </Link>
              </li>
              <li>
                <Link
                  href="#tarifs"
                  scroll={false}
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Nos tarifs
                </Link>
              </li>
              <li>
                <Link
                  href="/portefeuille"
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Portefeuille
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  scroll={false}
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="#about"
                  scroll={false}
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  À propos
                </Link>
              </li>
              <li>
                <Link
                  href="#contact"
                  scroll={false}
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Phone className="h-5 w-5 text-white mt-0.5 mr-3 flex-shrink-0" />
                <a
                  href="tel:+33649502525"
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  +33 6 49 50 25 25
                </a>
              </li>
              <li className="flex items-start">
                <svg
                  className="h-5 w-5 text-white mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href="mailto:contact@izymoto.com"
                  className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  contact@izymoto.com
                </a>
              </li>
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-white mt-0.5 mr-3 flex-shrink-0" />
                <span className="text-gray-400 text-sm">
                  25 Rue de Ponthieu, Paris 8eme
                </span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-1">
            <h3 className="text-lg font-bold mb-4">Newsletter</h3>
            <p className="text-gray-400 mb-4 text-sm">
              Inscrivez-vous pour recevoir nos offres spéciales
            </p>
            <form
              className="flex flex-col space-y-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Votre email"
                className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors duration-300 text-white"
                aria-label="Votre adresse email"
                required
              />
              <button
                type="submit"
                className="bg-white text-black font-medium rounded-lg px-4 py-2 hover:bg-gray-100 transition-colors duration-300"
              >
                S'inscrire
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-xs mb-4 md:mb-0">
            © {new Date().getFullYear()} IZYMOTO. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <Link
              href="/mentions-legales"
              className="text-gray-500 hover:text-white text-xs transition-colors duration-300"
            >
              Mentions légales
            </Link>
            <Link
              href="/politique-de-confidentialite"
              className="text-gray-500 hover:text-white text-xs transition-colors duration-300"
            >
              Politique de confidentialité
            </Link>
            <Link
              href="/conditions-generales"
              className="text-gray-500 hover:text-white text-xs transition-colors duration-300"
            >
              CGU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
