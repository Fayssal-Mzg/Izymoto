// app/admin/utilisateurs/page.jsx
"use client";

import AdminLayout from "../components/AdminLayout";
import {
  getAllUsers,
  setUserAdminStatus,
  deleteUser,
} from "@/lib/firebase/admin";
import {
  User,
  Shield,
  ShieldOff,
  Mail,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdminToggle = async (userId, currentStatus) => {
    try {
      setIsProcessing(true);
      await setUserAdminStatus(userId, !currentStatus);

      // Mise à jour de l'état local
      setUsers(
        users.map((user) =>
          user.uid === userId ? { ...user, isAdmin: !currentStatus } : user
        )
      );
    } catch (error) {
      console.error("Erreur lors de la modification du statut admin:", error);
      alert(
        "Une erreur est survenue lors de la modification du statut administrateur."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      await deleteUser(userId);
      // Mise à jour de l'état local
      setUsers(users.filter((user) => user.uid !== userId));
    } catch (error) {
      console.error("Erreur lors de la suppression de l'utilisateur:", error);
      alert("Une erreur est survenue lors de la suppression de l'utilisateur.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.displayName &&
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw
                size={20}
                className={`${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par email ou nom..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredUsers.map((user) => {
              const initials = user.displayName
                ? (() => {
                    const parts = user.displayName.split(" ");
                    if (parts.length > 1)
                      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                    if (parts[0]) return parts[0][0].toUpperCase();
                    return "?";
                  })()
                : null;
              const lastLoginDate = user.lastLogin
                ? new Date(user.lastLogin.seconds * 1000)
                : user.lastSignInTime
                ? new Date(user.lastSignInTime)
                : null;
              const avatarBg = `#${user.uid
                .substring(0, 6)
                .replace(/[^0-9a-f]/gi, "6")}`;
              return (
                <li
                  key={user.uid}
                  className="bg-white border border-gray-200 rounded-xl p-4 lg:p-5 hover:border-gray-400 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Bloc identité */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 relative">
                        <div
                          className="h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ backgroundColor: avatarBg }}
                        >
                          {initials || <User size={20} />}
                        </div>
                        {user.isAdmin && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                            <Shield size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {user.displayName || "Utilisateur sans nom"}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 truncate">
                          <Mail size={14} className="flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
                          {user.uid.substring(0, 12)}…
                        </div>
                      </div>
                    </div>

                    {/* Bloc statut + dernière connexion */}
                    <div className="flex flex-row md:flex-col md:items-end items-baseline justify-between gap-2 md:gap-1 md:min-w-[160px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.isAdmin
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.isAdmin ? (
                          <>
                            <Shield size={12} />
                            Admin
                          </>
                        ) : (
                          "Utilisateur"
                        )}
                      </span>
                      <div className="text-xs text-gray-500 text-right">
                        {lastLoginDate ? (
                          <>
                            <div>
                              {lastLoginDate.toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-gray-400">
                              {lastLoginDate.toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">
                            Jamais connecté
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloc actions */}
                    <div className="flex gap-2 md:flex-shrink-0">
                      <button
                        onClick={() =>
                          handleAdminToggle(user.uid, user.isAdmin)
                        }
                        disabled={isProcessing}
                        className={`p-2.5 rounded-md transition-colors ${
                          user.isAdmin
                            ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                        title={
                          user.isAdmin
                            ? "Retirer les droits admin"
                            : "Attribuer les droits admin"
                        }
                      >
                        {user.isAdmin ? (
                          <ShieldOff size={16} />
                        ) : (
                          <Shield size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.uid)}
                        disabled={isProcessing}
                        className="p-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md transition-colors"
                        title="Supprimer cet utilisateur"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
