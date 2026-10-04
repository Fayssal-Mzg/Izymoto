"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Wallet,
  Users,
  UserPlus,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Check,
  Crown,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatEuro } from "@/lib/wallet/tiers";

interface OverviewMember {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "owner" | "member";
  monthlyBudgetCents: number;
  spentThisPeriodCents: number;
  remainingBudgetCents: number | null;
}

interface OverviewInvitation {
  token: string;
  email: string;
  monthlyBudgetCents: number;
  expiresAtMs: number;
}

interface Overview {
  companyId: string;
  name: string;
  walletBalanceCents: number;
  cumulativeRechargedCents: number;
  isOwner: boolean;
  myBudgetCents: number;
  myRemainingBudgetCents: number | null;
  members: OverviewMember[];
  pendingInvitations: OverviewInvitation[];
}

export default function CompanySpacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!user) throw new Error("Non connecté");
      const token = await user.getIdToken();
      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
    },
    [user]
  );

  const loadOverview = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/company/overview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement");
      setOverview(data.company);
      setHasCompany(Boolean(data.company));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [user, authedFetch]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/connexion?redirectTo=/profil/entreprise");
      return;
    }
    loadOverview();
  }, [user, authLoading, router, loadOverview]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-950" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/profil"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au profil
      </Link>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {!hasCompany ? (
        <CreateCompanyForm authedFetch={authedFetch} onCreated={loadOverview} />
      ) : overview ? (
        <CompanyDashboard
          overview={overview}
          authedFetch={authedFetch}
          onChanged={loadOverview}
        />
      ) : null}
    </div>
  );
}

function CreateCompanyForm({
  authedFetch,
  onCreated,
}: {
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [siret, setSiret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr("Le nom de la société est requis");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/company/create", {
        method: "POST",
        body: JSON.stringify({ name, billingEmail, siret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-8">
      <div className="w-12 h-12 rounded-full bg-navy-950 flex items-center justify-center mb-5">
        <Building2 className="h-6 w-6 text-mint-400" />
      </div>
      <h1 className="text-2xl font-bold text-navy-950 mb-2">
        Créer votre compte entreprise
      </h1>
      <p className="text-navy-600 text-sm mb-6 max-w-xl">
        Ouvrez un portefeuille partagé, invitez vos collaborateurs et attribuez à
        chacun un budget mensuel. Une seule recharge, zéro note de frais.
      </p>

      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Nom de la société *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Acme SAS"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-mint-400 focus:border-mint-400"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Email de facturation
          </label>
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder="compta@acme.fr"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-mint-400 focus:border-mint-400"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            SIRET (optionnel)
          </label>
          <input
            type="text"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-mint-400 focus:border-mint-400"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 bg-mint-400 text-navy-950 font-semibold px-6 py-3 rounded-lg hover:bg-mint-300 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          Créer la société
        </button>
      </form>
    </div>
  );
}

function CompanyDashboard({
  overview,
  authedFetch,
  onChanged,
}: {
  overview: Overview;
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-950 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-mint-500" />
          {overview.name}
        </h1>
        {!overview.isOwner && (
          <p className="text-sm text-navy-600 mt-1">
            Vous êtes collaborateur de cette société.
          </p>
        )}
      </div>

      {/* Soldes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-navy-950 text-white p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
            <Wallet className="h-4 w-4 text-mint-400" />
            Solde entreprise
          </div>
          <div className="text-3xl font-bold mt-1 tabular-nums">
            {formatEuro(overview.walletBalanceCents / 100)}
          </div>
          {overview.isOwner && (
            <Link
              href="/portefeuille#paliers"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-mint-300 hover:text-mint-200"
            >
              Recharger le portefeuille
            </Link>
          )}
        </div>

        <div className="bg-white border border-navy-100 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
            <Wallet className="h-4 w-4" />
            {overview.myBudgetCents > 0 ? "Mon budget mensuel restant" : "Mon budget"}
          </div>
          <div className="text-3xl font-bold mt-1 tabular-nums text-navy-950">
            {overview.myBudgetCents > 0
              ? formatEuro((overview.myRemainingBudgetCents ?? 0) / 100)
              : "Illimité"}
          </div>
          {overview.myBudgetCents > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Plafond : {formatEuro(overview.myBudgetCents / 100)} / mois
            </p>
          )}
        </div>
      </div>

      {overview.isOwner && (
        <>
          <InviteForm authedFetch={authedFetch} onInvited={onChanged} />
          <MembersList
            members={overview.members}
            authedFetch={authedFetch}
            onChanged={onChanged}
          />
          {overview.pendingInvitations.length > 0 && (
            <PendingInvitations invitations={overview.pendingInvitations} />
          )}
        </>
      )}
    </div>
  );
}

function InviteForm({
  authedFetch,
  onInvited,
}: {
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!email.includes("@")) {
      setErr("Email invalide");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authedFetch("/api/company/invite", {
        method: "POST",
        body: JSON.stringify({
          email,
          monthlyBudgetEur: budget ? parseFloat(budget.replace(",", ".")) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMsg(
        data.emailSent
          ? `Invitation envoyée à ${email}.`
          : `Invitation créée. Lien à partager : ${data.inviteUrl}`
      );
      setEmail("");
      setBudget("");
      onInvited();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-cream-50 border border-navy-100 rounded-2xl p-6">
      <h2 className="font-bold text-navy-950 flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-mint-600" />
        Inviter un collaborateur
      </h2>
      {err && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 break-words">
          {msg}
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborateur@email.fr"
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-mint-400 focus:border-mint-400"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Budget €/mois"
          className="sm:w-40 p-3 border border-gray-300 rounded-lg focus:ring-mint-400 focus:border-mint-400"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 bg-navy-950 text-white font-semibold px-5 py-3 rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inviter"}
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-2">
        Budget vide ou 0 = illimité (dans la limite du solde entreprise).
      </p>
    </div>
  );
}

function MembersList({
  members,
  authedFetch,
  onChanged,
}: {
  members: OverviewMember[];
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onChanged: () => void;
}) {
  return (
    <div>
      <h2 className="font-bold text-navy-950 flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-mint-600" />
        Collaborateurs ({members.length})
      </h2>
      <ul className="space-y-3">
        {members.map((m) => (
          <MemberRow
            key={m.uid}
            member={m}
            authedFetch={authedFetch}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </div>
  );
}

function MemberRow({
  member,
  authedFetch,
  onChanged,
}: {
  member: OverviewMember;
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState(
    member.monthlyBudgetCents > 0 ? String(member.monthlyBudgetCents / 100) : ""
  );
  const [busy, setBusy] = useState(false);

  const saveBudget = async () => {
    setBusy(true);
    try {
      const res = await authedFetch("/api/company/member/budget", {
        method: "POST",
        body: JSON.stringify({
          memberUid: member.uid,
          monthlyBudgetEur: budget ? parseFloat(budget.replace(",", ".")) : 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      setEditing(false);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Retirer ${member.email || "ce collaborateur"} de la société ?`))
      return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/company/member/remove", {
        method: "POST",
        body: JSON.stringify({ memberUid: member.uid }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const isOwner = member.role === "owner";

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-navy-950 truncate flex items-center gap-1.5">
          {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
          {member.displayName || member.email || member.uid}
        </div>
        <div className="text-sm text-gray-500 truncate">{member.email}</div>
      </div>

      <div className="sm:text-right">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0 = illimité"
              className="w-32 p-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={saveBudget}
              disabled={busy}
              className="p-2 bg-mint-400 text-navy-950 rounded-lg hover:bg-mint-300 disabled:opacity-50"
              title="Enregistrer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                Budget / mois
              </div>
              <div className="font-semibold tabular-nums text-navy-950">
                {member.monthlyBudgetCents > 0
                  ? formatEuro(member.monthlyBudgetCents / 100)
                  : "Illimité"}
              </div>
            </div>
            {!isOwner && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 text-gray-500 hover:text-navy-950 hover:bg-gray-100 rounded-lg"
                  title="Modifier le budget"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={remove}
                  disabled={busy}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  title="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function PendingInvitations({
  invitations,
}: {
  invitations: OverviewInvitation[];
}) {
  return (
    <div>
      <h2 className="font-bold text-navy-950 mb-3 text-sm uppercase tracking-wider">
        Invitations en attente ({invitations.length})
      </h2>
      <ul className="space-y-2">
        {invitations.map((inv) => (
          <li
            key={inv.token}
            className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-amber-900 truncate">{inv.email}</span>
            <span className="text-amber-700 tabular-nums flex-shrink-0">
              {inv.monthlyBudgetCents > 0
                ? `${formatEuro(inv.monthlyBudgetCents / 100)}/mois`
                : "illimité"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
