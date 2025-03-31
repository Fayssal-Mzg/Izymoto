// app/admin/page.jsx
"use client";

import AdminLayout from "./components/AdminLayout";
import { getAdminStats } from "@/lib/firebase/admin";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await getAdminStats();
        setStats(statsData);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffc107]"></div>
        </div>
      </AdminLayout>
    );
  }

  // Données pour le graphique
  const chartData = [
    { name: "Réservations", total: stats?.totalBookings || 0 },
    { name: "Utilisateurs", total: stats?.totalUsers || 0 },
    { name: "Aujourd'hui", total: stats?.todayBookings || 0 },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Total Réservations
          </h2>
          <p className="mt-2 text-3xl font-bold">{stats?.totalBookings || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Réservations aujourd'hui
          </h2>
          <p className="mt-2 text-3xl font-bold">{stats?.todayBookings || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Utilisateurs
          </h2>
          <p className="mt-2 text-3xl font-bold">{stats?.totalUsers || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-sm font-medium text-gray-500 uppercase">
            Chiffre d'affaires
          </h2>
          <p className="mt-2 text-3xl font-bold">{stats?.totalRevenue || 0}€</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-medium mb-4">Aperçu</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#ffc107" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Activité récente</h2>
        <p className="text-gray-500">
          Consultez la page des réservations pour voir les activités récentes.
        </p>
      </div>
    </AdminLayout>
  );
}
