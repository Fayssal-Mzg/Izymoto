// contexts/AuthContext.tsx
"use client";

import { auth, db } from "@/lib/firebaseConfig";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Define the structure of reservation details
interface ReservationDetails {
  depart: string;
  arrivee: string;
  distance: number;
  duree: number;
  prix: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  reservationDetails: ReservationDetails | null;
  signUp: (email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setReservationDetails: (details: ReservationDetails) => void;
  clearReservationDetails: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservationDetails, setReservationDetailsState] =
    useState<ReservationDetails | null>(null);

  // Load reservation details from localStorage on initial load
  useEffect(() => {
    const storedReservation = localStorage.getItem("pendingReservation");
    if (storedReservation) {
      setReservationDetailsState(JSON.parse(storedReservation));
    }
  }, []);

  // Save reservation details to localStorage whenever they change
  const setReservationDetails = (details: ReservationDetails) => {
    setReservationDetailsState(details);
    localStorage.setItem("pendingReservation", JSON.stringify(details));
  };

  // Clear reservation details
  const clearReservationDetails = () => {
    setReservationDetailsState(null);
    localStorage.removeItem("pendingReservation");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // Supprimer toute logique de redirection ici
    });

    return () => unsubscribe();
  }, []); // Retirez reservationDetails des dépendances

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const newUser = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, "users", newUser.uid), {
      uid: newUser.uid,
      email: newUser.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      isAdmin: false,
      ...(reservationDetails ? { pendingReservation: reservationDetails } : {}),
    });
  };

  const logIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Check if user has a document in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      // Create profile if it doesn't exist
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAdmin: false,
        ...(reservationDetails
          ? { pendingReservation: reservationDetails }
          : {}),
      });
    } else {
      // Update last login and potentially add pending reservation
      await setDoc(
        doc(db, "users", user.uid),
        {
          lastLogin: serverTimestamp(),
          ...(reservationDetails
            ? { pendingReservation: reservationDetails }
            : {}),
        },
        { merge: true }
      );
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user has a document in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      // Create profile for Google user
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAdmin: false,
        ...(reservationDetails
          ? { pendingReservation: reservationDetails }
          : {}),
      });
    } else {
      // Update last login and potentially add pending reservation
      await setDoc(
        doc(db, "users", user.uid),
        {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL,
          ...(reservationDetails
            ? { pendingReservation: reservationDetails }
            : {}),
        },
        { merge: true }
      );
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        reservationDetails,
        signUp,
        logIn,
        logOut,
        signInWithGoogle,
        setReservationDetails,
        clearReservationDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
