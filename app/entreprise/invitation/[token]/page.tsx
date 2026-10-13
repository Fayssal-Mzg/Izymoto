"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { Building2, Loader2, AlertCircle, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Preview {
  companyName: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
  expired: boolean;
}

export default function InvitationPage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [verifSent, setVerifSent] = useState(false);
  const [sendingVerif, setSendingVerif] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/company/invitation/${encodeURIComponent(token)}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setPreview(data.invitation);
      } catch {
        setError("Impossible de charger l'invitation.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const accept = useCallback(async (refresh = false) => {
    if (!user) return;
    setAccepting(true);
    setError(null);
    setErrorCode(null);
    try {
      if (refresh) await user.reload();
      // refresh = true : jeton rechargé pour refléter email_verified à jour.
      const idToken = await user.getIdToken(refresh);
      const res = await fetch("/api/company/invitation/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setErrorCode("EMAIL_NOT_VERIFIED");
          setError(
            "Vous devez vérifier votre adresse email avant d'accepter cette invitation."
          );
          setAccepting(false);
          return;
        }
        if (data.code === "EMAIL_MISMATCH") {
          setErrorCode("EMAIL_MISMATCH");
          setError(
            `Cette invitation a été envoyée à ${
              preview?.email || "une autre adresse"
            } ; connectez-vous avec cette adresse.`
          );
          setAccepting(false);
          return;
        }
        throw new Error(data.error || "Erreur");
      }
      router.push("/profil/entreprise");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setAccepting(false);
    }
  }, [user, token, router, preview]);

  const sendVerification = useCallback(async () => {
    if (!user) return;
    setSendingVerif(true);
    try {
      await sendEmailVerification(user);
      setVerifSent(true);
    } catch {
      setError(
        "Impossible d'envoyer l'email de vérification pour le moment. Réessayez dans quelques minutes."
      );
    } finally {
      setSendingVerif(false);
    }
  }, [user]);

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-950" />
      </div>
    );
  }

  const invalid =
    notFound ||
    !preview ||
    preview.status !== "pending" ||
    preview.expired;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-navy-100 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-navy-950 flex items-center justify-center mx-auto mb-5">
          <Building2 className="h-7 w-7 text-mint-400" />
        </div>

        {invalid ? (
          <>
            <h1 className="text-xl font-bold text-navy-950 mb-2">
              Invitation indisponible
            </h1>
            <p className="text-navy-600 text-sm mb-6">
              {notFound || !preview
                ? "Cette invitation n'existe pas."
                : preview.expired
                ? "Cette invitation a expiré."
                : "Cette invitation a déjà été utilisée ou révoquée."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-mint-400 text-navy-950 font-semibold px-6 py-3 rounded-lg hover:bg-mint-300 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-navy-950 mb-2">
              Rejoindre {preview.companyName}
            </h1>
            <p className="text-navy-600 text-sm mb-6">
              Vous êtes invité·e à rejoindre le compte entreprise{" "}
              <strong>{preview.companyName}</strong> sur IzyMoto
              {preview.email ? ` (${preview.email})` : ""}.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-800 text-left">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {user && errorCode === "EMAIL_NOT_VERIFIED" && (
              <div className="mb-4 space-y-3">
                {verifSent ? (
                  <p className="text-sm text-navy-600">
                    Email envoyé à {user.email}. Cliquez sur le lien reçu, puis revenez ici.
                  </p>
                ) : (
                  <button
                    onClick={sendVerification}
                    disabled={sendingVerif}
                    className="w-full border border-navy-200 text-navy-950 font-semibold px-6 py-3 rounded-lg hover:bg-cream-50 transition-colors disabled:opacity-50"
                  >
                    Recevoir l'email de vérification
                  </button>
                )}
                {verifSent && (
                  <button
                    onClick={() => accept(true)}
                    disabled={accepting}
                    className="w-full border border-navy-200 text-navy-950 font-semibold px-6 py-3 rounded-lg hover:bg-cream-50 transition-colors disabled:opacity-50"
                  >
                    J'ai vérifié mon email, réessayer
                  </button>
                )}
              </div>
            )}

            {user ? (
              <button
                onClick={() => accept(errorCode === "EMAIL_NOT_VERIFIED")}
                disabled={accepting}
                className="inline-flex items-center justify-center gap-2 bg-mint-400 text-navy-950 font-semibold px-6 py-3 rounded-lg hover:bg-mint-300 transition-colors disabled:opacity-50 w-full"
              >
                {accepting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Accepter l'invitation
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-navy-600">
                  Connectez-vous ou créez un compte pour accepter.
                </p>
                <Link
                  href={`/connexion?redirectTo=${encodeURIComponent(
                    `/entreprise/invitation/${token}`
                  )}`}
                  className="block w-full bg-navy-950 text-white font-semibold px-6 py-3 rounded-lg hover:bg-navy-800 transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href={`/inscription?redirectTo=${encodeURIComponent(
                    `/entreprise/invitation/${token}`
                  )}`}
                  className="block w-full border border-navy-200 text-navy-950 font-semibold px-6 py-3 rounded-lg hover:bg-cream-50 transition-colors"
                >
                  Créer un compte
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
