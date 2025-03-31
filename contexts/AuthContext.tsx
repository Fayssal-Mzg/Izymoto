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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // Créer l'utilisateur dans Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const newUser = userCredential.user;

    // Créer le document utilisateur dans Firestore
    await setDoc(doc(db, "users", newUser.uid), {
      uid: newUser.uid,
      email: newUser.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      isAdmin: false, // Par défaut, les nouveaux utilisateurs ne sont pas administrateurs
    });
  };

  const logIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Vérifier si l'utilisateur a un document dans Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      // Si l'utilisateur n'a pas de profil, en créer un (pour les comptes créés avant cette mise à jour)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAdmin: false,
      });
    } else {
      // Mettre à jour la date de dernière connexion
      await setDoc(
        doc(db, "users", user.uid),
        {
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Vérifier si l'utilisateur a un document dans Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      // Créer un profil pour l'utilisateur Google s'il n'existe pas encore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAdmin: false,
      });
    } else {
      // Mettre à jour la date de dernière connexion
      await setDoc(
        doc(db, "users", user.uid),
        {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL, // Mettre à jour la photo de profil si elle a changé
        },
        { merge: true }
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, logIn, logOut, signInWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
