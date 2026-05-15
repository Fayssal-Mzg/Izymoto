import { Resend } from "resend";

// TODO SEO/GBP : remplacer par le Place ID de la fiche "izymoto taxi"
// (récupérable via https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
// ou directement dans l'URL de la fiche Google Business Profile).
// Tant que la valeur reste "REPLACE_ME", le lien tombe sur une recherche Google
// générique (fallback safe) plutôt que sur une URL cassée.
const GBP_PLACE_ID = "REPLACE_ME";

function buildReviewUrl(): string {
  if (GBP_PLACE_ID && GBP_PLACE_ID !== "REPLACE_ME") {
    return `https://search.google.com/local/writereview?placeid=${GBP_PLACE_ID}`;
  }
  return "https://www.google.com/search?q=izymoto+taxi+paris";
}

export interface ReviewRequestInput {
  to: string;
  clientName?: string;
  bookingId?: string;
  depart?: string;
  arrivee?: string;
}

export async function sendReviewRequestEmail(input: ReviewRequestInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant");
  }
  if (!input.to || !input.to.includes("@")) {
    throw new Error(`Email destinataire invalide: ${input.to}`);
  }

  const resend = new Resend(apiKey);
  const reviewUrl = buildReviewUrl();
  const safeName = input.clientName?.trim() || "Cher client";
  const refLine = input.bookingId
    ? `<p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">Référence : ${input.bookingId}</p>`
    : "";
  const trajetLine =
    input.depart && input.arrivee
      ? `<p style="margin: 0; color: #666; font-size: 13px;">${input.depart} → ${input.arrivee}</p>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Votre avis nous aide énormément</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background-color: #ffc107; padding: 28px 20px; text-align: center;">
      <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">Merci d'avoir voyagé avec IzyMoto</h1>
    </div>
    <div style="padding: 32px 28px;">
      <p style="margin: 0 0 16px 0;">Bonjour ${safeName},</p>
      <p style="margin: 0 0 16px 0;">
        Votre course est terminée et nous espérons sincèrement que tout s'est bien passé.
      </p>
      <p style="margin: 0 0 24px 0;">
        Si vous avez 30 secondes, un <strong>avis sur Google</strong> nous aide énormément à faire connaître notre service de moto-taxi à Paris. Chaque retour compte pour notre petite équipe.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${reviewUrl}"
           style="display: inline-block; background-color: #ffc107; color: #1a1a1a; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px;">
          ⭐ Laisser un avis Google
        </a>
      </div>
      ${refLine || trajetLine ? `<div style="background-color: #f7f7f7; border-radius: 6px; padding: 14px 16px; margin: 20px 0;">${refLine}${trajetLine}</div>` : ""}
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #555;">
        Un souci à signaler ou un retour moins positif ? Répondez directement à cet email ou écrivez-nous à <a href="mailto:contact@izymoto.com" style="color: #1a1a1a;">contact@izymoto.com</a> — nous traitons chaque message personnellement.
      </p>
      <p style="margin: 16px 0 0 0;">À très bientôt sur la route,<br/>L'équipe IzyMoto</p>
    </div>
    <div style="padding: 18px; background-color: #f7f7f7; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee;">
      IzyMoto — Moto-taxi à Paris &amp; Île-de-France · +33 6 49 50 25 25
    </div>
  </div>
</body>
</html>`;

  return resend.emails.send({
    from: "IzyMoto <contact@izymoto.com>",
    to: [input.to.trim()],
    subject: "Votre course IzyMoto s'est bien passée ? Un avis Google nous aiderait beaucoup 🙏",
    replyTo: "contact@izymoto.com",
    html,
  });
}
