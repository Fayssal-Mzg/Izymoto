import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";

// Webhook Stripe — source unique de vérité pour les transitions de statut.
// Côtés client/admin appellent les endpoints (capture/cancel/increment) puis
// Stripe nous renvoie ici l'événement officiel ; on met à jour Firestore.
//
// Évents traités :
// - payment_intent.amount_capturable_updated : autorisation prête (post-3DS),
//   on passe la résa en "authorized" (= hold actif, pas encore débité).
// - payment_intent.succeeded : capture réussie → "captured" (= argent reçu).
// - payment_intent.canceled : hold libéré → "released".
// - payment_intent.payment_failed : auth refusée → "failed".

export const dynamic = "force-dynamic"; // pas de cache, c'est un endpoint POST

// Next.js App Router : on lit le body brut pour la vérif de signature.
async function readRawBody(req) {
  const reader = req.body.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const updateBookingByPaymentIntent = async (paymentIntentId, fields) => {
  const q = query(
    collection(db, "bookings"),
    where("paymentId", "==", paymentIntentId)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    console.warn(`[stripe-webhook] aucune réservation trouvée pour paymentId=${paymentIntentId}`);
    return;
  }
  for (const docSnap of snap.docs) {
    await updateDoc(doc(db, "bookings", docSnap.id), {
      ...fields,
      paymentUpdatedAt: Timestamp.now(),
    });
  }
};

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook signature ou secret manquant" },
      { status: 400 }
    );
  }

  let event;
  try {
    const rawBody = await readRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature invalide:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const pi = event.data.object;

  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated":
        await updateBookingByPaymentIntent(pi.id, {
          paymentStatus: "authorized",
          amountAuthorized: pi.amount / 100,
        });
        break;

      case "payment_intent.succeeded":
        await updateBookingByPaymentIntent(pi.id, {
          paymentStatus: "captured",
          amountCaptured: pi.amount_received / 100,
          status: "completed",
        });
        break;

      case "payment_intent.canceled":
        await updateBookingByPaymentIntent(pi.id, {
          paymentStatus: "released",
          status: "cancelled",
        });
        break;

      case "payment_intent.payment_failed":
        await updateBookingByPaymentIntent(pi.id, {
          paymentStatus: "failed",
          paymentFailureMessage:
            pi.last_payment_error?.message || "Paiement refusé",
        });
        break;

      default:
        // évent ignoré (on ne s'abonne pas à tout)
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] erreur traitement ${event.type}:`, err);
    // On répond 500 pour que Stripe retente — l'event sera redélivré.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
