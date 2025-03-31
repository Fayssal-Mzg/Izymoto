// app/admin/components/AdminLayout.jsx
"use client";

import AdminGuard from "./AdminGuard";
import Sidebar from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const { logOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/connexion");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <Sidebar onLogout={handleLogout} />
        <div className="ml-64 flex-1 bg-gray-50">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
