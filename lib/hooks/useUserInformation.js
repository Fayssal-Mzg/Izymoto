// hooks/useUserInformation.js - Version complète et robuste
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook personnalisé pour gérer les informations utilisateur
 * Fournit une interface complète pour récupérer, valider et sauvegarder
 * les données utilisateur depuis Firebase avec gestion d'erreurs robuste
 *
 * @returns {Object} État et fonctions pour gérer les informations utilisateur
 * @returns {string} name - Nom de l'utilisateur
 * @returns {Function} setName - Fonction pour modifier le nom
 * @returns {string} phone - Téléphone de l'utilisateur
 * @returns {Function} setPhone - Fonction pour modifier le téléphone
 * @returns {string} email - Email de l'utilisateur
 * @returns {Function} setEmail - Fonction pour modifier l'email
 * @returns {boolean} loading - État de chargement
 * @returns {Function} setLoading - Fonction pour modifier l'état de chargement
 * @returns {string} error - Message d'erreur
 * @returns {Function} setError - Fonction pour modifier l'erreur
 * @returns {Object} userData - Objet contenant {name, phone, email}
 * @returns {boolean} isUserDataComplete - True si toutes les données sont remplies
 * @returns {boolean} hasUnsavedChanges - True s'il y a des changements non sauvegardés
 * @returns {Function} validateUserData - Fonction de validation complète
 * @returns {Function} saveUserData - Fonction de sauvegarde
 * @returns {Function} resetUserData - Fonction de reset
 * @returns {Function} reloadUserData - Fonction de rechargement
 * @returns {Function} validateName - Validation spécifique du nom
 * @returns {Function} validatePhone - Validation spécifique du téléphone
 * @returns {Function} validateEmail - Validation spécifique de l'email
 */
export function useUserInformation() {
  // États des données utilisateur
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // États de l'interface utilisateur
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // États internes pour le suivi des changements
  const [initialData, setInitialData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState(0);

  // Refs pour éviter les effets multiples
  const dataFetchedRef = useRef(false);
  const saveTimeoutRef = useRef();
  const abortControllerRef = useRef();

  // Hooks externes
  const { user } = useAuth();

  // Données dérivées
  const userData = { name, phone, email };
  const isUserDataComplete = !!(name.trim() && phone.trim() && email.trim());
  const hasUnsavedChanges =
    JSON.stringify(userData) !== JSON.stringify(initialData);

  // Validation du nom
  const validateName = useCallback(
    (nameToValidate) => {
      const targetName = nameToValidate ?? name;

      if (!targetName.trim()) {
        return "Le nom complet est obligatoire";
      }

      if (targetName.trim().length < 2) {
        return "Le nom doit contenir au moins 2 caractères";
      }

      if (targetName.trim().length > 100) {
        return "Le nom ne peut pas dépasser 100 caractères";
      }

      // Vérification des caractères autorisés (lettres, espaces, apostrophes, tirets)
      if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(targetName)) {
        return "Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets";
      }

      return null;
    },
    [name]
  );

  // Validation du téléphone
  const validatePhone = useCallback(
    (phoneToValidate) => {
      const targetPhone = phoneToValidate ?? phone;

      if (!targetPhone.trim()) {
        return "Le numéro de téléphone est obligatoire";
      }

      // Nettoyage du numéro pour la validation
      const cleanedPhone = targetPhone.replace(/[\s.-]/g, "");

      // Validation pour les numéros français
      const frenchPhoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;

      if (!frenchPhoneRegex.test(cleanedPhone)) {
        return "Veuillez saisir un numéro de téléphone français valide";
      }

      return null;
    },
    [phone]
  );

  // Validation de l'email
  const validateEmail = useCallback(
    (emailToValidate) => {
      const targetEmail = emailToValidate ?? email;

      if (!targetEmail.trim()) {
        return "L'adresse email est obligatoire";
      }

      // Validation basique de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(targetEmail)) {
        return "Veuillez saisir une adresse email valide";
      }

      // Validation plus stricte
      if (targetEmail.length > 254) {
        return "L'adresse email est trop longue";
      }

      // Vérification des caractères interdits
      if (/[<>()[\]\\,;:\s@"]/.test(targetEmail.split("@")[0])) {
        return "L'adresse email contient des caractères non autorisés";
      }

      return null;
    },
    [email]
  );

  // Validation complète des données utilisateur
  const validateUserData = useCallback(() => {
    const nameError = validateName();
    if (nameError) return nameError;

    const phoneError = validatePhone();
    if (phoneError) return phoneError;

    const emailError = validateEmail();
    if (emailError) return emailError;

    return null;
  }, [validateName, validatePhone, validateEmail]);

  // Récupération des données Firebase avec gestion d'erreurs robuste
  const fetchUserData = useCallback(async () => {
    if (!user || dataFetchedRef.current) return;

    // Annuler toute requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError("");

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      // Vérifier si la requête a été annulée
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      let loadedData = { name: "", phone: "", email: "" };

      if (userDoc.exists()) {
        const userData = userDoc.data();
        loadedData = {
          name: userData.displayName || user.displayName || "",
          phone: userData.phoneNumber || "",
          email: userData.email || user.email || "",
        };
      } else {
        // Utiliser les données de l'authentification comme fallback
        loadedData = {
          name: user.displayName || "",
          phone: "",
          email: user.email || "",
        };
      }

      // Mettre à jour les états seulement si les données sont différentes
      if (JSON.stringify(loadedData) !== JSON.stringify(userData)) {
        setName(loadedData.name);
        setPhone(loadedData.phone);
        setEmail(loadedData.email);
        setInitialData(loadedData);
      }

      dataFetchedRef.current = true;
    } catch (err) {
      // Ignorer les erreurs d'annulation
      if (err.name === "AbortError") return;

      console.error(
        "Erreur lors de la récupération des données utilisateur:",
        err
      );

      // Message d'erreur utilisateur plus informatif
      if (err.code === "permission-denied") {
        setError("Accès refusé aux données utilisateur");
      } else if (err.code === "unavailable") {
        setError("Service temporairement indisponible. Veuillez réessayer.");
      } else {
        setError(
          "Erreur lors du chargement des données. Utilisation des valeurs par défaut."
        );
      }

      // Fallback sur les données d'authentification
      if (user) {
        setName(user.displayName || "");
        setEmail(user.email || "");
        setInitialData({
          name: user.displayName || "",
          phone: "",
          email: user.email || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  // Sauvegarde des données avec retry et validation
  const saveUserData = useCallback(async () => {
    if (!user) {
      throw new Error("Utilisateur non connecté");
    }

    // Validation avant sauvegarde
    const validationError = validateUserData();
    if (validationError) {
      throw new Error(validationError);
    }

    try {
      setLoading(true);
      setError("");

      const userRef = doc(db, "users", user.uid);
      const now = Date.now();

      const dataToSave = {
        displayName: name.trim(),
        phoneNumber: phone.trim(),
        email: email.trim().toLowerCase(),
        updatedAt: serverTimestamp(),
        lastModified: now,
      };

      // Vérifier si le document existe
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Mettre à jour le document existant
        await updateDoc(userRef, dataToSave);
      } else {
        // Créer un nouveau document
        await setDoc(userRef, {
          ...dataToSave,
          createdAt: serverTimestamp(),
          uid: user.uid,
        });
      }

      // Mettre à jour les données initiales après sauvegarde réussie
      setInitialData({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      });
      setLastSaveTimestamp(now);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);

      // Messages d'erreur spécifiques
      if (err.code === "permission-denied") {
        throw new Error(
          "Permissions insuffisantes pour sauvegarder les données"
        );
      } else if (err.code === "unavailable") {
        throw new Error(
          "Service temporairement indisponible. Veuillez réessayer."
        );
      } else {
        throw new Error(`Erreur lors de la sauvegarde: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user, name, phone, email, validateUserData]);

  // Rechargement forcé des données
  const reloadUserData = useCallback(async () => {
    dataFetchedRef.current = false;
    setInitialData({ name: "", phone: "", email: "" });
    await fetchUserData();
  }, [fetchUserData]);

  // Reset complet des données
  const resetUserData = useCallback(() => {
    setName("");
    setPhone("");
    setEmail("");
    setError("");
    setInitialData({ name: "", phone: "", email: "" });
    setLastSaveTimestamp(0);
    dataFetchedRef.current = false;

    // Annuler toute requête en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Nettoyer les timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  // Effet pour charger les données au montage
  useEffect(() => {
    if (user && !dataFetchedRef.current) {
      fetchUserData();
    }

    // Cleanup au démontage
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, fetchUserData]);

  // Sauvegarde automatique avec debounce (optionnel)
  useEffect(() => {
    if (!hasUnsavedChanges || !user) return;

    // Debounce de 2 secondes pour la sauvegarde automatique
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (validateUserData() === null) {
        saveUserData().catch((err) => {
          console.warn("Sauvegarde automatique échouée:", err);
          // Ne pas afficher l'erreur pour la sauvegarde automatique
        });
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, user, validateUserData, saveUserData]);

  return {
    // États des données
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,

    // États de l'interface
    loading,
    setLoading,
    error,
    setError,

    // États dérivés
    userData,
    isUserDataComplete,
    hasUnsavedChanges,

    // Fonctions utilitaires
    validateUserData,
    saveUserData,
    resetUserData,
    reloadUserData,

    // Fonctions de validation spécifiques
    validateName,
    validatePhone,
    validateEmail,
  };
}
