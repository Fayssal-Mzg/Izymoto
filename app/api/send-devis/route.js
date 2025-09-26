// app/api/send-devis/route.js
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request) {
  try {
    const body = await request.json();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const {
      name,
      email,
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

    // Validation de base
    if (!email || !email.includes("@")) {
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

    // Envoi email client
    const clientEmail = await resend.emails.send({
      from: "IzyMoto <contact@izymoto.com>",
      to: [email.trim()],
      subject: `Votre devis IzyMoto #${reservationId}`,
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
              <p>Bonjour ${name},</p>
              <p>Merci pour votre demande de devis. Voici les détails de votre trajet :</p>
              
              <div style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p><strong>Référence :</strong> ${reservationId}</p>
                
                ${
                  reservationDate
                    ? `
                <div style="background-color: #fffaeb; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #ffeeba;">
                  <p><strong>Date :</strong> ${dateStr}</p>
                  <p><strong>Heure :</strong> ${heureStr}</p>
                </div>
                `
                    : ""
                }
                
                <p><strong>Départ :</strong> ${depart}</p>
                <p><strong>Arrivée :</strong> ${arrivee}</p>
                <p><strong>Distance :</strong> ${typeof distance === "number" ? distance.toFixed(2) : distance} km</p>
                
                <p><strong>Prix estimé :</strong> 
                  <span style="font-size: 18px; color: #000;">${typeof prix === "number" ? prix.toFixed(2) : prix} €</span>
                  ${prioriteReservation ? '<span style="background-color: #ffc107; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 14px; margin-left: 10px;">Option priorité +20€</span>' : ""}
                </p>
                
                ${notes ? `<p><strong>Notes :</strong> ${notes}</p>` : ""}
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
    });

    // Envoi email admin
    const adminEmail = await resend.emails.send({
      from: "IzyMoto <contact@izymoto.com>",
      to: ["contact@izymoto.com"],
      subject: `[ADMIN] Nouveau devis #${reservationId}`,
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
              <p><strong>Nom :</strong> ${name}</p>
              <p><strong>Email :</strong> ${email}</p>
              <p><strong>Téléphone :</strong> ${phone || "Non fourni"}</p>
            </div>
            
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
              <h3>Détails du devis :</h3>
              <p><strong>Référence :</strong> ${reservationId}</p>
              ${reservationDate ? `<p><strong>Date demandée :</strong> ${dateStr} à ${heureStr}</p>` : ""}
              <p><strong>Départ :</strong> ${depart}</p>
              <p><strong>Arrivée :</strong> ${arrivee}</p>
              <p><strong>Distance :</strong> ${distance} km</p>
              <p><strong>Prix estimé :</strong> ${prix}€</p>
              ${prioriteReservation ? "<p><strong>⚡ Option priorité activée</strong> (+20€)</p>" : ""}
              ${notes ? `<p><strong>Notes client :</strong> ${notes}</p>` : ""}
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
    console.log(`Devis envoyé: ${reservationId} -> ${email}`);

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
