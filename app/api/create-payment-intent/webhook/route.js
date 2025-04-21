// app/api/webhook/route.js

import {
  sendClientConfirmationEmail,
  sendAdminNotificationEmail,
} from "@/lib/emails/confirmationEmail";
import { saveBooking } from "@/lib/firebase/bookings";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Webhook signature manquante" },
        { status: 400 }
      );
    }

    // Vérifiez la signature Stripe pour authentifier l'événement
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`⚠️ Erreur de signature webhook: ${err.message}`);
      return NextResponse.json(
        { error: `Erreur de signature webhook: ${err.message}` },
        { status: 400 }
      );
    }

    // Traiter différents types d'événements
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      // Si le paiement a réussi, traitez les données de la réservation
      const bookingData = paymentIntent.metadata;

      if (bookingData) {
        try {
          // Enregistrer la réservation dans votre base de données
          const savedBooking = await saveBooking({
            ...bookingData,
            paymentIntentId: paymentIntent.id,
            status: "paid",
          });

          // Envoyer des emails de confirmation
          await Promise.all([
            sendClientConfirmationEmail({
              bookingId: savedBooking.id,
              clientName: bookingData.clientName || "Client",
              email: bookingData.email,
              ...bookingData,
            }),
            sendAdminNotificationEmail({
              bookingId: savedBooking.id,
              clientName: bookingData.clientName || "Client",
              email: bookingData.email,
              ...bookingData,
            }),
          ]);

          console.log(
            `✅ Réservation ${savedBooking.id} confirmée et emails envoyés`
          );
        } catch (error) {
          console.error("Erreur lors du traitement de la réservation:", error);
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      console.log(
        `❌ Échec du paiement pour ${paymentIntent.id}: ${paymentIntent.last_payment_error?.message}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur webhook:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du webhook" },
      { status: 500 }
    );
  }
}
