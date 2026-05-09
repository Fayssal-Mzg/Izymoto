"use client";

import { useState } from "react";
import {
  X,
  User,
  Phone,
  Calendar,
  MapPin,
  Wallet,
  CreditCard,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ReservationDetailsModal({
  booking,
  onClose,
  onStatusChange,
  onDelete,
  onRefresh,
}) {
  const { user: adminUser } = useAuth();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [actionError, setActionError] = useState(null);

  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            Confirmée
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            En attente
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            Annulée
          </span>
        );
      case "completed":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            Terminée
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  // Capture / annulation Stripe — uniquement pour les bookings card / hybrid
  // en statut "authorized". Les bookings wallet n'ont pas de hold Stripe.
  const callStripeAdminEndpoint = async (endpoint, body) => {
    if (!adminUser) {
      setActionError("Session expirée, reconnectez-vous.");
      return null;
    }
    const idToken = await adminUser.getIdToken();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Erreur ${response.status}`);
    }
    return data;
  };

  const handleCapture = async () => {
    if (!booking.paymentId) return;
    if (
      !window.confirm(
        `Confirmer la capture de ${booking.cardAmountCents
          ? (booking.cardAmountCents / 100).toFixed(2)
          : booking.prix}€ sur la carte du client ?`
      )
    ) {
      return;
    }
    setIsCapturing(true);
    setActionError(null);
    try {
      await callStripeAdminEndpoint("/api/capture-payment", {
        paymentIntentId: booking.paymentId,
      });
      // Le webhook Stripe va mettre à jour paymentStatus en "captured" + status
      // en "completed". On le force aussi côté UI pour réactivité immédiate.
      await onStatusChange?.(booking.id, "completed");
      onRefresh?.();
      onClose();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCancelHold = async () => {
    if (!booking.paymentId) return;
    if (
      !window.confirm(
        "Annuler le hold Stripe ? Le client ne sera pas débité, le hold disparaîtra de sa carte sous quelques minutes."
      )
    ) {
      return;
    }
    setIsCanceling(true);
    setActionError(null);
    try {
      await callStripeAdminEndpoint("/api/cancel-payment", {
        paymentIntentId: booking.paymentId,
        cancellationReason: "requested_by_customer",
      });
      await onStatusChange?.(booking.id, "cancelled");
      onRefresh?.();
      onClose();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsCanceling(false);
    }
  };

  // États dérivés
  const isStripeBooking =
    booking.paymentMethod === "card" || booking.paymentMethod === "hybrid";
  const canCapture = isStripeBooking && booking.paymentStatus === "authorized";
  const canCancelHold =
    isStripeBooking && booking.paymentStatus === "authorized";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        className="bg-white rounded-lg w-full max-w-2xl mx-auto flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h3 className="text-lg font-medium pr-10">
            Détails de la réservation #
            {booking.reservationId || booking.id.substring(0, 8)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
                Informations client
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <User className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{booking.name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <a
                      href={`tel:${booking.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {booking.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
                Détails de la réservation
              </h4>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date de réservation</p>
                    <p>{new Date(booking.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="p-1 rounded-full bg-green-100 mr-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <p>{getStatusBadge(booking.status)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
              Détails du trajet
            </h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">De</p>
                  <p>{booking.depart}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">À</p>
                  <p>{booking.arrivee}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
              Paiement
            </h4>
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {booking.paymentMethod === "wallet" ? (
                  <>
                    <Wallet className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">
                      Portefeuille
                    </span>
                    <span className="text-sm text-gray-600">
                      — {booking.prix}€ débités au moment de la réservation
                    </span>
                  </>
                ) : booking.paymentMethod === "hybrid" ? (
                  <>
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">Hybride</span>
                    <span className="text-sm text-gray-600">
                      — wallet +{" "}
                      {booking.paymentStatus === "captured"
                        ? "CB capturée"
                        : "CB en hold"}
                    </span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-gray-800">
                      Carte bancaire
                    </span>
                    {booking.paymentStatus && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({booking.paymentStatus})
                      </span>
                    )}
                  </>
                )}
              </div>

              {booking.paymentMethod === "hybrid" && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded p-2 border border-amber-200">
                    <div className="text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <Wallet className="h-3 w-3" /> Portefeuille
                    </div>
                    <div className="font-semibold tabular-nums mt-0.5">
                      {((booking.walletAmountCents || 0) / 100).toFixed(2)}€
                    </div>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <div className="text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Carte
                    </div>
                    <div className="font-semibold tabular-nums mt-0.5">
                      {((booking.cardAmountCents || 0) / 100).toFixed(2)}€
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Stripe : capturer / annuler le hold */}
              {(canCapture || canCancelHold) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {actionError && (
                    <div className="mb-3 p-2 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded flex items-start gap-2">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{actionError}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mb-3">
                    💳 <strong>Hold actif sur la CB du client.</strong> Capture
                    pour débiter, annule pour libérer.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {canCapture && (
                      <button
                        onClick={handleCapture}
                        disabled={isCapturing || isCanceling}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isCapturing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isCapturing
                          ? "Capture en cours…"
                          : `Capturer ${
                              booking.cardAmountCents
                                ? (booking.cardAmountCents / 100).toFixed(2)
                                : booking.prix
                            }€`}
                      </button>
                    )}
                    {canCancelHold && (
                      <button
                        onClick={handleCancelHold}
                        disabled={isCapturing || isCanceling}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 text-sm font-semibold rounded hover:bg-orange-200 disabled:opacity-50"
                      >
                        {isCanceling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {isCanceling ? "Annulation…" : "Annuler le hold"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {booking.paymentStatus === "captured" && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-green-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Paiement capturé — client débité
                  {booking.amountCaptured &&
                    ` (${booking.amountCaptured.toFixed(2)}€)`}
                </div>
              )}
              {booking.paymentStatus === "released" && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-orange-700 font-semibold flex items-center gap-1.5">
                  <XCircle size={14} />
                  Hold libéré — client non débité
                </div>
              )}
              {booking.paymentStatus === "failed" && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-red-700 font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Paiement refusé
                  {booking.paymentFailureMessage &&
                    ` — ${booking.paymentFailureMessage}`}
                </div>
              )}

              {(booking.paymentMethod === "card" ||
                booking.paymentMethod === "hybrid") &&
                booking.paymentId && (
                  <p className="text-xs text-gray-400 font-mono pt-1">
                    ID Stripe : {booking.paymentId}
                  </p>
                )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-500 uppercase text-xs mb-2">
              Informations supplémentaires
            </h4>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm">
                {booking.notes || "Aucune note supplémentaire."}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex-shrink-0 bg-white rounded-b-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <button
              onClick={() => onDelete(booking.id)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Supprimer
            </button>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onStatusChange(booking.id, "completed")}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Marquer terminée
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
