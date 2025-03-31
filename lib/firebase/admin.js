// lib/firebase/admin.js
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
  where,
  setDoc,
  getDoc,
} from "firebase/firestore";

// Obtenir toutes les réservations
export async function getAllBookings() {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const bookings = [];
    querySnapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      });
    });

    return bookings;
  } catch (error) {
    console.error("Erreur lors de la récupération des réservations:", error);
    throw error;
  }
}

// Mettre à jour le statut d'une réservation
export async function updateBookingStatus(bookingId, status) {
  try {
    await updateDoc(doc(db, "bookings", bookingId), {
      status,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    throw error;
  }
}

// Supprimer une réservation
export async function deleteBooking(bookingId) {
  try {
    await deleteDoc(doc(db, "bookings", bookingId));
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la réservation:", error);
    throw error;
  }
}

// Obtenir tous les utilisateurs
export async function getAllUsers() {
  try {
    const q = query(collection(db, "users"));
    const querySnapshot = await getDocs(q);

    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return users;
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    throw error;
  }
}
// Supprimer un utilisateur (document Firestore uniquement)
export async function deleteUser(userId) {
  try {
    // Note: Cette fonction supprime uniquement le document utilisateur de Firestore
    // Pour supprimer complètement un utilisateur de Firebase Auth,
    // vous aurez besoin de fonctions côté serveur (Cloud Functions)
    await deleteDoc(doc(db, "users", userId));
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    throw error;
  }
}

// Définir ou retirer les droits d'administrateur
export async function setUserAdminStatus(userId, isAdmin) {
  try {
    const userRef = doc(db, "users", userId);

    // Vérifier si l'utilisateur existe déjà dans la collection users
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Mettre à jour le document existant
      await updateDoc(userRef, { isAdmin });
    } else {
      // Créer un nouveau document
      await setDoc(userRef, { isAdmin });
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la modification du statut admin:", error);
    throw error;
  }
}

// Obtenir les statistiques pour le tableau de bord
export async function getAdminStats() {
  try {
    // Total des réservations
    const bookingsSnapshot = await getDocs(collection(db, "bookings"));
    const totalBookings = bookingsSnapshot.size;

    // Réservations aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const todayBookingsQuery = query(
      collection(db, "bookings"),
      where("createdAt", ">=", todayTimestamp)
    );
    const todayBookingsSnapshot = await getDocs(todayBookingsQuery);
    const todayBookings = todayBookingsSnapshot.size;

    // Total des utilisateurs
    const usersSnapshot = await getDocs(collection(db, "users"));
    const totalUsers = usersSnapshot.size;

    // Chiffre d'affaires total
    let totalRevenue = 0;
    bookingsSnapshot.forEach((doc) => {
      const bookingData = doc.data();
      totalRevenue += bookingData.prix || 0;
    });

    return {
      totalBookings,
      todayBookings,
      totalUsers,
      totalRevenue,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    throw error;
  }
}
