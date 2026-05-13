"use client";

import {
  LayoutDashboard,
  ListChecks,
  Route,
  UserCircle,
  LogOut,
  ExternalLink,
  Bike,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export const DRIVER_NAV = [
  { icon: LayoutDashboard, name: "Tableau de bord", path: "/chauffeur" },
  { icon: ListChecks, name: "Courses dispo", path: "/chauffeur/courses" },
  { icon: Route, name: "Mes courses", path: "/chauffeur/mes-courses" },
  { icon: UserCircle, name: "Mon profil", path: "/chauffeur/profil" },
];

// Sidebar dédiée chauffeur — palette slate sombre + accent amber,
// volontairement distincte de l'UX client (bg blanc) et de l'admin (noir/amber).
export default function DriverSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/chauffeur") return pathname === path;
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 bg-slate-950 text-slate-100 z-30 flex-col border-r border-slate-800">
      <div className="p-4 flex flex-col h-full">
        <div className="mb-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <Bike className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-400 leading-tight">
                Izymoto Pro
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Espace chauffeur
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors mt-3"
          >
            <ExternalLink className="h-3 w-3" />
            Retour au site
          </Link>
        </div>

        <nav>
          <ul className="space-y-1">
            {DRIVER_NAV.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive(item.path)
                      ? "bg-amber-400/10 text-amber-400 border-l-2 border-amber-400 pl-[10px]"
                      : "text-slate-300 hover:bg-slate-900 hover:text-amber-400"
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800">
          {user?.email && (
            <div className="px-3 py-2 mb-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">
                Connecté
              </div>
              <div
                className="text-sm text-slate-300 truncate"
                title={user.email}
              >
                {user.email}
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-slate-900 hover:text-amber-400 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-3" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
