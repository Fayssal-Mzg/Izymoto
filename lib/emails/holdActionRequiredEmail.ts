import { Resend } from "resend";

// E-mail envoyé quand l'empreinte différée (lot 1.1) n'a pas pu être posée sur la
// carte enregistrée : refus de la banque ou authentification demandée.

export interface HoldActionRequiredInput {
  to: string;
  clientName?: string;
  bookingId: string;
  reservationId?: string;
  depart?: string;
  arrivee?: string;
  reservationDate: Date | null;
  amountEur: number;
}

// Resend ne lève pas d'erreur en cas de refus (domaine non vérifié, clé invalide…) :
// il renvoie `{ error }`. On le transforme en exception pour ne pas marquer l'e-mail
// comme envoyé à tort.
async function checked<T extends { error: unknown }>(sending: Promise<T>): Promise<T> {
  const result = await sending;
  if (result.error) throw new Error(`Resend : ${JSON.stringify(result.error)}`);
  return result;
}

// Origine du site pour les liens des e-mails. Tolère une variable saisie avec des
// guillemets, des espaces ou une barre finale ; repli sur izymoto.com si invalide.
function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/^["'<]+|["'>]+$/g, "");
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch {
    // valeur absente ou invalide
  }
  return "https://izymoto.com";
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Alerte à l'équipe Izymoto : la course n'est pas garantie tant que le client n'a
// pas confirmé ; l'admin décide (appel du client, annulation) avant le départ.
// `abandoned` : tentatives arrêtées (départ passé ou course terminée) sans empreinte.
export async function sendHoldAdminAlertEmail(input: Omit<HoldActionRequiredInput, "to"> & { abandoned?: boolean }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquant");
  const when = input.reservationDate
    ? input.reservationDate.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" })
    : "date inconnue";
  const ref = escapeHtml(input.reservationId || input.bookingId);
  const trajet = input.depart && input.arrivee ? `${escapeHtml(input.depart)} → ${escapeHtml(input.arrivee)}` : "";
  return checked(new Resend(apiKey).emails.send({
    from: "IzyMoto <contact@izymoto.com>",
    to: ["contact@izymoto.com"],
    subject: input.abandoned
      ? `Course ${input.reservationId || input.bookingId} sans paiement : tentatives arrêtées`
      : `Empreinte refusée — course ${input.reservationId || input.bookingId} non garantie`,
    html: input.abandoned
      ? `<p>Aucune empreinte n'a pu être posée pour cette course (${input.amountEur.toFixed(2).replace(".", ",")} €) et le départ est passé ou la course est terminée : les tentatives automatiques sont arrêtées.</p>
<p>Référence : ${ref}<br/>${trajet}<br/>${escapeHtml(when)}</p>
<p>Si la course a eu lieu, elle n'est pas payée : contactez le client.</p>`
      : `<p>L'empreinte de ${input.amountEur.toFixed(2).replace(".", ",")} € n'a pas pu être posée sur la carte enregistrée.</p>
<p>Référence : ${ref}<br/>${trajet}<br/>${escapeHtml(when)}</p>
<p>Le client a reçu un e-mail pour confirmer le paiement ; une nouvelle tentative a lieu chaque matin. Sans confirmation avant le départ, la course n'est pas payée : contactez le client ou annulez la course depuis le back-office.</p>`,
  }));
}

export async function sendHoldActionRequiredEmail(input: HoldActionRequiredInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquant");
  const link = `${siteOrigin()}/paiement/confirmer/${encodeURIComponent(input.bookingId)}`;
  const name = escapeHtml(input.clientName?.trim() || "Bonjour");
  const when = input.reservationDate
    ? input.reservationDate.toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        dateStyle: "full",
        timeStyle: "short",
      })
    : "";
  const trajet =
    input.depart && input.arrivee ? `${escapeHtml(input.depart)} → ${escapeHtml(input.arrivee)}` : "";
  const ref = escapeHtml(input.reservationId || input.bookingId);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Confirmez le paiement de votre course</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #0b1620; padding: 24px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Confirmez le paiement de votre course</h1>
    </div>
    <div style="padding: 28px;">
      <p style="margin: 0 0 16px 0;">${name},</p>
      <p style="margin: 0 0 16px 0;">
        Pour garantir votre course, nous devions réserver ${input.amountEur.toFixed(2).replace(".", ",")} € sur la carte enregistrée lors de votre réservation.
        Votre banque a refusé l'opération ou demande votre confirmation.
      </p>
      <div style="background-color: #f7f7f7; border-radius: 6px; padding: 14px 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #666;">Référence : ${ref}</p>
        ${trajet ? `<p style="margin: 0; font-size: 13px; color: #666;">${trajet}</p>` : ""}
        ${when ? `<p style="margin: 0; font-size: 13px; color: #666;">${escapeHtml(when)}</p>` : ""}
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="display: inline-block; background-color: #2dd4bf; color: #0b1620; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 700;">
          Confirmer le paiement
        </a>
      </div>
      <p style="margin: 0; font-size: 14px; color: #555;">
        Le montant est seulement réservé : il ne sera débité qu'après la course. Sans confirmation, votre course ne pourra pas être garantie.
        Une question ? Répondez à cet e-mail ou appelez-nous au +33 6 49 50 25 25.
      </p>
    </div>
  </div>
</body>
</html>`;

  return checked(new Resend(apiKey).emails.send({
    from: "IzyMoto <contact@izymoto.com>",
    to: [input.to.trim()],
    subject: "Action requise : confirmez le paiement de votre course IzyMoto",
    replyTo: "contact@izymoto.com",
    html,
  }));
}
