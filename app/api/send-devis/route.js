// app/api/send-devis/route.js
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request) {
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

  // Formater la date pour l'affichage
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

  try {
    // Vérifier que l'email n'est pas vide
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Adresse email invalide: " + email },
        { status: 400 }
      );
    }

    // Envoi au client
    const clientEmail = await resend.emails.send({
      from: "IzyMoto <onboarding@resend.dev>",
      to: [email.trim()],
      subject: `Votre devis IzyMoto #${reservationId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Votre devis IzyMoto</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background-color: #ffc107;
              padding: 25px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #333;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .devis-box {
              background-color: #f7f7f7;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
            .highlight-box {
              background-color: #fffaeb;
              border-radius: 8px;
              padding: 15px 20px;
              margin: 20px 0;
              border: 1px solid #ffeeba;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
              align-items: flex-start;
            }
            .info-label {
              font-weight: 600;
              width: 140px;
              color: #555;
            }
            .info-value {
              flex: 1;
            }
            .footer {
              padding: 20px;
              background-color: #f7f7f7;
              text-align: center;
              color: #666;
              font-size: 14px;
              border-top: 1px solid #eee;
            }
            .cta-button {
              display: inline-block;
              background-color: #ffc107;
              color: #333;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
              margin-top: 15px;
            }
            .cta-button:hover {
              background-color: #e5ad06;
            }
            .priority-tag {
              display: inline-block;
              background-color: #ffc107;
              color: #333;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: 600;
              margin-left: 10px;
            }
            @media only screen and (max-width: 600px) {
              .container {
                width: 100%;
                border-radius: 0;
              }
              .info-row {
                flex-direction: column;
              }
              .info-label {
                width: 100%;
                margin-bottom: 4px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Votre Devis IzyMoto</h1>
            </div>
            
            <div class="content">
              <p>Bonjour ${name},</p>
              <p>Merci pour votre demande de devis. Voici les détails de votre trajet :</p>
              
              <div class="devis-box">
                <div class="info-row">
                  <div class="info-label">Référence :</div>
                  <div class="info-value">${reservationId}</div>
                </div>
                
                ${
                  reservationDate
                    ? `
                <div class="highlight-box">
                  <div class="info-row">
                    <div class="info-label">Date :</div>
                    <div class="info-value">${dateStr}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Heure :</div>
                    <div class="info-value">${heureStr}</div>
                  </div>
                </div>
                `
                    : ""
                }
                
                <div class="info-row">
                  <div class="info-label">Départ :</div>
                  <div class="info-value">${depart}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Arrivée :</div>
                  <div class="info-value">${arrivee}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Distance :</div>
                  <div class="info-value">${
                    typeof distance === "number"
                      ? distance.toFixed(2)
                      : distance
                  } km</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Prix estimé :</div>
                  <div class="info-value">
                    <strong>${
                      typeof prix === "number" ? prix.toFixed(2) : prix
                    } €</strong>
                    ${
                      prioriteReservation
                        ? `<span class="priority-tag">Option priorité +20€</span>`
                        : ""
                    }
                  </div>
                </div>
                
                ${
                  notes
                    ? `
                <div class="info-row">
                  <div class="info-label">Notes :</div>
                  <div class="info-value">${notes}</div>
                </div>
                `
                    : ""
                }
              </div>
              
              <p>Pour confirmer cette réservation ou pour toute question, n'hésitez pas à nous contacter.</p>
              
              <div style="text-align: center;">
                <a href="https://izymoto.com/contact" class="cta-button">Nous contacter</a>
              </div>
            </div>
            
            <div class="footer">
              &copy; ${new Date().getFullYear()} IzyMoto - Tous droits réservés
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Envoi à l'administrateur
    const adminEmail = await resend.emails.send({
      from: "IzyMoto <onboarding@resend.dev>",
      to: ["contact@izymoto.com"],
      subject: `[ADMIN] Nouveau devis #${reservationId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nouveau devis IzyMoto</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              background-color: #333;
              padding: 25px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: #fff;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .devis-box {
              background-color: #f7f7f7;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
            .highlight-box {
              background-color: #fffaeb;
              border-radius: 8px;
              padding: 15px 20px;
              margin: 20px 0;
              border: 1px solid #ffeeba;
            }
            .client-info {
              background-color: #edf7ff;
              border-radius: 8px;
              padding: 15px 20px;
              margin: 20px 0;
              border: 1px solid #d1e7ff;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
              align-items: flex-start;
            }
            .info-label {
              font-weight: 600;
              width: 140px;
              color: #555;
            }
            .info-value {
              flex: 1;
            }
            .footer {
              padding: 20px;
              background-color: #f7f7f7;
              text-align: center;
              color: #666;
              font-size: 14px;
              border-top: 1px solid #eee;
            }
            .cta-button {
              display: inline-block;
              background-color: #ffc107;
              color: #333;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
              margin-top: 15px;
              text-align: center;
            }
            .cta-button:hover {
              background-color: #e5ad06;
            }
            .priority-tag {
              display: inline-block;
              background-color: #ffc107;
              color: #333;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: 600;
              margin-left: 10px;
            }
            @media only screen and (max-width: 600px) {
              .container {
                width: 100%;
                border-radius: 0;
              }
              .info-row {
                flex-direction: column;
              }
              .info-label {
                width: 100%;
                margin-bottom: 4px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nouveau Devis</h1>
            </div>
            
            <div class="content">
              <p><strong>Un nouveau devis a été demandé :</strong></p>
              
              <!-- Information client -->
              <div class="client-info">
                <div class="info-row">
                  <div class="info-label">Client :</div>
                  <div class="info-value">${name}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Email :</div>
                  <div class="info-value">${email}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Téléphone :</div>
                  <div class="info-value">${phone || "Non fourni"}</div>
                </div>
              </div>
              
              <!-- Détails du devis -->
              <div class="devis-box">
                <div class="info-row">
                  <div class="info-label">Référence :</div>
                  <div class="info-value">${reservationId}</div>
                </div>
                
                ${
                  reservationDate
                    ? `
                <div class="highlight-box">
                  <div class="info-row">
                    <div class="info-label">Date :</div>
                    <div class="info-value">${dateStr}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Heure :</div>
                    <div class="info-value">${heureStr}</div>
                  </div>
                </div>
                `
                    : ""
                }
                
                <div class="info-row">
                  <div class="info-label">Départ :</div>
                  <div class="info-value">${depart}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Arrivée :</div>
                  <div class="info-value">${arrivee}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Distance :</div>
                  <div class="info-value">${
                    typeof distance === "number"
                      ? distance.toFixed(2)
                      : distance
                  } km</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Prix estimé :</div>
                  <div class="info-value">
                    <strong>${
                      typeof prix === "number" ? prix.toFixed(2) : prix
                    } €</strong>
                    ${
                      prioriteReservation
                        ? `<span class="priority-tag">Option priorité +20€</span>`
                        : ""
                    }
                  </div>
                </div>
                
                ${
                  notes
                    ? `
                <div class="info-row">
                  <div class="info-label">Notes :</div>
                  <div class="info-value">${notes}</div>
                </div>
                `
                    : ""
                }
              </div>
              
              <div style="text-align: center;">
                <a href="https://izymoto.com/admin/devis/${reservationId}" class="cta-button">Voir dans l'administration</a>
              </div>
            </div>
            
            <div class="footer">
              &copy; ${new Date().getFullYear()} IzyMoto - Système d'administration
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      clientEmail: clientEmail,
      adminEmail: adminEmail,
    });
  } catch (error) {
    console.error("Erreur d'envoi d'email:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
