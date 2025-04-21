// lib/firebase/bookings.js
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

export async function saveBooking(bookingData, userId) {
  try {
    // Vérifier si userId est un utilisateur connecté
    const guestId =
      userId === "guest"
        ? `guest_${Math.random().toString(36).substring(2, 10)}`
        : userId;

    const booking = {
      ...bookingData,
      userId: guestId,
      accountType: userId === "guest" ? "guest" : "registered",
      status: bookingData.status || "pending",
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "bookings"), booking);
    return { id: docRef.id, ...booking };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la réservation:", error);
    throw error;
  }
}

export async function getUserBookings(userId, userEmail) {
  try {
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

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
    return [];
  }
}
