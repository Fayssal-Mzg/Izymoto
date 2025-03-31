"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Header() {
  const { user, logOut } = useAuth();

  return (
    <header className="w-full">
      {/* Barre supérieure noire */}
      <div className="flex h-16 items-center justify-between bg-black px-6 text-white">
        <Link href="/">
          <Image
            src="/Izymoto_logo-noir&blanc.png" // Remplace par ton vrai logo
            alt="Izymoto"
            width={120}
            height={40}
            className="object-contain"
          />
        </Link>

        {/* Téléphone et Connexion/Profil */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span className="text-sm font-medium">(+33)6 52 75 35 21</span>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <Link
                href="/profil"
                className="text-sm font-medium hover:text-gray-300"
              >
                Mon Profil
              </Link>
              <button
                onClick={() => logOut()}
                className="text-sm font-medium hover:text-gray-300"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <Link
              href="/connexion"
              className="text-sm font-medium hover:text-gray-300"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>

      {/* Navigation jaune */}
      <nav className="flex h-14 items-center justify-center bg-[#ffc107] px-4">
        <ul className="flex space-x-8">
          <li>
            <Link
              href="/reserver"
              className="text-sm font-medium hover:text-gray-800"
            >
              RÉSERVER UN TRAJET
            </Link>
          </li>
          <li>
            <Link
              href="/nos-tarifs"
              className="text-sm font-medium hover:text-gray-800"
            >
              NOS TARIFS
            </Link>
          </li>
          <li>
            <Link
              href="/aeroports"
              className="text-sm font-medium hover:text-gray-800"
            >
              AÉROPORTS PARIS
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="text-sm font-medium hover:text-gray-800"
            >
              À PROPOS DE IZYMOTO
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
