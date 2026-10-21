import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { asTimestamp, isPoolEligible, phoneKey, poolEntryFor } from "@/lib/rides/pool";
import { sendPush, type PushMessage, type PushSummary } from "@/lib/push/send";
import { PUSH_EVENTS } from "@/lib/push/tokens";

// Notifications branchées sur les transitions de course (lot 2.3, D-017). Chaque
// fonction est appelée APRÈS la validation de la transaction et ne lève jamais
// d'exception. Le texte s'affiche sur l'écran verrouillé : il n'est construit qu'à
// partir des zones, de la date, de la part chauffeur et de libellés fixes — jamais un
// nom, un téléphone, un e-mail, une adresse exacte ni une note.

export type ClientEventType = "ride_accepted" | "ride_started" | "ride_completed" | "payment_action_required";

const PARIS = "Europe/Paris";

function parisParts(ts: Timestamp, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, ...opts }).formatToParts(ts.toDate());
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

// « 12 nov. »
export function shortDate(ts: Timestamp): string {
  const p = parisParts(ts, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}`;
}

// « 12 nov. 14 h 30 »
export function shortDateTime(ts: Timestamp): string {
  const p = parisParts(ts, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${shortDate(ts)} ${p.hour} h ${p.minute}`;
}

const euros = (cents: number): string => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

export function rideAvailableMessage(bookingId: string, booking: DocumentData): PushMessage {
  const e = poolEntryFor(bookingId, booking);
  const when = e.reservationDate ? `, ${shortDateTime(e.reservationDate)}` : "";
  return {
    title: "Nouvelle course",
    body: `${e.departZone} → ${e.arriveeZone}${when} — ${euros(e.driverShareCents)} pour vous`,
    data: { type: "ride_available", bookingId },
  };
}

export function clientMessage(type: ClientEventType, bookingId: string, booking: DocumentData): PushMessage {
  const date = asTimestamp(booking.reservationDate);
  const of = date ? ` du ${shortDate(date)}` : "";
  const texts: Record<ClientEventType, { title: string; body: string }> = {
    ride_accepted: { title: "Course acceptée", body: `Votre course${of} est acceptée : votre chauffeur se prépare.` },
    ride_started: { title: "Course démarrée", body: "Votre course a démarré." },
    ride_completed: { title: "Course terminée", body: "Course terminée. Merci d'avoir choisi Izymoto." },
    payment_action_required: { title: "Paiement à confirmer", body: `Action requise : confirmez le paiement de votre course${of}.`.replace(/\.\.$/, ".") },
  };
  return { ...texts[type], data: { type, bookingId } };
}

const millisOf = (v: unknown): number => asTimestamp(v)?.toMillis() ?? 0;

// Libère la clé quand l'envoi a échoué en entier, pour qu'un rejeu puisse renvoyer.
async function releaseEvent(key: string): Promise<void> {
  await getAdminFirestore().collection(PUSH_EVENTS).doc(key).delete().catch((err) => console.error(`[push] clé non libérée (${key}):`, err));
}

// Libérer la clé seulement si Expo n'a rien reçu de façon certaine : après une réponse 2xx,
// rejouer risquerait un doublon pour tous les destinataires.
const failedEntirely = (s: PushSummary) => s.failed && s.accepted === 0 && !s.responded;

// Réserve la clé d'un événement : false si elle existe déjà (rejeu) ou si la réservation échoue.
async function claimEvent(key: string): Promise<boolean> {
  try {
    await getAdminFirestore().collection(PUSH_EVENTS).doc(key).create({ createdAt: Timestamp.now() });
    return true;
  } catch (err) {
    if ((err as { code?: number })?.code !== 6) console.error(`[push] clé d'événement non réservée (${key}):`, err);
    return false;
  }
}

const safeId = (id: string) => /^[A-Za-z0-9_-]{1,200}$/.test(id);

// Course entrée (ou revenue) au pool : tous les chauffeurs validés et en service, sauf le
// passager et le chauffeur d'origine (D-003).
// Convention de clé : `ride_available:{course}:{updatedAt ?? createdAt}`. Les chemins de
// création n'écrivent pas updatedAt (createdAt, stable) ; la libération l'écrit (nouvelle clé).
// Ne pas modifier updatedAt d'une course restée au pool : cela renverrait la notification.
export async function notifyRideAvailable(bookingId: string, opts: { excludeUids?: string[] } = {}): Promise<void> {
  try {
    if (!safeId(bookingId)) return;
    const db = getAdminFirestore();
    const booking = (await db.collection("bookings").doc(bookingId).get()).data();
    if (!booking || !isPoolEligible(booking)) return;
    const key = `ride_available:${bookingId}:${millisOf(booking.updatedAt ?? booking.createdAt)}`;
    if (!(await claimEvent(key))) return;

    const drivers = await db.collection("drivers").where("status", "==", "active").where("availability", "==", "online").get();
    const ridePhone = phoneKey(booking.phone);
    const excluded = new Set<string>([...(opts.excludeUids ?? []), ...(typeof booking.userId === "string" ? [booking.userId] : [])]);
    const uids = drivers.docs
      .filter((d) => !excluded.has(d.id) && !(ridePhone !== null && ridePhone === phoneKey(d.data().phone)))
      .map((d) => d.id);
    const summary = await sendPush(uids, "chauffeur", rideAvailableMessage(bookingId, booking));
    // Après une libération, la clé reste : un rattrapage pourrait notifier le chauffeur qui a libéré (D-003).
    if (failedEntirely(summary) && !opts.excludeUids?.length) await releaseEvent(key);
  } catch (err) {
    console.error(`[push] notification « nouvelle course » impossible pour ${bookingId}:`, err);
  }
}

export async function notifyRidesAvailable(...bookingIds: Array<string | null | undefined>): Promise<void> {
  for (const id of bookingIds) if (id) await notifyRideAvailable(id);
}

// Événement destiné au client de la course (`userId`). Invité (sans compte) : rien.
// `at` = horodatage de la transition, qui entre dans la clé anti-doublon.
// Renvoie false seulement si l'envoi a échoué en entier (clé libérée, à retenter).
export async function notifyRideStatus(
  type: ClientEventType,
  bookingId: string,
  booking: DocumentData,
  at: Timestamp
): Promise<boolean> {
  try {
    const userId = booking.userId;
    if (typeof userId !== "string" || !userId || userId.startsWith("guest_") || !safeId(bookingId)) return true;
    const key = `${type}:${bookingId}:${at.toMillis()}`;
    if (!(await claimEvent(key))) return true;
    if (failedEntirely(await sendPush([userId], "client", clientMessage(type, bookingId, booking)))) {
      await releaseEvent(key);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[push] notification ${type} impossible pour ${bookingId}:`, err);
    return false;
  }
}
