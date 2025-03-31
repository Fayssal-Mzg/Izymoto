// lib/firebase/users.js
import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Vérifier si un utilisateur est admin
export async function checkIsAdmin(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data().isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error("Erreur lors de la vérification du statut admin:", error);
    return false;
  }
}

// Définir un utilisateur comme admin (à utiliser dans un outil d'administration séparé)
export async function setUserAsAdmin(userId, isAdmin) {
  try {
    await setDoc(doc(db, "users", userId), { isAdmin }, { merge: true });
    return true;
  } catch (error) {
    console.error("Erreur lors de la définition du statut admin:", error);
    return false;
  }
}
