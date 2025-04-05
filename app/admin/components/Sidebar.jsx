import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar({ onLogout }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        {isMenuOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Menu className="h-6 w-6 text-black" />
        )}
      </button>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 w-64 bg-black text-white h-screen 
          transform transition-transform duration-300 ease-in-out
          ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 z-50
        `}
      >
        <div className="p-4">
          <div className="mb-8 mt-4">
            <h1 className="text-xl font-bold text-[#ffc107]">IzyMoto Admin</h1>
          </div>

          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path} onClick={() => setIsMenuOpen(false)}>
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
    </>
  );
}
