// app/admin/components/Sidebar.jsx

import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ onLogout }) {
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname === path;
  };

  const navItems = [
    { icon: LayoutDashboard, name: "Tableau de bord", path: "/admin" },
    { icon: CalendarClock, name: "Réservations", path: "/admin/reservations" },
    { icon: Users, name: "Utilisateurs", path: "/admin/utilisateurs" },
    { icon: Settings, name: "Paramètres", path: "/admin/parametres" },
  ];

  return (
    <div className="w-64 bg-black text-white h-screen fixed left-0 top-0">
      <div className="p-4">
        <div className="mb-8 mt-4">
          <h1 className="text-xl font-bold text-[#ffc107]">IzyMoto Admin</h1>
        </div>

        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <div
                    className={`flex items-center px-4 py-3 rounded-md hover:bg-gray-800 transition ${
                      isActive(item.path) ? "bg-gray-800 text-[#ffc107]" : ""
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
      </div>

      <div className="absolute bottom-0 w-full p-4">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 rounded-md hover:bg-gray-800 transition"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
