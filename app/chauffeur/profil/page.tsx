"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Bike, CreditCard, ShieldCheck, FileText } from "lucide-react";
import DriverLayout from "@/components/chauffeur/DriverLayout";
import { useDriver } from "@/lib/hooks/useDriver";
import { useAuth } from "@/contexts/AuthContext";
import {
  updateDriverProfile,
  REQUIRED_DOCS,
  DOC_LABELS,
  type DocKind,
  type DriverDocument,
  type DriverProfile,
} from "@/lib/firebase/drivers";
import DocumentUploadField from "@/components/chauffeur/DocumentUploadField";

export default function DriverProfilePage() {
  return (
    <DriverLayout>
      <ProfileContent />
    </DriverLayout>
  );
}

function ProfileContent() {
  const { user } = useAuth();
  const { driver, loading } = useDriver();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [draft, setDraft] = useState<DriverProfile | null>(null);

  useEffect(() => {
    if (driver && !draft) setDraft(driver);
  }, [driver]);

  if (loading || !driver || !draft || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const update = (patch: Partial<DriverProfile>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const updateMoto = (patch: Partial<DriverProfile["moto"]>) =>
    setDraft((d) => (d ? { ...d, moto: { ...d.moto, ...patch } } : d));

  const updateBank = (patch: Partial<DriverProfile["bank"]>) =>
    setDraft((d) => (d ? { ...d, bank: { ...d.bank, ...patch } } : d));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateDriverProfile(user.uid, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
        dateOfBirth: draft.dateOfBirth,
        address: draft.address,
        legalForm: draft.legalForm,
        companyName: draft.companyName,
        siret: draft.siret,
        licenseNumber: draft.licenseNumber,
        licenseDeliveryDate: draft.licenseDeliveryDate,
        moto: draft.moto,
        bank: draft.bank,
      });
      setMessage("Profil mis à jour.");
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      setMessage("Erreur : " + (err.message || "échec"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Mon profil
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gérez vos informations, votre moto et vos documents.
        </p>
      </div>

      {message && (
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">
          {message}
        </div>
      )}

      <Section icon={ShieldCheck} title="Identité & structure">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Prénom">
            <input
              type="text"
              value={draft.firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              className="profile-input"
            />
          </FormField>
          <FormField label="Nom">
            <input
              type="text"
              value={draft.lastName}
              onChange={(e) => update({ lastName: e.target.value })}
              className="profile-input"
            />
          </FormField>
          <FormField label="Téléphone">
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => update({ phone: e.target.value })}
              className="profile-input"
            />
          </FormField>
          <FormField label="Date de naissance">
            <input
              type="date"
              value={draft.dateOfBirth ?? ""}
              onChange={(e) => update({ dateOfBirth: e.target.value })}
              className="profile-input"
            />
          </FormField>
        </div>
        <FormField label="Adresse">
          <input
            type="text"
            value={draft.address}
            onChange={(e) => update({ address: e.target.value })}
            className="profile-input"
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Forme juridique">
            <select
              value={draft.legalForm ?? ""}
              onChange={(e) =>
                update({ legalForm: (e.target.value || null) as any })
              }
              className="profile-input"
            >
              <option value="">—</option>
              <option value="auto-entrepreneur">Auto-entrepreneur</option>
              <option value="sasu">SASU</option>
              <option value="eurl">EURL</option>
              <option value="other">Autre</option>
            </select>
          </FormField>
          <FormField label="SIRET">
            <input
              type="text"
              value={draft.siret}
              onChange={(e) => update({ siret: e.target.value })}
              className="profile-input"
            />
          </FormField>
        </div>
        <FormField label="Raison sociale">
          <input
            type="text"
            value={draft.companyName}
            onChange={(e) => update({ companyName: e.target.value })}
            className="profile-input"
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Numéro de permis">
            <input
              type="text"
              value={draft.licenseNumber}
              onChange={(e) => update({ licenseNumber: e.target.value })}
              className="profile-input"
            />
          </FormField>
          <FormField label="Délivrance du permis">
            <input
              type="date"
              value={draft.licenseDeliveryDate ?? ""}
              onChange={(e) =>
                update({ licenseDeliveryDate: e.target.value })
              }
              className="profile-input"
            />
          </FormField>
        </div>
      </Section>

      <Section icon={Bike} title="Ma moto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Marque">
            <input
              type="text"
              value={draft.moto.brand}
              onChange={(e) => updateMoto({ brand: e.target.value })}
              className="profile-input"
            />
          </FormField>
          <FormField label="Modèle">
            <input
              type="text"
              value={draft.moto.model}
              onChange={(e) => updateMoto({ model: e.target.value })}
              className="profile-input"
            />
          </FormField>
          <FormField label="Année">
            <input
              type="number"
              value={draft.moto.year ?? ""}
              onChange={(e) =>
                updateMoto({
                  year: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="profile-input"
            />
          </FormField>
          <FormField label="Couleur">
            <input
              type="text"
              value={draft.moto.color}
              onChange={(e) => updateMoto({ color: e.target.value })}
              className="profile-input"
            />
          </FormField>
        </div>
        <FormField label="Immatriculation">
          <input
            type="text"
            value={draft.moto.plate}
            onChange={(e) => updateMoto({ plate: e.target.value.toUpperCase() })}
            className="profile-input uppercase"
          />
        </FormField>
      </Section>

      <Section icon={CreditCard} title="Coordonnées bancaires">
        <FormField label="Titulaire du compte">
          <input
            type="text"
            value={draft.bank.accountHolder}
            onChange={(e) => updateBank({ accountHolder: e.target.value })}
            className="profile-input"
          />
        </FormField>
        <FormField label="IBAN">
          <input
            type="text"
            value={draft.bank.iban}
            onChange={(e) => updateBank({ iban: e.target.value.toUpperCase() })}
            className="profile-input uppercase font-mono"
          />
        </FormField>
        <FormField label="BIC">
          <input
            type="text"
            value={draft.bank.bic}
            onChange={(e) => updateBank({ bic: e.target.value.toUpperCase() })}
            className="profile-input uppercase font-mono"
          />
        </FormField>
      </Section>

      <div className="sticky bottom-4 z-10 mb-7">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer les modifications
        </button>
      </div>

      <Section icon={FileText} title="Mes documents">
        <p className="text-xs text-slate-500 -mt-2">
          Vous pouvez remplacer un document à tout moment. Toute modification
          peut nécessiter une revalidation par l'équipe Izymoto.
        </p>
        <div className="space-y-3 mt-3">
          {REQUIRED_DOCS.map((kind) => (
            <DocumentUploadField
              key={kind}
              uid={user.uid}
              kind={kind}
              label={DOC_LABELS[kind]}
              current={draft.documents[kind] ?? null}
              onChange={(d) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        documents: {
                          ...prev.documents,
                          [kind]: d ?? undefined,
                        } as Partial<Record<DocKind, DriverDocument>>,
                      }
                    : prev
                )
              }
            />
          ))}
          <DocumentUploadField
            uid={user.uid}
            kind="motoPhoto"
            label={DOC_LABELS.motoPhoto}
            current={draft.documents.motoPhoto ?? null}
            optional
            onChange={(d) =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      documents: {
                        ...prev.documents,
                        motoPhoto: d ?? undefined,
                      } as Partial<Record<DocKind, DriverDocument>>,
                    }
                  : prev
              )
            }
          />
        </div>
      </Section>

      <style jsx>{`
        :global(.profile-input) {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: white;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.375rem;
          color: rgb(15 23 42);
          font-size: 0.875rem;
          transition: border-color 0.15s ease;
        }
        :global(.profile-input:focus) {
          outline: none;
          border-color: rgb(251 191 36);
        }
      `}</style>
    </div>
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
    <section className="mb-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-amber-600" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
