import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/firebase/admin-server";
import { adminDeleteBooking, adminSetBookingStatus, RideActionError } from "@/lib/rides/actions";

// lot 2.1 : actions de l'admin sur une réservation, par le serveur pour garder le
// pool des chauffeurs (ridePool) synchronisé et tracer l'action (auditLogs).
//   POST { bookingId, status, refundConfirmed? } -> changement de statut
//   POST { bookingId, action: "delete" }         -> suppression

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      bookingId?: unknown;
      status?: unknown;
      action?: unknown;
      refundConfirmed?: unknown;
    };
    if (body.action === "delete") await adminDeleteBooking(admin.uid, body.bookingId);
    else await adminSetBookingStatus(admin.uid, body.bookingId, body.status, body.refundConfirmed === true);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RideActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[admin/booking] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
