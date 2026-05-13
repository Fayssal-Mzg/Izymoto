"use client";

import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Wallet,
  Settings,
  LogOut,
  ExternalLink,
  Bike,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export const NAV_ITEMS = [
  { icon: LayoutDashboard, name: "Tableau de bord", path: "/admin" },
  { icon: CalendarClock, name: "Réservations", path: "/admin/reservations" },
  { icon: Bike, name: "Chauffeurs", path: "/admin/chauffeurs" },
  { icon: Users, name: "Utilisateurs", path: "/admin/utilisateurs" },
  { icon: Wallet, name: "Portefeuilles", path: "/admin/wallets" },
  { icon: Settings, name: "Paramètres", path: "/admin/parametres" },
];

// Sidebar visible uniquement sur desktop (md+). Sur mobile, la nav est gérée
// par le menu burger overlay dans AdminLayout.
export default function Sidebar({ onLogout }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path) => {
    if (path === "/admin") return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-black text-white z-30 flex-col">
      <div className="p-4 flex flex-col h-full">
        <div className="mb-6 mt-4">
          <h1 className="text-xl font-bold text-amber-400">IzyMoto Admin</h1>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400 transition-colors mt-1.5"
          >
            <ExternalLink className="h-3 w-3" />
            Retour au site
          </Link>
        </div>

        <nav>
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <div
                    className={`flex items-center px-4 py-3 rounded-md hover:bg-gray-800 transition ${
                      isActive(item.path) ? "bg-gray-800 text-amber-400" : ""
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-800">
          {user?.email && (
            <div className="px-4 py-2 mb-2">
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                Connecté en tant que
              </div>
              <div className="text-sm text-gray-300 truncate" title={user.email}>
                {user.email}
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-3 rounded-md hover:bg-gray-800 transition"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
