import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
import { quoteOrResponse, checkDisplayedPrice } from "@/lib/api/pricing";
import { debitWalletForBooking, WalletError } from "@/lib/wallet/server";
import {
  getCompanyContextForUser,
  debitCompanyWalletForBooking,
} from "@/lib/wallet/companyServer";
import { refreshRidePoolSafe } from "@/lib/rides/pool";

function walletErrorStatus(code) {
  switch (code) {
    case "INSUFFICIENT_BALANCE":
    case "BUDGET_EXCEEDED":
      return 402;
    case "WALLET_NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "CONFLICT":
      return 409;
    default:
      return 400;
  }
}

// Débite le wallet d'un user pour payer une course (cas "tout wallet").
// Crée le booking dans la même transaction Firestore atomique.
// Idempotent via clientToken (UUID généré côté front).

export async function POST(request) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }

  try {
    const body = await request.json();
    // lot 0.3 : amountCents / prix / amountAuthorized envoyés par le client sont
    // IGNORÉS. Le montant débité est recalculé ici à partir des paramètres de la
    // course (bookingData : adresses, distance, coordonnées, date, priorité).
    const { bookingData: rawBookingData, clientToken, description } = body;
    const userId = auth.uid;
    if (!rawBookingData || typeof rawBookingData !== "object") {
      return NextResponse.json(
        { error: "bookingData manquant" },
        { status: 400 }
      );
    }
    const { quote, response: quoteError } = quoteOrResponse(rawBookingData);
    if (quoteError) return quoteError;
    const mismatch = checkDisplayedPrice(body, quote);
    if (mismatch) return mismatch;

    const amountCents = quote.totalCents;
    // Liste blanche des champs client ; email = jeton. Flux tout-portefeuille :
    // prix, montants et paramètres validés viennent du calcul serveur.
    const bookingData = {
      ...pickBookingFields(rawBookingData),
      depart: quote.depart,
      arrivee: quote.arrivee,
      prioriteReservation: quote.prioriteReservation,
      ...(quote.reservationDateIso ? { reservationDate: quote.reservationDateIso } : {}),
      email: auth.email,
      prix: quote.total,
      amountAuthorized: quote.total,
      amountCaptured: quote.total,
    };
    if (quote.distanceKm !== null) bookingData.distance = quote.distanceKm;
    else delete bookingData.distance;
    // Le préfixe "hybrid_" est réservé aux ledgers hybrides (clé dérivée du PaymentIntent).
    if (
      !clientToken ||
      typeof clientToken !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(clientToken) ||
      clientToken.startsWith("hybrid_")
    ) {
      return NextResponse.json(
        { error: "clientToken manquant ou invalide (idempotence)" },
        { status: 400 }
      );
    }

    // Source de paiement résolue côté serveur depuis l'uid : société si l'user
    // est membre actif d'une entreprise, sinon wallet perso.
    const company = await getCompanyContextForUser(userId).catch(() => null);

    const result = company
      ? await debitCompanyWalletForBooking({
          companyId: company.companyId,
          actorUid: userId,
          actorEmail: company.member.email ?? null,
          amountCents,
          bookingData,
          clientToken,
          description,
        })
      : await debitWalletForBooking({
          userId,
          amountCents,
          bookingData,
          clientToken,
          description,
        });

    await refreshRidePoolSafe(result?.bookingId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WalletError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: walletErrorStatus(err.code) }
      );
    }
    console.error("[wallet/debit-for-booking] erreur:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
