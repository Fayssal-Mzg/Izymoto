import { timingSafeEqual } from "node:crypto";

// Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> » ; tout autre appel est refusé
// (et tout appel, si CRON_SECRET n'est pas configuré).
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
