import { randomBytes } from "crypto";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin-server";
import { WalletError } from "@/lib/wallet/server";
import {
  currentPeriodKey,
  getCompanyContextForUser,
  type CompanyMemberDoc,
  type CompanyDoc,
} from "@/lib/wallet/companyServer";

// Invitations de collaborateurs à une société (flow self-service).
// Token aléatoire = docId de companyInvitations/{token}, utilisé dans le lien
// email /entreprise/invitation/{token}.

const COMPANIES = "companies";
const MEMBERS = "members";
const INVITATIONS = "companyInvitations";
const USERS = "users";

const INVITE_TTL_DAYS = 14;

export interface CompanyInvitationDoc {
  companyId: string;
  companyName: string;
  email: string; // lowercased
  role: "member";
  monthlyBudgetCents: number;
  status: "pending" | "accepted" | "revoked";
  invitedByUid: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface CreateInvitationResult {
  token: string;
  companyName: string;
  email: string;
  monthlyBudgetCents: number;
}

// Crée (ou réémet) une invitation. Seul l'owner peut inviter.
export async function createInvitation(params: {
  ownerUid: string;
  email: string;
  monthlyBudgetCents?: number;
}): Promise<CreateInvitationResult> {
  const email = (params.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new WalletError("INVALID_AMOUNT", "Adresse email invalide");
  }
  const monthlyBudgetCents = Math.max(0, params.monthlyBudgetCents ?? 0);

  const ctx = await getCompanyContextForUser(params.ownerUid);
  if (!ctx) throw new WalletError("FORBIDDEN", "Aucune société rattachée");
  if (!ctx.isOwner) {
    throw new WalletError("FORBIDDEN", "Seul l'administrateur peut inviter");
  }

  const db = getAdminFirestore();
  const token = randomBytes(24).toString("hex");
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const invitation: CompanyInvitationDoc = {
    companyId: ctx.companyId,
    companyName: ctx.company.name,
    email,
    role: "member",
    monthlyBudgetCents,
    status: "pending",
    invitedByUid: params.ownerUid,
    createdAt: now,
    expiresAt,
  };
  await db.collection(INVITATIONS).doc(token).set(invitation);

  return {
    token,
    companyName: ctx.company.name,
    email,
    monthlyBudgetCents,
  };
}

export interface InvitationPreview {
  companyName: string;
  email: string;
  status: CompanyInvitationDoc["status"];
  expired: boolean;
}

// Lecture publique (serveur) d'une invitation pour afficher la page d'acceptation.
export async function getInvitation(
  token: string
): Promise<InvitationPreview | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(INVITATIONS).doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data() as CompanyInvitationDoc;
  return {
    companyName: data.companyName,
    email: data.email,
    status: data.status,
    expired: data.expiresAt.toMillis() < Date.now(),
  };
}

// Accepte une invitation : crée le membre, rattache l'utilisateur, marque
// l'invitation "accepted". Transaction pour cohérence.
export async function acceptInvitation(params: {
  token: string;
  uid: string;
  email: string | null;
  displayName: string | null;
}): Promise<{ companyId: string }> {
  const { token, uid, email, displayName } = params;
  const db = getAdminFirestore();
  const inviteRef = db.collection(INVITATIONS).doc(token);
  const userRef = db.collection(USERS).doc(uid);

  return db.runTransaction(async (tx: Transaction) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists) {
      throw new WalletError("FORBIDDEN", "Invitation introuvable");
    }
    const invite = inviteSnap.data() as CompanyInvitationDoc;
    if (invite.status !== "pending") {
      throw new WalletError("CONFLICT", "Invitation déjà utilisée ou révoquée");
    }
    if (invite.expiresAt.toMillis() < Date.now()) {
      throw new WalletError("FORBIDDEN", "Invitation expirée");
    }

    const userSnap = await tx.get(userRef);
    const existingCompanyId = userSnap.exists
      ? (userSnap.data() as { companyId?: string }).companyId
      : undefined;
    if (existingCompanyId) {
      throw new WalletError("CONFLICT", "Vous appartenez déjà à une société");
    }

    const companyRef = db.collection(COMPANIES).doc(invite.companyId);
    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) {
      throw new WalletError("WALLET_NOT_FOUND", "Société introuvable");
    }
    const company = companySnap.data() as CompanyDoc;

    const now = Timestamp.now();
    const memberRef = companyRef.collection(MEMBERS).doc(uid);
    const memberDoc: CompanyMemberDoc = {
      uid,
      email: email || invite.email,
      displayName,
      role: "member",
      status: "active",
      monthlyBudgetCents: invite.monthlyBudgetCents,
      spentThisPeriodCents: 0,
      budgetPeriodKey: currentPeriodKey(),
      invitedAt: invite.createdAt,
      joinedAt: now,
    };
    tx.set(memberRef, memberDoc);

    tx.update(companyRef, {
      memberCount: (company.memberCount ?? 1) + 1,
      updatedAt: now,
    });
    tx.set(
      userRef,
      { companyId: invite.companyId, companyRole: "member" },
      { merge: true }
    );
    tx.update(inviteRef, { status: "accepted", acceptedAt: now, acceptedByUid: uid });

    return { companyId: invite.companyId };
  });
}

export async function revokeInvitation(params: {
  ownerUid: string;
  token: string;
}): Promise<void> {
  const ctx = await getCompanyContextForUser(params.ownerUid);
  if (!ctx || !ctx.isOwner) {
    throw new WalletError("FORBIDDEN", "Seul l'administrateur peut révoquer");
  }
  const db = getAdminFirestore();
  const inviteRef = db.collection(INVITATIONS).doc(params.token);
  const snap = await inviteRef.get();
  if (!snap.exists) return;
  const invite = snap.data() as CompanyInvitationDoc;
  if (invite.companyId !== ctx.companyId) {
    throw new WalletError("FORBIDDEN", "Invitation d'une autre société");
  }
  if (invite.status === "pending") {
    await inviteRef.update({ status: "revoked" });
  }
}
