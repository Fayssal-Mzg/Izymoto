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
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière Connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 relative">
                            {/* Toujours afficher le cercle coloré avec les initiales, jamais l'image */}
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                              style={{
                                backgroundColor: `#${user.uid
                                  .substring(0, 6)
                                  .replace(/[^0-9a-f]/gi, "6")}`,
                              }}
                            >
                              {user.displayName ? (
                                // Extraction des initiales
                                (() => {
                                  const nameParts = user.displayName.split(" ");
                                  if (nameParts.length > 1) {
                                    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
                                  } else if (nameParts[0]) {
                                    return nameParts[0][0].toUpperCase();
                                  } else {
                                    return "?";
                                  }
                                })()
                              ) : (
                                <User size={20} />
                              )}
                            </div>

                            {user.isAdmin && (
                              <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                                <Shield size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || "Utilisateur sans nom"}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {user.uid.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail size={16} className="mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? (
                          <div>
                            <div>
                              {new Date(
                                user.lastLogin.seconds * 1000
                              ).toLocaleDateString("fr-FR")}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(
                                user.lastLogin.seconds * 1000
                              ).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ) : user.lastSignInTime ? (
                          <div>
                            <div>
                              {new Date(user.lastSignInTime).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(user.lastSignInTime).toLocaleTimeString(
                                "fr-FR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        ) : (
                          "Jamais connecté"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isAdmin
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.isAdmin ? "Administrateur" : "Utilisateur"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleAdminToggle(user.uid, user.isAdmin)
                            }
                            disabled={isProcessing}
                            className={`p-2 rounded-full ${
                              user.isAdmin
                                ? "bg-yellow-100 hover:bg-yellow-200"
                                : "bg-green-100 hover:bg-green-200"
                            } transition-colors`}
                            title={
                              user.isAdmin
                                ? "Retirer les droits d'administrateur"
                                : "Attribuer les droits d'administrateur"
                            }
                          >
                            {user.isAdmin ? (
                              <ShieldOff size={18} />
                            ) : (
                              <Shield size={18} />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.uid)}
                            disabled={isProcessing}
                            className="p-2 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
                            title="Supprimer cet utilisateur"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
