"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  LogOut,
  ExternalLink,
  Bike,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DriverGuard from "./DriverGuard";
import DriverSidebar, { DRIVER_NAV } from "./DriverSidebar";
import { useDriver } from "@/lib/hooks/useDriver";
import DriverStatusBanner from "./DriverStatusBanner";

export default function DriverLayout({ children }: { children: ReactNode }) {
  const { logOut } = useAuth();
  const { driver } = useDriver();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <DriverGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="md:hidden sticky top-0 z-40 bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center flex-shrink-0">
              <Bike className="h-4 w-4 text-amber-400" />
            </div>
            <h1 className="text-base font-bold text-amber-400 truncate">
              Izymoto Pro
            </h1>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="z-50 relative"
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={`md:hidden fixed inset-0 bg-slate-950/95 z-40 transform transition-transform duration-300 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col pt-20 pb-8 px-6 overflow-y-auto">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-3 mb-6 text-sm uppercase tracking-widest text-amber-400 border border-amber-400/40 rounded-md hover:bg-amber-400 hover:text-black transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              Retour au site
            </Link>
            <nav className="flex flex-col space-y-1 flex-1">
              {DRIVER_NAV.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-4 py-3 px-4 rounded-md uppercase tracking-widest text-sm text-white hover:bg-white/5 hover:text-amber-400 transition-colors"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/40 text-white hover:bg-white hover:text-black transition-all rounded-md"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>

        <DriverSidebar onLogout={handleLogout} />

        <div className="md:ml-64">
          <main className="p-4 md:p-6 max-w-6xl mx-auto">
            {driver && <DriverStatusBanner driver={driver} />}
            {children}
          </main>
        </div>
      </div>
    </DriverGuard>
  );
}
