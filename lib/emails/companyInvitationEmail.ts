import { Resend } from "resend";

export interface CompanyInvitationInput {
  to: string;
  companyName: string;
  inviteUrl: string;
  monthlyBudgetEur?: number;
  invitedByEmail?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Email d'invitation d'un collaborateur à rejoindre le portefeuille entreprise.
// Même pattern que reviewRequestEmail.ts (Resend, template HTML inline).
export async function sendCompanyInvitationEmail(input: CompanyInvitationInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant");
  }
  if (!input.to || !input.to.includes("@")) {
    throw new Error(`Email destinataire invalide: ${input.to}`);
  }

  const resend = new Resend(apiKey);
  const rawCompany = input.companyName || "votre entreprise";
  const company = escapeHtml(rawCompany);
  const subjectCompany = rawCompany.replace(/[\r\n]+/g, " ");
  const budgetLine =
    input.monthlyBudgetEur && input.monthlyBudgetEur > 0
      ? `<p style="margin: 0; color: #666; font-size: 13px;">Budget mensuel attribué : <strong>${input.monthlyBudgetEur} €</strong></p>`
      : `<p style="margin: 0; color: #666; font-size: 13px;">Budget mensuel : illimité (dans la limite du solde entreprise)</p>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Invitation ${company} sur IzyMoto</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background-color: #06121A; padding: 28px 20px; text-align: center;">
      <h1 style="margin: 0; color: #2DD4BF; font-size: 24px; font-weight: 700;">Vous êtes invité·e sur IzyMoto Entreprises</h1>
    </div>
    <div style="padding: 32px 28px;">
      <p style="margin: 0 0 16px 0;">Bonjour,</p>
      <p style="margin: 0 0 16px 0;">
        <strong>${company}</strong> vous invite à rejoindre son compte entreprise IzyMoto.
        Vous pourrez réserver vos trajets en moto-taxi à Paris et en Île-de-France,
        réglés directement sur le portefeuille de l'entreprise — sans avance de frais.
      </p>
      <div style="background-color: #f7f7f7; border-radius: 6px; padding: 14px 16px; margin: 20px 0;">
        ${budgetLine}
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${escapeHtml(input.inviteUrl)}"
           style="display: inline-block; background-color: #2DD4BF; color: #06121A; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 16px;">
          Rejoindre ${company}
        </a>
      </div>
      <p style="margin: 16px 0 0 0; font-size: 13px; color: #888;">
        Ce lien d'invitation est valable 14 jours. Si vous n'avez pas encore de compte
        IzyMoto, vous pourrez en créer un en quelques secondes.
      </p>
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
    subject: `${subjectCompany} vous invite sur IzyMoto Entreprises`,
    replyTo: "contact@izymoto.com",
    html,
  });
}
