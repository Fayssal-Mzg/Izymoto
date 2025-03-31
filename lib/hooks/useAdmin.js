// lib/hooks/useAdmin.js

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";

export function useAdmin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!loading) {
        if (!user) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().isAdmin === true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error(
            "Erreur lors de la vérification du statut admin:",
            error
          );
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkAdminStatus();
  }, [user, loading]);

  return { isAdmin, isLoading };
}
