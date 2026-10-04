import { getAdminFirestore } from "@/lib/firebase/admin-server";

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
