"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDriver } from "@/lib/hooks/useDriver";
import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  createDriverProfile,
  updateDriverProfile,
  REQUIRED_DOCS,
  DOC_LABELS,
  type DocKind,
  type DriverDocument,
  type DriverProfile,
} from "@/lib/firebase/drivers";
import DocumentUploadField from "@/components/chauffeur/DocumentUploadField";
import {
  Bike,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  FileText,
  User as UserIcon,
  CreditCard,
  AlertCircle,
} from "lucide-react";

type StepId = "account" | "identity" | "moto" | "bank" | "documents" | "done";

const STEPS: { id: StepId; label: string; icon: typeof UserIcon }[] = [
  { id: "account", label: "Compte", icon: UserIcon },
  { id: "identity", label: "Identité", icon: ShieldCheck },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "bank", label: "RIB", icon: CreditCard },
  { id: "documents", label: "Documents", icon: FileText },
];

interface FormState {
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  legalForm: "auto-entrepreneur" | "sasu" | "eurl" | "other" | "";
  companyName: string;
  siret: string;
  licenseNumber: string;
  licenseDeliveryDate: string;
  motoBrand: string;
  motoModel: string;
  motoYear: string;
  motoPlate: string;
  motoColor: string;
  iban: string;
  bic: string;
  accountHolder: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  password: "",
  passwordConfirm: "",
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  address: "",
  legalForm: "",
  companyName: "",
  siret: "",
  licenseNumber: "",
  licenseDeliveryDate: "",
  motoBrand: "",
  motoModel: "",
  motoYear: "",
  motoPlate: "",
  motoColor: "",
  iban: "",
  bic: "",
  accountHolder: "",
};

export default function DriverSignupPage() {
  const router = useRouter();
  const { user, signUpAsDriver, loading: authLoading } = useAuth();
  const { driver, loading: driverLoading } = useDriver();

  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [docs, setDocs] = useState<Partial<Record<DocKind, DriverDocument>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reprise du wizard : si l'utilisateur est déjà chauffeur avec une fiche,
  // on hydrate le formulaire pour qu'il puisse compléter sans tout retaper.
  useEffect(() => {
    if (driver) {
      setForm((f) => ({
        ...f,
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        dateOfBirth: driver.dateOfBirth ?? "",
        address: driver.address,
        legalForm: (driver.legalForm as any) ?? "",
        companyName: driver.companyName,
        siret: driver.siret,
        licenseNumber: driver.licenseNumber,
        licenseDeliveryDate: driver.licenseDeliveryDate ?? "",
        motoBrand: driver.moto.brand,
        motoModel: driver.moto.model,
        motoYear: driver.moto.year?.toString() ?? "",
        motoPlate: driver.moto.plate,
        motoColor: driver.moto.color,
        iban: driver.bank.iban,
        bic: driver.bank.bic,
        accountHolder: driver.bank.accountHolder,
      }));
      setDocs(driver.documents);
      if (stepIdx === 0) setStepIdx(1);
    }
  }, [driver]);

  // Cas où l'utilisateur est déjà connecté (compte client existant) mais n'a
  // pas encore de fiche drivers/{uid} : on bascule son role à "driver" et on
  // crée la fiche pending vide, puis on saute l'étape Compte.
  useEffect(() => {
    if (authLoading || driverLoading) return;
    if (!user || driver) return;
    let cancelled = false;
    (async () => {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { role: "driver", updatedAt: serverTimestamp() },
          { merge: true }
        );
        await createDriverProfile(user.uid, user.email ?? "");
        if (!cancelled && stepIdx === 0) setStepIdx(1);
      } catch (err) {
        console.error("[wizard] bootstrap driver fiche:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, driver, authLoading, driverLoading]);

  // Si statut déjà actif → vers dashboard
  useEffect(() => {
    if (!driverLoading && driver?.status === "active") {
      router.replace("/chauffeur");
    }
  }, [driver, driverLoading, router]);

  const update = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleAccountStep = async () => {
    setError(null);
    if (!form.email || !form.password) {
      setError("Email et mot de passe requis.");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      setSubmitting(true);
      const newUser = await signUpAsDriver(form.email, form.password);
      // Crée la fiche pending vide pour amorcer le wizard
      await createDriverProfile(newUser.uid, newUser.email ?? form.email);
      setStepIdx(1);
    } catch (err: any) {
      console.error("[signup driver]", err);
      if (err.code === "auth/email-already-in-use") {
        setError(
          "Cet email a déjà un compte. Connectez-vous d'abord avec ce compte."
        );
      } else if (err.code === "auth/weak-password") {
        setError("Mot de passe trop faible (6 caractères min).");
      } else {
        setError("Échec de la création du compte. Réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const persistStep = async () => {
    if (!user) return;
    const patch: Partial<DriverProfile> = {};
    if (STEPS[stepIdx].id === "identity") {
      Object.assign(patch, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address,
        legalForm: (form.legalForm || null) as any,
        companyName: form.companyName,
        siret: form.siret,
        licenseNumber: form.licenseNumber,
        licenseDeliveryDate: form.licenseDeliveryDate || null,
      });
    } else if (STEPS[stepIdx].id === "moto") {
      Object.assign(patch, {
        moto: {
          brand: form.motoBrand,
          model: form.motoModel,
          year: form.motoYear ? Number(form.motoYear) : null,
          plate: form.motoPlate.toUpperCase(),
          color: form.motoColor,
        },
      });
    } else if (STEPS[stepIdx].id === "bank") {
      Object.assign(patch, {
        bank: {
          iban: form.iban.replace(/\s+/g, "").toUpperCase(),
          bic: form.bic.toUpperCase(),
          accountHolder: form.accountHolder,
        },
      });
    }
    if (Object.keys(patch).length === 0) return;
    await updateDriverProfile(user.uid, patch);
  };

  const goNext = async () => {
    setError(null);
    const step = STEPS[stepIdx].id;

    if (step === "account") {
      await handleAccountStep();
      return;
    }

    if (step === "identity") {
      if (
        !form.firstName ||
        !form.lastName ||
        !form.phone ||
        !form.licenseNumber
      ) {
        setError(
          "Renseignez nom, prénom, téléphone et numéro de permis."
        );
        return;
      }
    }
    if (step === "moto") {
      if (!form.motoBrand || !form.motoModel || !form.motoPlate) {
        setError("Marque, modèle et immatriculation requis.");
        return;
      }
    }
    if (step === "bank") {
      if (!form.iban || !form.accountHolder) {
        setError("IBAN et titulaire du compte requis.");
        return;
      }
    }
    if (step === "documents") {
      const missing = REQUIRED_DOCS.filter((k) => !docs[k]?.url);
      if (missing.length > 0) {
        setError(
          `Documents manquants : ${missing.map((k) => DOC_LABELS[k]).join(", ")}.`
        );
        return;
      }
      setStepIdx(STEPS.length); // done
      return;
    }

    try {
      setSubmitting(true);
      await persistStep();
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const goPrev = () => {
    setError(null);
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // Écran de fin : dossier complété, en attente validation
  if (stepIdx >= STEPS.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-amber-400 mb-2">
            Dossier envoyé
          </h1>
          <p className="text-sm text-slate-300 mb-6">
            Merci ! Notre équipe vérifie vos documents et activera votre compte
            sous 24-48h ouvrées. Vous recevrez un email à {form.email}.
          </p>
          <Link
            href="/chauffeur"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-300 transition-colors"
          >
            Accéder à mon espace
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[stepIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <Bike className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-base font-bold text-amber-400 leading-tight">
                Izymoto Pro
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Devenir chauffeur
              </p>
            </div>
          </Link>
          {!user && (
            <Link
              href="/chauffeur/connexion"
              className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
            >
              J'ai déjà un compte →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Rejoignez la flotte Izymoto
          </h1>
          <p className="text-sm text-slate-400">
            Auto-entrepreneur, SASU ou EURL — c'est ouvert à toute structure
            légale. Activation sous 24-48h après vérification de vos pièces.
          </p>
        </div>

        <div className="mb-8">
          <ol className="flex items-center justify-between gap-1 sm:gap-2">
            {STEPS.map((s, i) => {
              const reached = i <= stepIdx;
              const done = i < stepIdx;
              return (
                <li
                  key={s.id}
                  className="flex-1 flex flex-col items-center text-center"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold mb-1.5 ring-1 ${
                      done
                        ? "bg-amber-400 text-black ring-amber-400"
                        : reached
                          ? "bg-amber-400/10 text-amber-400 ring-amber-400/40"
                          : "bg-slate-900 text-slate-500 ring-slate-800"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs uppercase tracking-wider ${
                      reached ? "text-amber-400" : "text-slate-600"
                    }`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7">
          {error && (
            <div className="mb-5 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-300">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentStep.id === "account" && (
            <Step title="Créez votre identifiant">
              <Field label="Email professionnel" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  className="input-dark"
                  placeholder="vous@exemple.fr"
                />
              </Field>
              <Field label="Mot de passe" required>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update({ password: e.target.value })}
                  className="input-dark"
                  placeholder="6 caractères min."
                />
              </Field>
              <Field label="Confirmer le mot de passe" required>
                <input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => update({ passwordConfirm: e.target.value })}
                  className="input-dark"
                />
              </Field>
            </Step>
          )}

          {currentStep.id === "identity" && (
            <Step title="Vos informations">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom" required>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => update({ firstName: e.target.value })}
                    className="input-dark"
                  />
                </Field>
                <Field label="Nom" required>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => update({ lastName: e.target.value })}
                    className="input-dark"
                  />
                </Field>
                <Field label="Téléphone" required>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    className="input-dark"
                    placeholder="06 12 34 56 78"
                  />
                </Field>
                <Field label="Date de naissance">
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => update({ dateOfBirth: e.target.value })}
                    className="input-dark"
                  />
                </Field>
              </div>
              <Field label="Adresse complète">
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update({ address: e.target.value })}
                  className="input-dark"
                  placeholder="12 rue de Paris, 75008 Paris"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Forme juridique">
                  <select
                    value={form.legalForm}
                    onChange={(e) =>
                      update({ legalForm: e.target.value as any })
                    }
                    className="input-dark"
                  >
                    <option value="">Sélectionner</option>
                    <option value="auto-entrepreneur">
                      Auto-entrepreneur
                    </option>
                    <option value="sasu">SASU</option>
                    <option value="eurl">EURL</option>
                    <option value="other">Autre</option>
                  </select>
                </Field>
                <Field label="SIRET">
                  <input
                    type="text"
                    value={form.siret}
                    onChange={(e) => update({ siret: e.target.value })}
                    className="input-dark"
                    placeholder="14 chiffres"
                  />
                </Field>
              </div>
              <Field label="Raison sociale">
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update({ companyName: e.target.value })}
                  className="input-dark"
                  placeholder="Nom de votre structure"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Numéro de permis A / A2" required>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => update({ licenseNumber: e.target.value })}
                    className="input-dark"
                  />
                </Field>
                <Field label="Date de délivrance du permis">
                  <input
                    type="date"
                    value={form.licenseDeliveryDate}
                    onChange={(e) =>
                      update({ licenseDeliveryDate: e.target.value })
                    }
                    className="input-dark"
                  />
                </Field>
              </div>
            </Step>
          )}

          {currentStep.id === "moto" && (
            <Step title="Votre moto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Marque" required>
                  <input
                    type="text"
                    value={form.motoBrand}
                    onChange={(e) => update({ motoBrand: e.target.value })}
                    className="input-dark"
                    placeholder="Yamaha, Honda, BMW…"
                  />
                </Field>
                <Field label="Modèle" required>
                  <input
                    type="text"
                    value={form.motoModel}
                    onChange={(e) => update({ motoModel: e.target.value })}
                    className="input-dark"
                    placeholder="T-Max 560, NC750X…"
                  />
                </Field>
                <Field label="Année">
                  <input
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={form.motoYear}
                    onChange={(e) => update({ motoYear: e.target.value })}
                    className="input-dark"
                  />
                </Field>
                <Field label="Couleur">
                  <input
                    type="text"
                    value={form.motoColor}
                    onChange={(e) => update({ motoColor: e.target.value })}
                    className="input-dark"
                  />
                </Field>
              </div>
              <Field label="Immatriculation" required>
                <input
                  type="text"
                  value={form.motoPlate}
                  onChange={(e) =>
                    update({ motoPlate: e.target.value.toUpperCase() })
                  }
                  className="input-dark uppercase"
                  placeholder="AA-123-BB"
                />
              </Field>
            </Step>
          )}

          {currentStep.id === "bank" && (
            <Step title="Coordonnées bancaires">
              <p className="text-xs text-slate-400 -mt-2 mb-2">
                Indispensable pour vous verser vos gains (80% du montant de
                chaque course). Vos données sont chiffrées et accessibles
                uniquement à notre équipe paiements.
              </p>
              <Field label="Titulaire du compte" required>
                <input
                  type="text"
                  value={form.accountHolder}
                  onChange={(e) => update({ accountHolder: e.target.value })}
                  className="input-dark"
                  placeholder="Nom Prénom ou raison sociale"
                />
              </Field>
              <Field label="IBAN" required>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => update({ iban: e.target.value.toUpperCase() })}
                  className="input-dark uppercase font-mono"
                  placeholder="FR76 ..."
                />
              </Field>
              <Field label="BIC">
                <input
                  type="text"
                  value={form.bic}
                  onChange={(e) => update({ bic: e.target.value.toUpperCase() })}
                  className="input-dark uppercase font-mono"
                />
              </Field>
            </Step>
          )}

          {currentStep.id === "documents" && user && (
            <Step title="Vos pièces justificatives">
              <p className="text-xs text-slate-400 -mt-2 mb-2">
                Formats acceptés : JPG, PNG, PDF — 10 Mo max par document.
              </p>
              <div className="space-y-3">
                {REQUIRED_DOCS.map((kind) => (
                  <DocumentUploadField
                    key={kind}
                    uid={user.uid}
                    kind={kind}
                    label={DOC_LABELS[kind]}
                    current={docs[kind] ?? null}
                    onChange={(d) =>
                      setDocs((prev) => ({ ...prev, [kind]: d ?? undefined }))
                    }
                  />
                ))}
                <DocumentUploadField
                  uid={user.uid}
                  kind="motoPhoto"
                  label={DOC_LABELS.motoPhoto}
                  helper="Une photo de face de votre moto facilite la reconnaissance par les clients."
                  current={docs.motoPhoto ?? null}
                  optional
                  onChange={(d) =>
                    setDocs((prev) => ({ ...prev, motoPhoto: d ?? undefined }))
                  }
                />
              </div>
            </Step>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-md transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Retour
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-amber-400 text-black rounded-md hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {currentStep.id === "documents"
                ? "Soumettre mon dossier"
                : "Continuer"}
              {!submitting && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        :global(.input-dark) {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: rgb(15 23 42);
          border: 1px solid rgb(51 65 85);
          border-radius: 0.375rem;
          color: rgb(241 245 249);
          font-size: 0.875rem;
          transition: border-color 0.15s ease;
        }
        :global(.input-dark:focus) {
          outline: none;
          border-color: rgb(251 191 36);
        }
        :global(.input-dark::placeholder) {
          color: rgb(100 116 139);
        }
      `}</style>
    </div>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-amber-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
