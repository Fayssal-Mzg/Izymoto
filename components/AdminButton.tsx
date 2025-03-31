// components/AdminAccessButton.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminAccessButton() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().isAdmin === true);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du statut admin:", error);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (!isAdmin) return null;

  return (
    <div className="mt-4">
      <Link
        href="/admin"
        className="block w-full px-4 py-2 text-center text-white bg-black rounded-md hover:bg-gray-800"
      >
        Accéder à l'espace administrateur
      </Link>
    </div>
  );
}
