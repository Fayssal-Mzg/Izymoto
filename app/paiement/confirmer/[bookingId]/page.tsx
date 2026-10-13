"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStripe } from "@/lib/stripe";

// lot 1.1 : l'empreinte d'une course réservée à l'avance n'a pas pu être posée sur la
// carte enregistrée (refus ou authentification demandée par la banque). Le client
// confirme ici, en session, avec la même carte ou une autre.

type HoldState =
  | "loading"
  | "action_required"
  | "authorized"
  | "pending"
  | "cancelled"
  | "unavailable"
  | "not_found"
  | "error";

interface HoldInfo {
  state: HoldState;
  clientSecret?: string;
  reservationId?: string;
  depart?: string;
  arrivee?: string;
  reservationDate?: string | null;
  amountCents?: number;
}

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" })
    : "";

function ConfirmForm({ amountCents, onDone }: { amountCents: number; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setSubmitting(false);
    if (stripeError) {
      setError(stripeError.message ?? "Paiement refusé.");
      return;
    }
    if (paymentIntent?.status === "requires_capture") onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-700 bg-red-50 border-l-4 border-red-400 p-3 rounded">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-black text-white font-medium disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Réserver {(amountCents / 100).toFixed(2).replace(".", ",")} €
      </button>
      <p className="text-xs text-gray-500">
        Le montant est seulement réservé sur votre carte : il ne sera débité qu'après la course.
      </p>
    </form>
  );
}

export default function ConfirmPaymentPage({ params }: { params: { bookingId: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState<HoldInfo>({ state: "loading" });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/deferred-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: params.bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      // 404 : réservation absente OU liée à un autre compte (le serveur ne distingue pas).
      setInfo(res.ok ? data : { state: res.status === 404 ? "not_found" : "error" });
    } catch {
      setInfo({ state: "error" });
    }
  }, [user, params.bookingId]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/connexion?redirectTo=${encodeURIComponent(`/paiement/confirmer/${params.bookingId}`)}`);
      return;
    }
    load();
  }, [user, loading, load, router, params.bookingId]);

  return (
    <main className="min-h-[70vh] bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmer le paiement de votre course</h1>

        {(info.depart || info.reservationDate) && (
          <div className="bg-gray-50 rounded-lg p-4 my-5 text-sm text-gray-700 space-y-1">
            {info.reservationId && <p className="text-gray-500">Référence : {info.reservationId}</p>}
            {info.depart && <p>{info.depart} → {info.arrivee}</p>}
            {info.reservationDate && <p>{formatDate(info.reservationDate)}</p>}
          </div>
        )}

        {info.state === "loading" && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        )}

        {info.state === "action_required" && info.clientSecret && (
          <>
            <p className="text-sm text-gray-600 mb-5">
              Votre banque a refusé la réservation du montant sur la carte enregistrée ou demande votre
              confirmation. Validez avec la même carte ou une autre.
            </p>
            <Elements stripe={getStripe()} options={{ clientSecret: info.clientSecret, appearance: { theme: "stripe" } }}>
              <ConfirmForm amountCents={info.amountCents ?? 0} onDone={load} />
            </Elements>
          </>
        )}

        {info.state === "authorized" && (
          <div className="flex items-start gap-3 text-green-800 bg-green-50 rounded-lg p-4">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">C'est confirmé : votre course est garantie. Le montant sera débité après la course.</p>
          </div>
        )}

        {info.state === "pending" && (
          <p className="text-sm text-gray-600">
            Aucune action n'est nécessaire pour le moment : le montant sera réservé sur votre carte quelques jours
            avant la course.
          </p>
        )}

        {info.state === "cancelled" && <p className="text-sm text-gray-600">Cette réservation a été annulée.</p>}

        {info.state === "not_found" && (
          <p className="text-sm text-gray-600">
            Cette réservation n'est pas liée au compte connecté. Déconnectez-vous puis reconnectez-vous avec le
            compte utilisé pour réserver.
          </p>
        )}

        {(info.state === "unavailable" || info.state === "error") && (
          <p className="text-sm text-gray-600">
            Nous ne pouvons pas confirmer ce paiement en ligne. Contactez-nous au +33 6 49 50 25 25 ou à
            contact@izymoto.com.
          </p>
        )}

        <Link href="/profil" className="inline-block mt-6 text-sm text-gray-700 underline">
          Voir mes réservations
        </Link>
      </div>
    </main>
  );
}
