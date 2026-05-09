// lib/firebase/admin.ts
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
  addDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces de typage
interface User {
  id: string;
  isAdmin?: boolean;
  [key: string]: any;
}

interface Booking {
  id: string;
  userId: string;
  name: string;
  email: string;
  prix: number;
  distance: number;
  duree: number;
  depart: string;
  arrivee: string;
  reservationDate: Date;
  createdAt: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentId?: string;
  paymentMethod?: "card" | "wallet" | "hybrid";
  paymentStatus?:
    | "authorized"
    | "captured"
    | "released"
    | "failed"
    | "paid_wallet";
  amountAuthorized?: number;
  amountCaptured?: number;
  walletAmountCents?: number;
  cardAmountCents?: number;
  paymentFailureMessage?: string;
  paymentUpdatedAt?: Date;
  [key: string]: any;
}

interface Facture {
  id: string;
  bookingId: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  montant: number;
  dateReservation: Date;
  dateGeneration: Date;
  dateEcheance?: Date;
  pdfUrl?: string;
  statut: "genere" | "telecharge" | "archive";
}

interface AdminStats {
  totalBookings: number;
  todayBookings: number;
  totalUsers: number;
  totalRevenue: number;
}

export interface WalletAdminRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  balanceCents: number;
  cumulativeRechargedCents: number;
  currency: "EUR";
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WalletTransactionAdminRow {
  id: string;
  userId: string;
  type: "recharge" | "debit" | "refund" | "bonus_adjustment" | "admin_debit";
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  tierId?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  bookingId?: string;
  stripeEventId?: string;
  adminUid?: string;
  adminEmail?: string;
  reason?: string;
  createdAt: Date | null;
}

export async function generateInvoicePDF(
  booking: Booking
): Promise<{ factureId: string; pdfUrl: string }> {
  // Vérifier s'il n'existe pas déjà une facture pour cette réservation
  const facturesQuery = query(
    collection(db, "factures"),
    where("bookingId", "==", booking.id)
  );
  const existingFactures = await getDocs(facturesQuery);

  if (!existingFactures.empty) {
    // Une facture existe déjà, retourner la première
    const existingFacture = existingFactures.docs[0].data() as Facture;
    return {
      factureId: existingFactures.docs[0].id,
      pdfUrl: existingFacture.pdfUrl!,
    };
  }

  // Création du PDF
  const pdfDoc = new jsPDF();

  // En-tête de la facture
  pdfDoc.setFontSize(22);
  pdfDoc.text("IZYMOTO - Facture de Transport", 10, 20);

  // Informations de l'entreprise
  pdfDoc.setFontSize(10);
  pdfDoc.text("IZYMOTO SARL", 10, 30);
  pdfDoc.text("Paris, France", 10, 35);
  pdfDoc.text("Numéro SIRET: XXX XXX XXX", 10, 40);

  // Informations du client
  pdfDoc.text(`Client: ${booking.name}`, 10, 50);
  pdfDoc.text(`Email: ${booking.email}`, 10, 55);

  // Détails de la réservation
  autoTable(pdfDoc, {
    startY: 70,
    head: [["Description", "Détails"]],
    body: [
      ["Date de réservation", booking.reservationDate.toLocaleDateString()],
      ["Départ", booking.depart],
      ["Arrivée", booking.arrivee],
      ["Distance", `${booking.distance} km`],
      ["Durée", `${booking.duree} minutes`],
    ],
  });

  // Section tarifaire
  autoTable(pdfDoc, {
    startY: 160,
    head: [["Libellé", "Montant HT"]],
    body: [
      ["Course", `${booking.prix.toFixed(2)} €`],
      ["Total HT", `${booking.prix.toFixed(2)} €`],
      ["TVA (20%)", `${(booking.prix * 0.2).toFixed(2)} €`],
      ["Total TTC", `${(booking.prix * 1.2).toFixed(2)} €`],
    ],
  });

  // Générer un blob PDF
  const pdfBlob = pdfDoc.output("blob");

  // Téléverser dans Firebase Storage
  const storage = getStorage();
  const factureId = `facture_${booking.id}_${Date.now()}`;
  const storageRef = ref(storage, `factures/${factureId}.pdf`);

  const snapshot = await uploadBytes(storageRef, pdfBlob);
  const pdfUrl = await getDownloadURL(snapshot.ref);

  // Enregistrer les métadonnées de la facture
  const factureData: Facture = {
    id: factureId,
    bookingId: booking.id,
    userId: booking.userId,
    clientName: booking.name,
    clientEmail: booking.email,
    montant: booking.prix * 1.2,
    dateReservation: booking.reservationDate,
    dateGeneration: new Date(),
    dateEcheance: getFactureEcheance(),
    pdfUrl,
    statut: "genere",
  };

  // Sauvegarder dans Firestore
  await addDoc(collection(db, "factures"), factureData);

  return { factureId, pdfUrl };
}

// Fonction utilitaire pour calculer la date d'échéance
function getFactureEcheance(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30); // 30 jours par défaut
  return date;
}

export async function getAllFactures(): Promise<Facture[]> {
  const q = query(
    collection(db, "factures"),
    orderBy("dateGeneration", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as Omit<Facture, "id">;
    return {
      id: docSnapshot.id,
      ...data,
      dateGeneration:
        (data.dateGeneration as unknown as Timestamp)?.toDate() ?? new Date(),
      dateReservation:
        (data.dateReservation as unknown as Timestamp)?.toDate() ?? new Date(),
      dateEcheance: data.dateEcheance
        ? (data.dateEcheance as unknown as Timestamp)?.toDate()
        : undefined,
    };
  });
}

// Convertit un champ Firestore en Date JS, robuste aux différents formats :
// - Timestamp Firestore (.toDate())
// - Date JS native
// - String ISO
// - Objet { seconds, nanoseconds } (Timestamp sérialisé)
function coerceDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

export async function getAllBookings(): Promise<Booking[]> {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as Partial<Booking>;

      return {
        id: docSnapshot.id,
        userId: data.userId ?? "",
        name: data.name ?? "",
        email: data.email ?? "",
        prix: data.prix ?? 0,
        distance: data.distance ?? 0,
        duree: data.duree ?? 0,
        depart: data.depart ?? "",
        arrivee: data.arrivee ?? "",
        status: data.status ?? "pending",
        createdAt: coerceDate(data.createdAt) ?? new Date(),
        reservationDate: coerceDate(data.reservationDate) ?? new Date(),
        ...(data as any), // Permet de conserver les champs additionnels
      } as Booking;
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des réservations:", error);
    throw error;
  }
}

// Mettre à jour le statut d'une réservation
export async function updateBookingStatus(
  bookingId: string,
  status: Booking["status"]
): Promise<boolean> {
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
export async function deleteBooking(bookingId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "bookings", bookingId));
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la réservation:", error);
    throw error;
  }
}

// Obtenir tous les utilisateurs
export async function getAllUsers(): Promise<User[]> {
  try {
    const q = query(collection(db, "users"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as Omit<User, "id">;
      return {
        id: docSnapshot.id,
        ...data,
      };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    throw error;
  }
}

// Supprimer un utilisateur
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", userId));
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    throw error;
  }
}

// Définir ou retirer les droits d'administrateur
export async function setUserAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, { isAdmin });
    } else {
      await setDoc(userRef, { isAdmin });
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la modification du statut admin:", error);
    throw error;
  }
}

// Liste tous les wallets joints avec les infos user (email, displayName).
// Tri par updatedAt desc côté client (collection sans index sur updatedAt).
export async function getAllWallets(): Promise<WalletAdminRow[]> {
  const [walletsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, "wallets")),
    getDocs(collection(db, "users")),
  ]);

  const usersById = new Map<
    string,
    { email: string | null; displayName: string | null }
  >();
  usersSnap.forEach((u) => {
    const data = u.data() as any;
    usersById.set(u.id, {
      email: data.email ?? null,
      displayName: data.displayName ?? null,
    });
  });

  const rows: WalletAdminRow[] = walletsSnap.docs.map((w) => {
    const data = w.data() as any;
    const user = usersById.get(w.id);
    return {
      uid: w.id,
      email: user?.email ?? null,
      displayName: user?.displayName ?? null,
      balanceCents: data.balanceCents ?? 0,
      cumulativeRechargedCents: data.cumulativeRechargedCents ?? 0,
      currency: data.currency ?? "EUR",
      createdAt:
        (data.createdAt as Timestamp | undefined)?.toDate() ?? null,
      updatedAt:
        (data.updatedAt as Timestamp | undefined)?.toDate() ?? null,
    };
  });

  rows.sort((a, b) => {
    const at = a.updatedAt?.getTime() ?? 0;
    const bt = b.updatedAt?.getTime() ?? 0;
    return bt - at;
  });

  return rows;
}

// Lit directement wallets/{uid} et joint avec users/{uid} pour avoir
// email + displayName. Utilisé sur la page détail admin pour éviter de
// récupérer la liste complète des wallets juste pour en trouver un.
export async function getWalletByUid(
  uid: string
): Promise<WalletAdminRow | null> {
  const [walletSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "wallets", uid)),
    getDoc(doc(db, "users", uid)),
  ]);

  if (!walletSnap.exists()) return null;

  const data = walletSnap.data() as any;
  const userData = userSnap.exists() ? (userSnap.data() as any) : null;

  return {
    uid,
    email: userData?.email ?? null,
    displayName: userData?.displayName ?? null,
    balanceCents: data.balanceCents ?? 0,
    cumulativeRechargedCents: data.cumulativeRechargedCents ?? 0,
    currency: data.currency ?? "EUR",
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? null,
    updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate() ?? null,
  };
}

// Récupère les N dernières transactions d'un user (côté admin).
export async function getUserWalletTransactions(
  uid: string,
  max: number = 100
): Promise<WalletTransactionAdminRow[]> {
  const q = query(
    collection(db, "walletTransactions"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.slice(0, max).map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      userId: data.userId,
      type: data.type,
      amountCents: data.amountCents,
      balanceAfterCents: data.balanceAfterCents,
      description: data.description,
      tierId: data.tierId,
      paymentIntentId: data.paymentIntentId,
      checkoutSessionId: data.checkoutSessionId,
      bookingId: data.bookingId,
      stripeEventId: data.stripeEventId,
      adminUid: data.adminUid,
      adminEmail: data.adminEmail,
      reason: data.reason,
      createdAt:
        (data.createdAt as Timestamp | undefined)?.toDate() ?? null,
    };
  });
}

// Obtenir les statistiques pour le tableau de bord
export async function getAdminStats(): Promise<AdminStats> {
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
    const totalRevenue = bookingsSnapshot.docs.reduce((sum, doc) => {
      const bookingData = doc.data() as Booking;
      return sum + (bookingData.prix || 0);
    }, 0);

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
