import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { parseReservationDate } from "@/lib/pricing";

const authHost = () => process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

export interface TestUser {
  uid: string;
  email: string;
  idToken: string;
}

// Crée un utilisateur dans l'émulateur Auth et renvoie un vrai ID token.
export async function createAuthUser(email: string, password = "Passw0rd!test"): Promise<TestUser> {
  const res = await fetch(
    `http://${authHost()}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`signUp émulateur Auth KO (${res.status}) : ${await res.text()}`);
  const json = (await res.json()) as { localId: string; idToken: string };
  return { uid: json.localId, email, idToken: json.idToken };
}

// Marque l'email d'un compte comme vérifié dans l'émulateur Auth (API REST admin,
// en-tête "Bearer owner").
export async function markEmailVerified(uid: string): Promise<void> {
  const res = await fetch(
    `http://${authHost()}/identitytoolkit.googleapis.com/v1/projects/demo-izymoto/accounts:update`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer owner" },
      body: JSON.stringify({ localId: uid, emailVerified: true }),
    }
  );
  if (!res.ok) throw new Error(`accounts:update émulateur Auth KO (${res.status}) : ${await res.text()}`);
}

// Se reconnecte (email + mot de passe) pour obtenir un jeton neuf, reflétant l'état courant du compte.
export async function signInAgain(email: string, password = "Passw0rd!test"): Promise<TestUser> {
  const res = await fetch(
    `http://${authHost()}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`signIn émulateur Auth KO (${res.status}) : ${await res.text()}`);
  const json = (await res.json()) as { localId: string; idToken: string };
  return { uid: json.localId, email, idToken: json.idToken };
}

// Crée un compte dont l'email est vérifié, avec un jeton portant email_verified = true.
export async function createVerifiedAuthUser(email: string, password = "Passw0rd!test"): Promise<TestUser> {
  const u = await createAuthUser(email, password);
  await markEmailVerified(u.uid);
  return signInAgain(email, password);
}

// Vide les comptes et les documents de l'émulateur (projet demo-izymoto uniquement).
export async function resetEmulators(): Promise<void> {
  const project = "demo-izymoto";
  await fetch(`http://${authHost()}/emulator/v1/projects/${project}/accounts`, { method: "DELETE" });
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  await fetch(`http://${fsHost}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: "DELETE" });
}

export async function seedUserDoc(uid: string, data: Record<string, unknown>): Promise<void> {
  await getAdminFirestore().collection("users").doc(uid).set(data);
}

// Fabrique une Request pour appeler directement un handler de route Next.js.
export function jsonRequest(
  path: string,
  opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {}
): Request {
  const headers: Record<string, string> = { "content-type": "application/json", ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return new Request(`http://localhost${path}`, {
    method: opts.method ?? "POST",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

// ---------------------------------------------------------------- lot 0.3 : prix serveur

// Prochaine date (au moins `minDaysAhead` jours dans le futur) tombant un des jours
// demandés (0 = dimanche … 6 = samedi), à l'heure murale de Paris "HH:MM" (sans fuseau :
// c'est le format d'un <input type="datetime-local">, interprété à Paris par le serveur).
export function futureParisDate(weekdays: number[], time: string, minDaysAhead = 10): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (!weekdays.includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.toISOString().slice(0, 10)}T${time}`;
}

// Paramètres de course réalistes : Paris -> Orly (forfait 76 €), un jour de semaine
// à 14h (aucune majoration), sans priorité. Prix serveur attendu : 76 € = 7600 centimes.
export const VALID_RIDE_TOTAL_CENTS = 7600;
export function validRide(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    depart: "10 Rue de Rivoli, 75001 Paris",
    arrivee: "Aéroport d'Orly, 94390 Orly",
    distance: 20,
    originLat: 48.8556,
    originLng: 2.3606,
    destLat: 48.7262,
    destLng: 2.3652,
    reservationDate: futureParisDate([1, 2, 3, 4], "14:00"),
    prioriteReservation: false,
    ...over,
  };
}

// Métadonnées de course telles que create-payment-intent les pose sur le PaymentIntent
// (les routes de finalisation exigent qu'elles correspondent à la course finalisée).
export function rideMeta(ride: Record<string, unknown> = validRide()): Record<string, string> {
  const date = parseReservationDate(ride.reservationDate);
  return {
    depart: String(ride.depart).trim(),
    arrivee: String(ride.arrivee).trim(),
    ...(date ? { reservationDate: date.toISOString() } : {}),
    prioriteReservation: String(ride.prioriteReservation === true),
  };
}

// Champ `created` d'un PaymentIntent Stripe (secondes) : instant de référence du recalcul.
export const piCreatedNow = (): number => Math.floor(Date.now() / 1000);
