"use client";

import { useEffect, useState } from "react";
import { X, Building2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatEuro } from "@/lib/wallet/tiers";

// Modal de crédit manuel du solde d'une société (back-office).
// asRecharge=true  : top-up réel (virement/facture) → compte dans le cumul.
// asRecharge=false : crédit offert (geste commercial) → hors cumul.
export default function AdminCompanyCreditModal({ company, onClose, onSuccess }) {
  const { user: adminUser } = useAuth();
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState("");
  const [asRecharge, setAsRecharge] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const amountEur = parseFloat(amountStr.replace(",", "."));
  const balanceEur = (company?.walletBalanceCents || 0) / 100;
  const isValidAmount = Number.isFinite(amountEur) && amountEur > 0;
  const previewAfterEur = isValidAmount ? balanceEur + amountEur : balanceEur;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!adminUser) {
      setError("Session expirée, reconnectez-vous.");
      return;
    }
    if (!isValidAmount) {
      setError("Saisissez un montant valide.");
      return;
    }
    if (!reason.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await adminUser.getIdToken();
      const response = await fetch("/api/admin/company/credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          companyId: company.id,
          amountEur,
          reason: reason.trim(),
          asRecharge,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors du crédit");
      onSuccess?.(data);
      onClose();
    } catch (err) {
      setError(err.message || "Erreur lors du crédit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-xl w-full max-w-md mx-auto shadow-2xl flex flex-col transition-all duration-300 ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        <div className="relative p-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 pr-10 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-500" />
            Créditer le solde
          </h3>
          <p className="text-sm text-gray-500 mt-1 truncate pr-10">
            {company?.name}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <form
          id="admin-company-credit-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5"
        >
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Nature du crédit
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAsRecharge(true)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                  asRecharge
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                Recharge (virement)
              </button>
              <button
                type="button"
                onClick={() => setAsRecharge(false)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                  !asRecharge
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                Crédit offert
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="credit-amount"
              className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2"
            >
              Montant
            </label>
            <div className="relative">
              <input
                id="credit-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                disabled={isSubmitting}
                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
                €
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="credit-reason"
              className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2"
            >
              Motif <span className="text-red-500">*</span>
            </label>
            <textarea
              id="credit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex : virement reçu le 05/06, facture #123, geste commercial…"
              disabled={isSubmitting}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-black focus:border-black resize-none"
            />
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Solde actuel</span>
              <span className="font-semibold tabular-nums">
                {formatEuro(balanceEur)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="font-bold text-gray-900">Solde après</span>
              <span className="font-bold text-lg tabular-nums">
                {formatEuro(previewAfterEur)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-3 rounded flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="px-5 pt-4 pb-5 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-xl">
          <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex-1 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="admin-company-credit-form"
              disabled={isSubmitting || !isValidAmount}
              className="py-3 px-4 rounded-lg font-bold transition-colors flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Traitement…</span>
                </>
              ) : (
                <span className="truncate">
                  Créditer{" "}
                  {isValidAmount && `(+${formatEuro(amountEur)})`}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
