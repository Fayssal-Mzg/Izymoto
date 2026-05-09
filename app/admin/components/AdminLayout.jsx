"use client";

import AdminGuard from "./AdminGuard";
import Sidebar, { NAV_ITEMS } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/connexion");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path) => {
    if (path === "/admin") return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar mobile */}
        <div className="md:hidden sticky top-0 z-40 bg-black text-white px-4 py-3 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-amber-400 truncate">
              IzyMoto Admin
            </h1>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-amber-400 transition-colors flex-shrink-0"
              title="Retour au site"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Site</span>
            </Link>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="z-50 relative"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Menu mobile overlay full-screen */}
        <div
          className={`md:hidden fixed inset-0 bg-black/95 z-40 transform transition-transform duration-500 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col pt-20 pb-8 px-6 overflow-y-auto">
            {/* Bloc retour au site, en haut, distinct */}
            <Link
              href="/"
              onClick={closeMenu}
              className="flex items-center justify-center gap-2 py-3 mb-6 text-sm uppercase tracking-widest text-amber-400 border border-amber-400/40 rounded-md hover:bg-amber-400 hover:text-black transition-all duration-300"
            >
              <ExternalLink className="h-4 w-4" />
              Retour au site
            </Link>

            {/* Nav admin */}
            <nav className="flex flex-col space-y-1 flex-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={closeMenu}
                  className={`flex items-center gap-4 py-4 px-4 rounded-md uppercase tracking-widest text-base transition-colors duration-300 ${
                    isActive(item.path)
                      ? "bg-amber-400/10 text-amber-400 border-l-2 border-amber-400"
                      : "text-white hover:bg-white/5 hover:text-amber-400"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Footer mobile : user + déconnexion */}
            <div className="mt-6 pt-6 border-t border-white/20">
              {user?.email && (
                <div className="text-center mb-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    Connecté en tant que
                  </div>
                  <div className="text-sm text-gray-300 mt-0.5 truncate">
                    {user.email}
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/40 text-white hover:bg-white hover:text-black transition-all duration-300 tracking-wider rounded-md"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar desktop */}
        <Sidebar onLogout={handleLogout} />

        {/* Contenu principal — décalé uniquement sur desktop */}
        <div className="md:ml-64">
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
