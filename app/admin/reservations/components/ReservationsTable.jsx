import {
  Check,
  Clock,
  X,
  MoreHorizontal,
  FileText,
  Wallet,
  CreditCard,
  Calendar,
  User,
  Phone,
  Sparkles,
} from "lucide-react";

const STATUS_META = {
  confirmed: {
    label: "Confirmée",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  pending: {
    label: "En attente",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  completed: {
    label: "Terminée",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  cancelled: {
    label: "Annulée",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

function getStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status,
      bg: "bg-gray-50",
      text: "text-gray-700",
      dot: "bg-gray-400",
    }
  );
}

function formatBookingDate(d) {
  const date = new Date(d);
  return `${date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function PaymentBadge({ method }) {
  if (method === "wallet") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
        <Wallet className="h-3 w-3" />
        Portefeuille
      </span>
    );
  }
  if (method === "hybrid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
        <Sparkles className="h-3 w-3" />
        Hybride
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
      <CreditCard className="h-3 w-3" />
      CB
    </span>
  );
}

function StatusBadge({ status }) {
  const m = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function ActionButtons({ booking, onStatusChange, onViewDetails, onGenerateInvoice, compact = false }) {
  const baseBtn = "p-2 rounded-md transition-colors";
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      <button
        onClick={() => onStatusChange(booking.id, "completed")}
        className={`${baseBtn} bg-green-50 text-green-700 hover:bg-green-100`}
        title="Marquer comme terminée"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={() => onStatusChange(booking.id, "pending")}
        className={`${baseBtn} bg-yellow-50 text-yellow-700 hover:bg-yellow-100`}
        title="Marquer comme en attente"
      >
        <Clock className="h-4 w-4" />
      </button>
      <button
        onClick={() => onStatusChange(booking.id, "cancelled")}
        className={`${baseBtn} bg-red-50 text-red-700 hover:bg-red-100`}
        title="Marquer comme annulée"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewDetails(booking)}
        className={`${baseBtn} bg-blue-50 text-blue-700 hover:bg-blue-100`}
        title="Voir les détails"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {booking.status === "completed" && (
        <button
          onClick={() => onGenerateInvoice(booking)}
          className={`${baseBtn} bg-amber-50 text-amber-700 hover:bg-amber-100`}
          title="Générer la facture"
        >
          <FileText className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function ReservationsTable({
  bookings,
  onStatusChange,
  onViewDetails,
  onGenerateInvoice,
}) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Toutes les réservations</h2>
        {bookings.length > 0 && (
          <span className="text-sm text-gray-500">
            {bookings.length}{" "}
            {bookings.length > 1 ? "courses" : "course"}
          </span>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucune réservation trouvée.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="p-4 lg:p-5 hover:bg-gray-50 transition-colors"
            >
              {/* Layout vertical mobile / horizontal desktop */}
              <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-6">
                {/* Bloc client + trajet */}
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                      <User className="h-3.5 w-3.5" />
                      Client
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {booking.name || "—"}
                    </div>
                    {booking.phone && (
                      <a
                        href={`tel:${booking.phone}`}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mt-0.5"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {booking.phone}
                      </a>
                    )}
                  </div>

                  {/* Trajet */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                      Trajet
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="w-px h-5 bg-gray-300 my-0.5" />
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="text-sm text-gray-900 break-words">
                          {booking.depart || "—"}
                        </div>
                        <div className="text-sm text-gray-900 break-words">
                          {booking.arrivee || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloc meta (date, prix, statut, mode) */}
                <div className="lg:w-56 lg:border-l lg:border-gray-100 lg:pl-6 mt-4 lg:mt-0 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <PaymentBadge method={booking.paymentMethod} />
                  </div>

                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatBookingDate(booking.createdAt)}
                  </div>

                  <div className="text-2xl font-bold tabular-nums text-gray-900 mt-auto">
                    {Number(booking.prix || 0).toFixed(2)}€
                  </div>
                </div>
              </div>

              {/* Footer carte : actions + référence */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs text-gray-400">
                  #{booking.reservationId || booking.id.substring(0, 8)}
                </span>
                <ActionButtons
                  booking={booking}
                  onStatusChange={onStatusChange}
                  onViewDetails={onViewDetails}
                  onGenerateInvoice={onGenerateInvoice}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
