// Listes blanches des champs acceptés depuis le client. Tout le reste (identité,
// statut, paiement, attribution chauffeur...) est posé par le serveur : un
// client ne peut jamais fournir userId, companyId, driverId, paymentId,
// amountAuthorized, amountCaptured, status, email, etc.

// Champs descriptifs de la course lus par le back-office et l'espace chauffeur
// (lib/firebase/dispatch.ts, admin.ts). `prix` reste accepté TEMPORAIREMENT :
// lot 0.3 = recalcul serveur du prix.
const BOOKING_FIELDS = [
  "depart",
  "arrivee",
  "distance",
  "duree",
  "prix", // lot 0.3 : à recalculer côté serveur
  "name",
  "phone",
  "notes",
  "prioriteReservation",
  "reservationDate",
  "dateFormatted",
] as const;

// Clés descriptives (non personnelles) copiées dans la metadata du PaymentIntent.
const PAYMENT_INTENT_METADATA_FIELDS = [
  "depart",
  "arrivee",
  "distance",
  "duree",
  "reservationDate",
  "prioriteReservation",
] as const;

function pick(
  data: unknown,
  keys: readonly string[],
  maxStringLength: number
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!data || typeof data !== "object") return out;
  const src = data as Record<string, unknown>;
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, maxStringLength);
  }
  return out;
}

export function pickBookingFields(data: unknown): Record<string, unknown> {
  return pick(data, BOOKING_FIELDS, 1000);
}

export function pickPaymentIntentMetadata(data: unknown): Record<string, unknown> {
  return pick(data, PAYMENT_INTENT_METADATA_FIELDS, 500);
}
