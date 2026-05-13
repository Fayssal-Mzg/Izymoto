"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Loader2,
  AlertCircle,
  FileText,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import {
  getDriverProfile,
  approveDriver,
  rejectDriver,
  suspendDriver,
  reinstateDriver,
  hasRequiredDocs,
  missingDocs,
  DOC_LABELS,
  REQUIRED_DOCS,
  type DriverProfile,
  type DocKind,
} from "@/lib/firebase/drivers";

export default function AdminDriverDetail() {
  return (
    <AdminLayout>
      <DriverDetail />
    </AdminLayout>
  );
}

function DriverDetail() {
  const params = useParams();
  const uid = params?.uid as string;
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetch = async () => {
    try {
      setLoading(true);
      const d = await getDriverProfile(uid);
      if (!d) {
        setNotFound(true);
      } else {
        setDriver(d);
        setNotFound(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) fetch();
  }, [uid]);

  const handleApprove = async () => {
    if (!driver) return;
    if (!hasRequiredDocs(driver)) {
      if (
        !confirm(
          `Documents manquants : ${missingDocs(driver)
            .map((k) => DOC_LABELS[k])
            .join(", ")}. Valider quand même ?`
        )
      )
        return;
    }
    setAction("approve");
    setError(null);
    try {
      await approveDriver(driver.uid);
      await fetch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!driver) return;
    const reason = prompt("Motif du refus ?");
    if (!reason) return;
    setAction("reject");
    setError(null);
    try {
      await rejectDriver(driver.uid, reason);
      await fetch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const handleSuspend = async () => {
    if (!driver) return;
    const reason = prompt("Motif de la suspension ?");
    if (!reason) return;
    setAction("suspend");
    setError(null);
    try {
      await suspendDriver(driver.uid, reason);
      await fetch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const handleReinstate = async () => {
    if (!driver) return;
    setAction("reinstate");
    setError(null);
    try {
      await reinstateDriver(driver.uid);
      await fetch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (notFound || !driver) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link
          href="/admin/chauffeurs"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux chauffeurs
        </Link>
        <div className="bg-white rounded-lg shadow p-8 text-center text-sm text-gray-500">
          Aucun chauffeur trouvé pour cet identifiant.
        </div>
      </div>
    );
  }

  const fullName =
    driver.firstName || driver.lastName
      ? `${driver.firstName} ${driver.lastName}`.trim()
      : driver.email;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
      <Link
        href="/admin/chauffeurs"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux chauffeurs
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Bike className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} />
                {driver.email}
              </span>
              {driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="inline-flex items-center gap-1.5 hover:text-amber-700"
                >
                  <Phone size={14} />
                  {driver.phone}
                </a>
              )}
            </div>
            <StatusBadge driver={driver} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Actions sur le dossier
        </h2>
        <div className="flex flex-wrap gap-2">
          {driver.status === "pending" && (
            <>
              <ActionButton
                onClick={handleApprove}
                loading={action === "approve"}
                tone="success"
                icon={CheckCircle2}
                label="Valider le compte"
              />
              <ActionButton
                onClick={handleReject}
                loading={action === "reject"}
                tone="danger"
                icon={XCircle}
                label="Refuser"
              />
            </>
          )}
          {driver.status === "active" && (
            <ActionButton
              onClick={handleSuspend}
              loading={action === "suspend"}
              tone="warning"
              icon={PauseCircle}
              label="Suspendre"
            />
          )}
          {(driver.status === "suspended" || driver.status === "rejected") && (
            <ActionButton
              onClick={handleReinstate}
              loading={action === "reinstate"}
              tone="success"
              icon={PlayCircle}
              label="Réactiver"
            />
          )}
        </div>
        {driver.rejectionReason && (
          <p className="text-xs text-gray-600 mt-3">
            <strong>Motif enregistré :</strong> {driver.rejectionReason}
          </p>
        )}
      </div>

      <Section icon={ShieldCheck} title="Identité & structure">
        <Grid>
          <Field label="Nom complet" value={fullName} />
          <Field label="Date de naissance" value={driver.dateOfBirth || "—"} />
          <Field label="Forme juridique" value={driver.legalForm || "—"} />
          <Field label="SIRET" value={driver.siret || "—"} />
        </Grid>
        <Field label="Raison sociale" value={driver.companyName || "—"} />
        <Field
          label="Adresse"
          value={driver.address || "—"}
          icon={MapPin}
        />
        <Grid>
          <Field
            label="Numéro de permis"
            value={driver.licenseNumber || "—"}
          />
          <Field
            label="Délivrance du permis"
            value={driver.licenseDeliveryDate || "—"}
          />
        </Grid>
      </Section>

      <Section icon={Bike} title="Moto">
        <Grid>
          <Field label="Marque" value={driver.moto.brand || "—"} />
          <Field label="Modèle" value={driver.moto.model || "—"} />
          <Field
            label="Année"
            value={driver.moto.year ? String(driver.moto.year) : "—"}
          />
          <Field label="Couleur" value={driver.moto.color || "—"} />
        </Grid>
        <Field
          label="Immatriculation"
          value={driver.moto.plate || "—"}
        />
      </Section>

      <Section icon={CreditCard} title="Coordonnées bancaires">
        <Field
          label="Titulaire"
          value={driver.bank.accountHolder || "—"}
        />
        <Field
          label="IBAN"
          value={driver.bank.iban || "—"}
          mono
        />
        <Field label="BIC" value={driver.bank.bic || "—"} mono />
      </Section>

      <Section icon={FileText} title="Documents">
        <div className="space-y-2">
          {(["identityCard", "drivingLicense", "vehicleRegistration", "insurance", "rib", "motoPhoto"] as DocKind[]).map(
            (kind) => {
              const doc = driver.documents[kind];
              const required = REQUIRED_DOCS.includes(kind);
              return (
                <div
                  key={kind}
                  className={`flex items-center justify-between gap-3 p-3 rounded-md border ${
                    doc
                      ? "bg-emerald-50 border-emerald-200"
                      : required
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {DOC_LABELS[kind]}
                      {!required && (
                        <span className="ml-2 text-[10px] uppercase text-gray-500">
                          (optionnel)
                        </span>
                      )}
                    </p>
                    {doc ? (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Reçu le{" "}
                        {doc.uploadedAt.toLocaleDateString("fr-FR")} ·{" "}
                        {doc.filename}
                      </p>
                    ) : (
                      <p className="text-xs text-red-700 mt-0.5">
                        {required ? "Manquant" : "Non fourni"}
                      </p>
                    )}
                  </div>
                  {doc && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-amber-400 hover:text-amber-700 text-xs font-semibold rounded-md transition-colors"
                    >
                      Ouvrir
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            }
          )}
        </div>
      </Section>

      {driver.createdAt && (
        <p className="text-xs text-gray-400 mt-6 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          Inscrit le {driver.createdAt.toLocaleString("fr-FR")}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ driver }: { driver: DriverProfile }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: "En attente de validation", bg: "bg-amber-50", text: "text-amber-800" },
    active: { label: "Compte actif", bg: "bg-emerald-50", text: "text-emerald-800" },
    suspended: { label: "Suspendu", bg: "bg-orange-50", text: "text-orange-800" },
    rejected: { label: "Refusé", bg: "bg-red-50", text: "text-red-800" },
  };
  const m = map[driver.status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${m.bg} ${m.text}`}
    >
      {m.label}
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-amber-600" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div
        className={`text-sm text-gray-900 break-words ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  tone,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  tone: "success" | "danger" | "warning";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const styles: Record<typeof tone, string> = {
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-orange-500 hover:bg-orange-600 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${styles[tone]}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
