// app/api/send-devis/route.js
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAuth, AdminAuthError } from "@/lib/firebase/admin-server";

// Échappement HTML de toute valeur provenant de l'appelant avant insertion.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Valeur numérique ou texte, échappée (prix / distance).
function fmtNum(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : esc(value);
}

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const isValidEmail = (v) => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v.trim());

// Authentification FACULTATIVE : le parcours devis existe aussi pour un invité
// (non connecté, cf. useReservation.js). Si un jeton est présent il doit être
// valide : le devis part alors à l'email du jeton (email du corps ignoré ; jeton
// sans email -> 400) et à l'admin, SI l'email du jeton est vérifié (sinon : invité).
// DÉCISION PROVISOIRE (à valider par Fayssal) : sans jeton (invité), l'email part
// UNIQUEMENT à l'admin (contact@izymoto.com), avec l'email saisi dans le contenu
// pour qu'il recontacte l'invité. Aucun email n'est envoyé à une adresse fournie
// par un appelant non authentifié.
export async function POST(request) {
  let auth = null;
  if (request.headers.get("authorization")) {
    try {
      auth = await requireAuth(request);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
    }
  }

  try {
    const body = await request.json();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const {
      name,
      email: bodyEmail,
      depart,
      arrivee,
      prix,
      distance,
      reservationId,
      notes,
      prioriteReservation,
      phone,
      reservationDate,
    } = body;

    // Email du client : celui du jeton si connecté, sinon (invité) celui saisi,
    // utilisé uniquement dans le contenu de l'email admin.
    // Connecté avec email NON vérifié : traité comme un invité (admin seul).
    const sendToClient = !!auth && auth.emailVerified === true;
    // (jeton sans email : 400, comme avant).
    const email = auth
      ? sendToClient
        ? auth.email
        : auth.email && isValidEmail(bodyEmail)
        ? bodyEmail
        : auth.email
      : bodyEmail;
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 }
      );
    }

    // Formatage de la date
    let dateStr = "";
    let heureStr = "";
    if (reservationDate) {
      const date = new Date(reservationDate);
      dateStr = date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      heureStr = date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const subjectId = String(reservationId ?? "").replace(/[\r\n]+/g, " ").slice(0, 60);

    // Envoi email client
    const clientEmail = sendToClient
      ? await resend.emails.send({
      from: "IzyMoto <contact@izymoto.com>",
      to: [email.trim()],
      subject: `Votre devis IzyMoto #${subjectId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Votre devis IzyMoto</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="background-color: #ffc107; padding: 25px 20px; text-align: center;">
              <h1 style="margin: 0; color: #333; font-size: 28px; font-weight: 600;">Votre Devis IzyMoto</h1>
            </div>
            
            <div style="padding: 30px;">
              <p>Bonjour ${esc(name)},</p>
              <p>Merci pour votre demande de devis. Voici les détails de votre trajet :</p>
              
              <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p><strong>Référence :</strong> ${esc(reservationId)}</p>
                
                ${
                  reservationDate
                    ? `
                <div style="background-color: #fffaeb; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #ffeeba;">
                  <p><strong>Date :</strong> ${esc(dateStr)}</p>
                  <p><strong>Heure :</strong> ${esc(heureStr)}</p>
                </div>
                `
                    : ""
                }
                
                <p><strong>Départ :</strong> ${esc(depart)}</p>
                <p><strong>Arrivée :</strong> ${esc(arrivee)}</p>
                <p><strong>Distance :</strong> ${fmtNum(distance)} km</p>
                
                <p><strong>Prix estimé :</strong> 
                  <span style="font-size: 18px; color: #000;">${fmtNum(prix)} €</span>
                  ${prioriteReservation ? '<span style="background-color: #ffc107; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 14px; margin-left: 10px;">Option priorité +20€</span>' : ""}
                </p>
                
                ${notes ? `<p><strong>Notes :</strong> ${esc(notes)}</p>` : ""}
              </div>
              
              <p>Pour confirmer cette réservation ou pour toute question, contactez-nous au <strong>+33 6 49 50 25 25</strong></p>
            </div>
            
            <div style="padding: 20px; background-color: #f7f7f7; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee;">
              &copy; ${new Date().getFullYear()} IzyMoto - Service de transport premium
            </div>
          </div>
        </body>
        </html>
      `,
    })
      : null;

    // Envoi email admin
    const adminEmail = await resend.emails.send({
      from: "IzyMoto <contact@izymoto.com>",
      to: ["contact@izymoto.com"],
      subject: `[ADMIN] Nouveau devis #${subjectId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nouveau devis IzyMoto</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Nouveau Devis Reçu</h1>
            
            <div style="background-color: #edf7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1e7ff;">
              <h3>Information client :</h3>
              <p><strong>Nom :</strong> ${esc(name)}</p>
              <p><strong>Email :</strong> ${esc(email)}</p>
              <p><strong>Téléphone :</strong> ${esc(phone || "Non fourni")}</p>
            </div>
            
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
              <h3>Détails du devis :</h3>
              <p><strong>Référence :</strong> ${esc(reservationId)}</p>
              ${reservationDate ? `<p><strong>Date demandée :</strong> ${esc(dateStr)} à ${esc(heureStr)}</p>` : ""}
              <p><strong>Départ :</strong> ${esc(depart)}</p>
              <p><strong>Arrivée :</strong> ${esc(arrivee)}</p>
              <p><strong>Distance :</strong> ${fmtNum(distance)} km</p>
              <p><strong>Prix estimé :</strong> ${fmtNum(prix)}€</p>
              ${prioriteReservation ? "<p><strong>⚡ Option priorité activée</strong> (+20€)</p>" : ""}
              ${notes ? `<p><strong>Notes client :</strong> ${esc(notes)}</p>` : ""}
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #ffeaa7;">
              <p><strong>Action requise :</strong> Contactez le client pour finaliser la réservation.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Log minimal pour monitoring
    console.log(`Devis envoyé: ${subjectId} (${auth ? "connecté" : "invité"})`);

    return NextResponse.json({
      success: true,
      clientEmail: {
        id: clientEmail?.data?.id,
        success: !!clientEmail?.data?.id,
      },
      adminEmail: {
        id: adminEmail?.data?.id,
        success: !!adminEmail?.data?.id,
      },
    });
  } catch (error) {
    // Log d'erreur pour monitoring
    console.error("Erreur envoi devis:", error.message);

    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi du devis",
      },
      { status: 500 }
    );
  }
}
