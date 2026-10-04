import { NextResponse } from "next/server";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";
import { createInvitation } from "@/lib/company/invitations";
import { sendCompanyInvitationEmail } from "@/lib/emails/companyInvitationEmail";
import { WalletError } from "@/lib/wallet/server";

// Invite un collaborateur (owner uniquement). Crée l'invitation puis envoie
// l'email Resend avec le lien d'acceptation.
// Body : { email, monthlyBudgetEur? }

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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { email, monthlyBudgetEur } = body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  const budgetCents =
    typeof monthlyBudgetEur === "number" && monthlyBudgetEur > 0
      ? Math.round(monthlyBudgetEur * 100)
      : 0;

  try {
    const invite = await createInvitation({
      ownerUid: auth.uid,
      email,
      monthlyBudgetCents: budgetCents,
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://izymoto.com";
    const inviteUrl = `${origin}/entreprise/invitation/${invite.token}`;

    try {
      await sendCompanyInvitationEmail({
        to: invite.email,
        companyName: invite.companyName,
        inviteUrl,
        monthlyBudgetEur: invite.monthlyBudgetCents / 100,
        invitedByEmail: auth.email,
      });
    } catch (mailErr) {
      console.error("[company/invite] échec envoi email:", mailErr);
      // L'invitation existe : on renvoie le lien pour partage manuel.
      return NextResponse.json({
        ok: true,
        emailSent: false,
        inviteUrl,
        warning: "Invitation créée mais l'email n'a pas pu être envoyé.",
      });
    }

    return NextResponse.json({ ok: true, emailSent: true, inviteUrl });
  } catch (err) {
    if (err instanceof WalletError) {
      const status = err.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[company/invite] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
