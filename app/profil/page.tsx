"use client";

import AdminButton from "@/components/AdminButton";
import { useAuth } from "@/contexts/AuthContext";
import { getUserBookings } from "@/lib/firebase/bookings";
import {
  updateProfile,
  updateEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ProfilPage() {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });
  const [isEditing, setIsEditing] = useState(false);

  // États pour les réservations
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // États pour la suppression de compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/connexion");
    }

    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setPhoneNumber(user.phoneNumber || "");

      // Charger les réservations