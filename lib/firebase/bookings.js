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

// Fonction pour enregistrer une nouvelle réservation
export async function saveBooking(bookingData, userId) {
  try {
    const booking = {
      ...bookingData,
      userId,
      status: "confirmed",
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "bookings"), booking);
    return { id: docRef.id, ...booking };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la réservation:", error);
    throw error;
  }
}

export async function getUserBookings(userId) {
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
