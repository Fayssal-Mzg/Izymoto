import { NextResponse } from "next/server";
import {
  computeServerQuote,
  PAYMENT_QUOTE_OPTIONS,
  type QuoteOptions,
  type ServerQuote,
} from "@/lib/pricing";

// Aides communes aux routes qui engagent un montant (create-payment-intent,
// debit-for-booking, finalize-hybrid-booking) ou l'affichent (send-devis).

export type QuoteOrResponse =
  | { quote: ServerQuote; response?: undefined; failure?: undefined }
  | {
      quote?: undefined;
      response: NextResponse;
      failure: { status: number; code: string; error: string };
    };

// Recalcule le prix côté serveur. En cas de paramètres invalides : réponse 400
// { error, code } prête à renvoyer.
export function quoteOrResponse(
  raw: unknown,
  options: QuoteOptions = PAYMENT_QUOTE_OPTIONS,
  now: Date = new Date()
): QuoteOrResponse {
  const result = computeServerQuote(raw, options, now);
  if (result.ok) return { quote: result.quote };
  return {
    failure: { status: result.status, code: result.code, error: result.error },
    response: NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    ),
  };
}

export function priceChangedBody(
  quote: ServerQuote,
  previousTotalCents: number | null,
  holdReleased = false
) {
  return {
    error: "Le prix de la course a changé. Veuillez vérifier le nouveau tarif avant de confirmer.",
    code: "PRICE_CHANGED",
    newTotalCents: quote.totalCents,
    newTotal: quote.total,
    previousTotalCents,
    // true seulement si l'empreinte carte a été libérée par cette réponse.
    holdReleased,
    breakdown: {
      prixBase: quote.prixBase,
      majorations: quote.majorations,
      supplementPriorite: quote.supplementPriorite,
    },
  };
}

// Prix affiché au client (champ `displayedTotalCents`, en centimes). Il ne sert
// JAMAIS de montant à débiter : il est seulement comparé au total serveur.
// - absent : pas de comparaison (le total serveur s'applique) ;
// - présent et différent du total serveur : 409 PRICE_CHANGED avec le nouveau prix ;
// - présent mais non numérique : 400.
export function checkDisplayedPrice(
  body: unknown,
  quote: ServerQuote
): NextResponse | null {
  const displayed = (body as Record<string, unknown> | null)?.displayedTotalCents;
  if (displayed === undefined || displayed === null) return null;
  if (typeof displayed !== "number" || !Number.isFinite(displayed)) {
    return NextResponse.json(
      { error: "Prix affiché invalide.", code: "INVALID_DISPLAYED_PRICE" },
      { status: 400 }
    );
  }
  if (Math.round(displayed) !== quote.totalCents) {
    return NextResponse.json(priceChangedBody(quote, Math.round(displayed)), {
      status: 409,
    });
  }
  return null;
}
