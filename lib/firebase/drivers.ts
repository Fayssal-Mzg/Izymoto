// lib/firebase/drivers.ts
// CRUD profil chauffeur + upload Firebase Storage.
// Le doc users/{uid}.role pilote le contrôle d'accès, drivers/{uid} contient
// la fiche sensible (KYC, RIB, permis). Aucune donnée sensible sur users.

import { db } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export type DriverStatus = "pending" | "active" | "suspended" | "rejected";
export type DriverAvailability = "online" | "offline";

export type DocKind =
  | "identityCard"
  | "drivingLicense"
  | "vehicleRegistration"
  | "insurance"
  | "rib"
  | "motoPhoto";

export const REQUIRED_DOCS: DocKind[] = [
  "identityCard",
  "drivingLicense",
  "vehicleRegistration",
  "insurance",
  "rib",
];

export const DOC_LABELS: Record<DocKind, string> = {
  identityCard: "Pièce d'identité",
  drivingLicense: "Permis A / A2 (recto-verso)",
  vehicleRegistration: "Carte grise de la moto",
  insurance: "Attestation d'assurance",
  rib: "RIB",
  motoPhoto: "Photo de la moto (optionnel)",
};

export interface DriverDocument {
  url: string;
  path: string;
  uploadedAt: Date;
  filename: string;
}

export interface DriverMoto {
  brand: string;
  model: string;
  year: number | null;
  plate: string;
  color: string;
}

export interface DriverBankInfo {
  iban: string;
  bic: string;
  accountHolder: string;
}

export interface DriverProfile {
  uid: string;
  email: string;
  status: DriverStatus;
  availability: DriverAvailability;

  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string | null;
  address: string;

  legalForm: "auto-entrepreneur" | "sasu" | "eurl" | "other" | null;
  companyName: string;
  siret: string;
  vatNumber: string;

  licenseNumber: string;
  licenseDeliveryDate: string | null;

  moto: DriverMoto;
  bank: DriverBankInfo;

  documents: Partial<Record<DocKind, DriverDocument>>;

  acceptedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string;

  createdAt: Date | null;
  updatedAt: Date | null;

  stats: {
    totalRides: number;
    totalEarningsCents: number;
  };
}

export const EMPTY_DRIVER: Omit<DriverProfile, "uid" | "email" | "createdAt" | "updatedAt"> = {
  status: "pending",
  availability: "offline",
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: null,
  address: "",
  legalForm: null,
  companyName: "",
  siret: "",
  vatNumber: "",
  licenseNumber: "",
  licenseDeliveryDate: null,
  moto: { brand: "", model: "", year: null, plate: "", color: "" },
  bank: { iban: "", bic: "", accountHolder: "" },
  documents: {},
  acceptedAt: null,
  rejectedAt: null,
  rejectionReason: "",
  stats: { totalRides: 0, totalEarningsCents: 0 },
};

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

function hydrateDriver(uid: string, data: any): DriverProfile {
  const docs: Partial<Record<DocKind, DriverDocument>> = {};
  if (data.documents) {
    for (const key of Object.keys(data.documents) as DocKind[]) {
      const d = data.documents[key];
      if (!d) continue;
      docs[key] = {
        url: d.url,
        path: d.path,
        filename: d.filename ?? "",
        uploadedAt: coerceDate(d.uploadedAt) ?? new Date(),
      };
    }
  }
  return {
    uid,
    email: data.email ?? "",
    status: (data.status as DriverStatus) ?? "pending",
    availability: (data.availability as DriverAvailability) ?? "offline",
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    phone: data.phone ?? "",
    dateOfBirth: data.dateOfBirth ?? null,
    address: data.address ?? "",
    legalForm: data.legalForm ?? null,
    companyName: data.companyName ?? "",
    siret: data.siret ?? "",
    vatNumber: data.vatNumber ?? "",
    licenseNumber: data.licenseNumber ?? "",
    licenseDeliveryDate: data.licenseDeliveryDate ?? null,
    moto: {
      brand: data.moto?.brand ?? "",
      model: data.moto?.model ?? "",
      year: data.moto?.year ?? null,
      plate: data.moto?.plate ?? "",
      color: data.moto?.color ?? "",
    },
    bank: {
      iban: data.bank?.iban ?? "",
      bic: data.bank?.bic ?? "",
      accountHolder: data.bank?.accountHolder ?? "",
    },
    documents: docs,
    acceptedAt: coerceDate(data.acceptedAt),
    rejectedAt: coerceDate(data.rejectedAt),
    rejectionReason: data.rejectionReason ?? "",
    createdAt: coerceDate(data.createdAt),
    updatedAt: coerceDate(data.updatedAt),
    stats: {
      totalRides: data.stats?.totalRides ?? 0,
      totalEarningsCents: data.stats?.totalEarningsCents ?? 0,
    },
  };
}

export async function createDriverProfile(
  uid: string,
  email: string,
  initial: Partial<DriverProfile> = {}
): Promise<void> {
  await setDoc(doc(db, "drivers", uid), {
    uid,
    email,
    ...EMPTY_DRIVER,
    ...initial,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getDriverProfile(uid: string): Promise<DriverProfile | null> {
  const snap = await getDoc(doc(db, "drivers", uid));
  if (!snap.exists()) return null;
  return hydrateDriver(uid, snap.data());
}

export async function updateDriverProfile(
  uid: string,
  patch: Partial<Omit<DriverProfile, "uid" | "documents">>
): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function setDriverAvailability(
  uid: string,
  availability: DriverAvailability
): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), {
    availability,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadDriverDocument(
  uid: string,
  kind: DocKind,
  file: File
): Promise<DriverDocument> {
  const storage = getStorage();
  const ts = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `drivers/${uid}/${kind}_${ts}_${safeName}`;
  const ref = storageRef(storage, path);
  const snap = await uploadBytes(ref, file, { contentType: file.type });
  const url = await getDownloadURL(snap.ref);

  const docData: DriverDocument = {
    url,
    path,
    filename: file.name,
    uploadedAt: new Date(),
  };

  await updateDoc(doc(db, "drivers", uid), {
    [`documents.${kind}`]: {
      url,
      path,
      filename: file.name,
      uploadedAt: Timestamp.now(),
    },
    updatedAt: serverTimestamp(),
  });

  return docData;
}

export async function deleteDriverDocument(
  uid: string,
  kind: DocKind,
  path: string
): Promise<void> {
  const storage = getStorage();
  try {
    await deleteObject(storageRef(storage, path));
  } catch (err) {
    console.warn("[drivers] échec suppression Storage:", err);
  }
  await updateDoc(doc(db, "drivers", uid), {
    [`documents.${kind}`]: null,
    updatedAt: serverTimestamp(),
  });
}

export function hasRequiredDocs(driver: DriverProfile): boolean {
  return REQUIRED_DOCS.every((k) => Boolean(driver.documents[k]?.url));
}

export function missingDocs(driver: DriverProfile): DocKind[] {
  return REQUIRED_DOCS.filter((k) => !driver.documents[k]?.url);
}

// --- Admin ---

export async function listDrivers(statusFilter?: DriverStatus): Promise<DriverProfile[]> {
  const ref = collection(db, "drivers");
  const q = statusFilter
    ? query(ref, where("status", "==", statusFilter), orderBy("createdAt", "desc"))
    : query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => hydrateDriver(d.id, d.data()));
}

export async function approveDriver(uid: string): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), {
    status: "active",
    acceptedAt: Timestamp.now(),
    rejectionReason: "",
    updatedAt: serverTimestamp(),
  });
}

export async function rejectDriver(uid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), {
    status: "rejected",
    rejectedAt: Timestamp.now(),
    rejectionReason: reason,
    availability: "offline",
    updatedAt: serverTimestamp(),
  });
}

export async function suspendDriver(uid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), {
    status: "suspended",
    rejectionReason: reason,
    availability: "offline",
    updatedAt: serverTimestamp(),
  });
}

export async function reinstateDriver(uid: string): Promise<void> {
  await updateDoc(doc(db, "drivers", uid), {
    status: "active",
    rejectionReason: "",
    updatedAt: serverTimestamp(),
  });
}
