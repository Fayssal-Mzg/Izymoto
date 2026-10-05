// Catalogue d'attaques partagé par rules-emergency.test.mjs (toutes REFUSÉES) et
// rules-prod-exposure.test.mjs (résultat constaté sur les règles de PRODUCTION).
// `prod` = true : l'attaque est ACCEPTÉE par les règles de prod (exposition).
import { UID, BK, EMAIL, as, tsNow, serverTimestamp, mainDevisData, mainCardBookingData, mainDriverCreateData } from "./helpers.mjs";

const anon = (env) => env.unauthenticatedContext().firestore();
const user = (env, uid) => as(env, uid).firestore();

const guestDevis = () => mainDevisData({ userId: "guest_abcd1234", accountType: "guest" });

export const ATTACKS = [
  // --- lecture anonyme ---
  { name: "anonyme : get bookings/{id}", prod: true, run: (e) => anon(e).collection("bookings").doc(BK.clientOwn).get() },
  { name: "anonyme : list bookings", prod: true, run: (e) => anon(e).collection("bookings").get() },
  { name: "anonyme : list bookings du pool (status == awaiting_driver)", prod: true, run: (e) => anon(e).collection("bookings").where("status", "==", "awaiting_driver").get() },
  { name: "anonyme : get users/{uid}", prod: false, run: (e) => anon(e).collection("users").doc(UID.client).get() },
  { name: "anonyme : list users", prod: false, run: (e) => anon(e).collection("users").get() },
  { name: "anonyme : get drivers/{uid}", prod: false, run: (e) => anon(e).collection("drivers").doc(UID.driver).get() },
  { name: "anonyme : list drivers", prod: false, run: (e) => anon(e).collection("drivers").get() },

  // --- écriture anonyme sur bookings ---
  { name: "anonyme : création booking hors devis (confirmed / paid)", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), status: "confirmed", paymentStatus: "paid", isPaid: true }) },
  { name: "anonyme : modification d'un booking existant", prod: true, run: (e) => anon(e).collection("bookings").doc(BK.clientOwn).update({ status: "cancelled" }) },
  { name: "anonyme : suppression d'un booking", prod: true, run: (e) => anon(e).collection("bookings").doc(BK.clientOwn).delete() },
  { name: "anonyme : devis invité avec paymentStatus", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), paymentStatus: "paid" }) },
  { name: "anonyme : devis invité avec driverId", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), driverId: UID.driver }) },
  { name: "anonyme : devis invité avec companyId", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), companyId: "co1" }) },
  { name: "anonyme : devis invité avec isPaid", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), isPaid: true }) },
  { name: "anonyme : devis qui usurpe un userId réel (accountType guest)", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), userId: UID.client }) },
  { name: "anonyme : devis accountType registered", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), accountType: "registered", userId: UID.client }) },
  { name: "anonyme : injection directe dans le pool (status awaiting_driver)", prod: true, run: (e) => anon(e).collection("bookings").add({ ...guestDevis(), status: "awaiting_driver" }) },

  // --- élévation de privilèges sur users ---
  { name: "client : crée son users avec isAdmin:true", prod: true, run: (e) => user(e, UID.newUser).collection("users").doc(UID.newUser).set({ uid: UID.newUser, email: EMAIL(UID.newUser), role: "client", createdAt: serverTimestamp(), lastLogin: serverTimestamp(), isAdmin: true }) },
  { name: "client : crée son users avec role:admin", prod: true, run: (e) => user(e, UID.newUser).collection("users").doc(UID.newUser).set({ uid: UID.newUser, email: EMAIL(UID.newUser), role: "admin", createdAt: serverTimestamp(), isAdmin: false }) },
  { name: "client : crée son users avec companyId/companyRole", prod: true, run: (e) => user(e, UID.newUser).collection("users").doc(UID.newUser).set({ uid: UID.newUser, email: EMAIL(UID.newUser), role: "client", isAdmin: false, companyId: "co1", companyRole: "owner" }) },
  { name: "client : update son users isAdmin:true", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client).update({ isAdmin: true }) },
  { name: "client : setDoc merge isAdmin:true sur son users", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client).set({ isAdmin: true }, { merge: true }) },
  { name: "client : update son users role:admin", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client).update({ role: "admin" }) },
  { name: "client : update son users companyId/companyRole", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client).update({ companyId: "co1", companyRole: "owner" }) },
  { name: "chauffeur : repasse driver -> client puis admin (role:admin)", prod: true, run: (e) => user(e, UID.driver).collection("users").doc(UID.driver).update({ role: "admin" }) },
  { name: "client : lit le users d'un autre", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client2).get() },
  { name: "client : list tous les users", prod: true, run: (e) => user(e, UID.client).collection("users").get() },
  { name: "client : modifie le users d'un autre", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client2).update({ phoneNumber: "+33000" }) },
  { name: "client : supprime le users d'un autre", prod: true, run: (e) => user(e, UID.client).collection("users").doc(UID.client2).delete() },

  // --- wallets ---
  { name: "client : écrit son wallet", prod: true, run: (e) => user(e, UID.client).collection("wallets").doc(UID.client).update({ balanceCents: 999999 }) },
  { name: "client : crée un wallet pour soi", prod: true, run: (e) => user(e, UID.newUser).collection("wallets").doc(UID.newUser).set({ userId: UID.newUser, balanceCents: 999999 }) },
  { name: "client : écrit le wallet d'un autre", prod: true, run: (e) => user(e, UID.client).collection("wallets").doc(UID.client2).update({ balanceCents: 0 }) },
  { name: "client : lit le wallet d'un autre", prod: true, run: (e) => user(e, UID.client).collection("wallets").doc(UID.client2).get() },
  { name: "client : crée une walletTransaction à son nom", prod: true, run: (e) => user(e, UID.client).collection("walletTransactions").add({ userId: UID.client, type: "recharge", amountCents: 100000 }) },
  { name: "client : crée une walletTransaction au nom d'un autre", prod: true, run: (e) => user(e, UID.client).collection("walletTransactions").add({ userId: UID.client2, type: "debit", amountCents: 100 }) },
  { name: "client : modifie une walletTransaction existante", prod: true, run: (e) => user(e, UID.client).collection("walletTransactions").doc("tx1").update({ amountCents: 1 }) },
  { name: "client : lit les walletTransactions d'un autre", prod: true, run: (e) => user(e, UID.client).collection("walletTransactions").where("userId", "==", UID.client2).get() },
  { name: "anonyme : lit un wallet", prod: false, run: (e) => anon(e).collection("wallets").doc(UID.client).get() },

  // --- chauffeur ---
  { name: "chauffeur : se valide lui-même (update status:active)", prod: true, run: (e) => user(e, UID.driverPending).collection("drivers").doc(UID.driverPending).update({ status: "active" }) },
  { name: "chauffeur : se valide lui-même (setDoc merge status:active)", prod: true, run: (e) => user(e, UID.driverPending).collection("drivers").doc(UID.driverPending).set({ status: "active", availability: "online" }, { merge: true }) },
  { name: "chauffeur : crée sa fiche directement en status:active", prod: true, run: (e) => user(e, UID.driverNew).collection("drivers").doc(UID.driverNew).set({ ...mainDriverCreateData(UID.driverNew), status: "active" }) },
  { name: "chauffeur : modifie ses stats", prod: true, run: (e) => user(e, UID.driver).collection("drivers").doc(UID.driver).update({ "stats.totalEarningsCents": 99999999 }) },
  { name: "chauffeur pending : list le pool (where status == awaiting_driver)", prod: true, run: (e) => user(e, UID.driverPending).collection("bookings").where("status", "==", "awaiting_driver").get() },
  { name: "chauffeur pending : get d'une course du pool", prod: true, run: (e) => user(e, UID.driverPending).collection("bookings").doc(BK.pool).get() },
  { name: "chauffeur pending : accepte une course du pool", prod: true, run: (e) => user(e, UID.driverPending).collection("bookings").doc(BK.pool).update({ driverId: UID.driverPending, status: "assigned", driverAcceptedAt: tsNow(), commissionRate: 0.2, platformShareCents: 1600, driverShareCents: 6400, updatedAt: tsNow() }) },
  { name: "chauffeur : lit la course assignée à un autre", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.otherDriver).get() },
  { name: "chauffeur : modifie la course assignée à un autre (demarre)", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.otherDriver).update({ status: "in_progress", driverStartedAt: tsNow(), updatedAt: tsNow() }) },
  { name: "chauffeur : s'attribue une course déjà assignée", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.otherDriver).update({ driverId: UID.driver, driverAcceptedAt: tsNow(), status: "assigned", commissionRate: 0.2, platformShareCents: 1600, driverShareCents: 6400, updatedAt: tsNow() }) },
  { name: "chauffeur : accepte une course avec commission truquée", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.pool).update({ driverId: UID.driver, status: "assigned", driverAcceptedAt: tsNow(), commissionRate: 0, platformShareCents: 0, driverShareCents: 8000, updatedAt: tsNow() }) },
  { name: "chauffeur : accepte une course et change le prix", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.pool).update({ driverId: UID.driver, status: "assigned", driverAcceptedAt: tsNow(), commissionRate: 0.2, platformShareCents: 1600, driverShareCents: 6400, updatedAt: tsNow(), prix: 1 }) },
  { name: "chauffeur hors service (offline) : accepte une course", prod: true, run: async (e) => {
      await e.withSecurityRulesDisabled((c) => c.firestore().collection("drivers").doc(UID.driver).update({ availability: "offline" }));
      return user(e, UID.driver).collection("bookings").doc(BK.pool).update({ driverId: UID.driver, status: "assigned", driverAcceptedAt: tsNow(), commissionRate: 0.2, platformShareCents: 1600, driverShareCents: 6400, updatedAt: tsNow() });
    } },
  { name: "chauffeur : termine une course d'un autre", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.otherDriver).update({ status: "completed_by_driver", driverCompletedAt: tsNow(), updatedAt: tsNow() }) },
  { name: "chauffeur : passe une course assignée en completed sans passer par la transition (status completed)", prod: true, run: (e) => user(e, UID.driver).collection("bookings").doc(BK.assigned).update({ status: "completed", updatedAt: tsNow() }) },

  // --- client ---
  { name: "client : lit la course d'un autre (get)", prod: true, run: (e) => user(e, UID.client).collection("bookings").doc(BK.otherClient).get() },
  { name: "client : list les courses d'un autre (where userId == autre)", prod: true, run: (e) => user(e, UID.client).collection("bookings").where("userId", "==", UID.client2).get() },
  { name: "client : list toutes les bookings", prod: true, run: (e) => user(e, UID.client).collection("bookings").get() },
  { name: "client : modifie sa propre course (isPaid / status)", prod: true, run: (e) => user(e, UID.client).collection("bookings").doc(BK.clientOwn).update({ isPaid: true, status: "completed", paymentStatus: "captured" }) },
  { name: "client : modifie la course d'un autre", prod: true, run: (e) => user(e, UID.client).collection("bookings").doc(BK.otherClient).update({ status: "cancelled" }) },
  { name: "client : supprime une course", prod: true, run: (e) => user(e, UID.client).collection("bookings").doc(BK.clientOwn).delete() },
  { name: "client : crée une course payée au nom d'un autre", prod: true, run: (e) => user(e, UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), userId: UID.client2 }) },
  { name: "client : crée une course déjà payée (captured / isPaid:true)", prod: true, run: (e) => user(e, UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), paymentStatus: "captured", isPaid: true }) },
  { name: "client : crée une course directement dans le pool (awaiting_driver)", prod: true, run: (e) => user(e, UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), status: "awaiting_driver" }) },
  { name: "client : crée une course avec companyId", prod: true, run: (e) => user(e, UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), companyId: "co1" }) },
  { name: "client : crée une course avec un faux paymentId (pas pi_)", prod: true, run: (e) => user(e, UID.client).collection("bookings").add({ ...mainCardBookingData(UID.client), paymentId: "fake" }) },
  { name: "client : modifie la fiche d'un chauffeur", prod: true, run: (e) => user(e, UID.client).collection("drivers").doc(UID.driver).update({ status: "suspended" }) },
  { name: "client : lit la fiche d'un chauffeur (IBAN)", prod: true, run: (e) => user(e, UID.client).collection("drivers").doc(UID.driver).get() },
  { name: "client : list drivers", prod: true, run: (e) => user(e, UID.client).collection("drivers").get() },

  // --- admin-only / inconnues ---
  { name: "client : lit factures", prod: true, run: (e) => user(e, UID.client).collection("factures").doc("f1").get() },
  { name: "client : écrit factures", prod: true, run: (e) => user(e, UID.client).collection("factures").add({ montant: 0 }) },
  { name: "client : lit companies", prod: true, run: (e) => user(e, UID.client).collection("companies").doc("co1").get() },
  { name: "client : écrit companies", prod: true, run: (e) => user(e, UID.client).collection("companies").doc("co1").update({ ownerUid: UID.client }) },
  { name: "client : lit companies/{id}/members", prod: true, run: (e) => user(e, UID.client).collection("companies").doc("co1").collection("members").doc(UID.client2).get() },
  { name: "client : écrit companies/{id}/members", prod: true, run: (e) => user(e, UID.client).collection("companies").doc("co1").collection("members").doc(UID.client).set({ uid: UID.client, role: "owner" }) },
  { name: "client : lit companyInvitations", prod: true, run: (e) => user(e, UID.client).collection("companyInvitations").doc("tok").get() },
  { name: "client : lit une collection inconnue", prod: true, run: (e) => user(e, UID.client).collection("secrets").doc("x").get() },
  { name: "client : écrit une collection inconnue", prod: true, run: (e) => user(e, UID.client).collection("secrets").doc("x").set({ a: 1 }) },
  { name: "anonyme : écrit une collection inconnue", prod: false, run: (e) => anon(e).collection("secrets").doc("x").set({ a: 1 }) },
];
