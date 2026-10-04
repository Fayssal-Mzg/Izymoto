import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { pickBookingFields } from "@/lib/api/identity";
import { debitWalletForBooking, WalletError } from "@/lib/wallet/server";
import {
  getCompanyContextForUser,
  debitCompanyWalletForBooking,
} from "@/lib/wallet/companyServer";

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
    const { amountCents, bookingData: rawBookingData, clientToken, description } = body;
    const userId = auth.uid;
    if (!amountCents || !Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: "amountCents invalide" },
        { status: 400 }
      );
    }
    if (!rawBookingData || typeof rawBookingData !== "object") {
      return NextResponse.json(
        { error: "bookingData manquant" },
        { status: 400 }
      );
    }
    // Liste blanche des champs client ; email = jeton. Flux tout-portefeuille :
    // le prix enregistré est le montant réellement débité (la part chauffeur
    // doit correspondre à ce qui a été payé). lot 0.3 : recalcul serveur du montant.
    const bookingData = {
      ...pickBookingFields(rawBookingData),
      email: auth.email,
      prix: amountCents / 100,
      amountAuthorized: amountCents / 100,
      amountCaptured: amountCents / 100,
    };
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
