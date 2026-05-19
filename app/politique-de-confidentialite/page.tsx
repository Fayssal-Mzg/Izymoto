import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité | IzyMoto",
  description:
    "Politique de confidentialité IzyMoto : transparence totale sur les données que nous collectons, pourquoi, combien de temps, avec qui, et comment exercer vos droits RGPD.",
  alternates: { canonical: "https://izymoto.com/politique-de-confidentialite" },
  robots: { index: true, follow: true },
};

export default function PolitiqueDeConfidentialite() {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Politique de confidentialité
        </h1>
        <p className="text-center text-sm text-gray-500 mb-10">
          Version en vigueur au 19 mai 2026
        </p>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">1. Préambule</h2>
          <p className="mb-4">
            Chez IzyMoto, nous collectons le strict minimum de données
            nécessaires pour vous transporter en moto-taxi à Paris et en
            Île-de-France en toute sécurité. Cette politique vous explique{" "}
            <strong>exactement quoi, pourquoi, combien de temps, avec qui</strong>
            , et comment vous gardez la main sur vos données.
          </p>
          <p>
            Elle s’applique au site{" "}
            <a href="https://izymoto.com" className="underline">
              izymoto.com
            </a>{" "}
            ainsi qu’à tous nos services de réservation et de transport. Elle
            est conforme au Règlement Général sur la Protection des Données
            (RGPD, règlement UE 2016/679) et à la loi française Informatique &
            Libertés.
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            2. Qui est responsable de vos données ?
          </h2>
          <p className="mb-4">
            Le responsable de traitement est :
          </p>
          <div className="pl-4 border-l-4 border-amber-400 mb-4">
            {/* TODO Fayssal: confirmer la forme juridique, le SIREN/SIRET et le représentant légal */}
            <p className="mb-1">
              <strong>IzyMoto</strong> — [TODO : SARL / SAS / EI à confirmer]
            </p>
            <p className="mb-1">
              25 Rue de Ponthieu, 75008 Paris, France
            </p>
            <p className="mb-1">SIREN : [TODO à confirmer]</p>
            <p className="mb-1">
              Représenté par : [TODO : nom du représentant légal à confirmer]
            </p>
            <p className="mb-1">Téléphone : +33 6 49 50 25 25</p>
            <p>
              Email général : contact@izymoto.com — Email RGPD dédié :{" "}
              rgpd@izymoto.com
            </p>
          </div>
          <p>
            IzyMoto n’a pas désigné de Délégué à la Protection des Données (DPO)
            car la nature et le volume de nos traitements ne le rendent pas
            obligatoire au sens de l’article 37 du RGPD. Toute question
            concernant vos données doit être adressée à{" "}
            <strong>rgpd@izymoto.com</strong>.
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            3. Quelles données nous collectons, et auprès de qui
          </h2>
          <p className="mb-6">
            Nous collectons uniquement les données <strong>strictement
            nécessaires</strong> à chaque service. Le détail par profil
            d’utilisateur :
          </p>

          <h3 className="text-lg font-semibold mb-2">
            3.1 Clients particuliers (réservation de course)
          </h3>
          <div className="pl-4 border-l-4 border-gray-200 mb-6">
            <p className="mb-1">• Nom, prénom</p>
            <p className="mb-1">• Numéro de téléphone (contact chauffeur)</p>
            <p className="mb-1">• Adresse email (confirmation de course)</p>
            <p className="mb-1">
              • Adresse de départ et d’arrivée du trajet (transmise au chauffeur)
            </p>
            <p className="mb-1">• Date et heure de la course</p>
            <p className="mb-1">
              • Mot de passe (chiffré, jamais lisible par nos équipes)
            </p>
            <p className="mb-1">
              • Données de paiement (numéro de carte, CVC) :{" "}
              <strong>traitées exclusivement par Stripe</strong>, jamais stockées
              sur nos serveurs
            </p>
            <p className="mb-1">
              • Instructions ou notes ponctuelles (ex. : « bagages volumineux »)
            </p>
            <p>• Historique des réservations passées</p>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            3.2 Clients entreprise (espace Grand Compte / wallet B2B)
          </h3>
          <div className="pl-4 border-l-4 border-gray-200 mb-6">
            <p className="mb-1">• Raison sociale, SIRET, adresse de facturation</p>
            <p className="mb-1">• Nom, fonction et coordonnées du contact référent</p>
            <p className="mb-1">• RIB / IBAN pour facturation (le cas échéant)</p>
            <p>
              • Solde wallet, historique des recharges et des courses imputées
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            3.3 Chauffeurs (espace conducteur)
          </h3>
          <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            ⚠️ Les données chauffeurs incluent des documents d’identification et
            bancaires. Nous appliquons un niveau de sécurité renforcé (chiffrement
            au repos, accès restreint, traçabilité) et une durée de conservation
            encadrée par la réglementation anti-blanchiment (5 ans après la fin de
            la relation contractuelle).
          </p>
          <div className="pl-4 border-l-4 border-gray-200 mb-6">
            <p className="mb-1">• État civil, date et lieu de naissance, nationalité</p>
            <p className="mb-1">• Adresse personnelle</p>
            <p className="mb-1">
              • Pièce d’identité (CNI / passeport) — collectée et vérifiée par
              notre prestataire de paiement Stripe dans le cadre de la lutte
              contre le blanchiment (KYC)
            </p>
            <p className="mb-1">
              • IBAN / RIB — collecté et stocké par Stripe Connect, jamais sur nos
              serveurs
            </p>
            <p className="mb-1">
              • SIRET et statut juridique (auto-entrepreneur, EI, EURL…)
            </p>
            <p className="mb-1">
              • Permis A (moto), carte de capacité moto-taxi (T3P), carte grise
              du véhicule, attestation d’assurance professionnelle
            </p>
            <p className="mb-1">
              • Photos du véhicule (plusieurs angles) et photo de profil du
              chauffeur (visible des clients)
            </p>
            <p>
              • Statut de disponibilité (en service / hors service),
              géolocalisation lors d’une course (à venir, sous consentement)
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            3.4 Visiteurs du site (sans inscription)
          </h3>
          <div className="pl-4 border-l-4 border-gray-200 mb-2">
            <p className="mb-1">
              • Adresse IP, type de navigateur, système d’exploitation (logs
              serveur, conservés 6 mois)
            </p>
            <p className="mb-1">
              • Cookies techniques (panier de réservation en cours, langue,
              session) — déposés sans consentement, indispensables au
              fonctionnement
            </p>
            <p className="mb-1">
              • Cookies analytiques et de mesure d’audience — déposés uniquement
              avec votre consentement explicite via le bandeau cookies
            </p>
            <p>
              • Échanges avec notre assistant conversationnel (chatbot Limova) —
              conservés 12 mois pour amélioration du service
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            4. Pourquoi nous collectons ces données (finalités & bases légales)
          </h2>
          <p className="mb-4">
            La CNIL exige que nous indiquions pour chaque traitement la{" "}
            <strong>finalité</strong> (à quoi ça sert) et la{" "}
            <strong>base légale</strong> (pourquoi nous avons le droit de le
            faire). Voici la liste complète et transparente :
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">
                    Traitement
                  </th>
                  <th className="text-left p-3 border-b border-gray-200">
                    Finalité
                  </th>
                  <th className="text-left p-3 border-b border-gray-200">
                    Base légale (RGPD)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Création de compte client</td>
                  <td className="p-3">
                    Vous permettre de réserver, retrouver vos courses, suivre vos
                    factures
                  </td>
                  <td className="p-3">
                    Exécution du contrat
                    <br />
                    <span className="text-xs text-gray-500">
                      art. 6.1.b RGPD
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Réservation et course</td>
                  <td className="p-3">
                    Organiser le trajet, transmettre l’adresse au chauffeur, vous
                    contacter en cas d’imprévu
                  </td>
                  <td className="p-3">Exécution du contrat</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Paiement</td>
                  <td className="p-3">
                    Encaisser la course, capturer/annuler l’autorisation
                    bancaire, prévenir la fraude
                  </td>
                  <td className="p-3">
                    Exécution du contrat + obligation légale (comptable)
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Facturation et archivage comptable</td>
                  <td className="p-3">
                    Conserver les factures conformément au droit commercial
                  </td>
                  <td className="p-3">
                    Obligation légale
                    <br />
                    <span className="text-xs text-gray-500">
                      art. L123-22 Code de commerce — 10 ans
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">
                    Vérification d’identité chauffeur (KYC)
                  </td>
                  <td className="p-3">
                    Lutter contre le travail dissimulé, le blanchiment et
                    s’assurer que le chauffeur est autorisé à exercer
                  </td>
                  <td className="p-3">
                    Obligation légale
                    <br />
                    <span className="text-xs text-gray-500">
                      Code monétaire et financier
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Newsletters et marketing email</td>
                  <td className="p-3">
                    Vous informer d’offres, nouveautés ou bons plans IzyMoto
                  </td>
                  <td className="p-3">
                    Consentement explicite (case à cocher)
                    <br />
                    <span className="text-xs text-gray-500">
                      art. 6.1.a RGPD
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">
                    Cookies analytiques (mesure d’audience)
                  </td>
                  <td className="p-3">
                    Comprendre l’usage du site pour l’améliorer
                  </td>
                  <td className="p-3">Consentement via bandeau cookies</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Chatbot IA (Limova)</td>
                  <td className="p-3">
                    Vous répondre 24/7 sur tarifs, zones, FAQ
                  </td>
                  <td className="p-3">
                    Intérêt légitime + transparence (vous savez que c’est une IA)
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Sécurité, logs et anti-fraude</td>
                  <td className="p-3">
                    Détecter les tentatives d’intrusion et protéger vos comptes
                  </td>
                  <td className="p-3">Intérêt légitime</td>
                </tr>
                <tr>
                  <td className="p-3">
                    Géolocalisation chauffeur (en cours de développement)
                  </td>
                  <td className="p-3">
                    Permettre au client de suivre l’arrivée de son chauffeur
                  </td>
                  <td className="p-3">
                    Consentement (chauffeur + client)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600">
            Nous ne procédons à <strong>aucune prise de décision entièrement
            automatisée</strong> ayant un effet juridique à votre encontre
            (article 22 RGPD). Aucune donnée n’est utilisée à des fins de{" "}
            <strong>profilage publicitaire</strong> ni revendue.
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            5. Combien de temps nous gardons vos données
          </h2>
          <p className="mb-4">
            Une fois la finalité atteinte, vos données sont{" "}
            <strong>supprimées ou anonymisées</strong>. Détail par catégorie :
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b">Donnée</th>
                  <th className="text-left p-3 border-b">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Compte client actif</td>
                  <td className="p-3">
                    Tant que le compte est utilisé (suppression à votre demande
                    ou après 3 ans d’inactivité totale)
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Données de réservation</td>
                  <td className="p-3">
                    3 ans en base active (délai de prescription des litiges
                    contractuels)
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Factures et pièces comptables</td>
                  <td className="p-3">10 ans (Code de commerce)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">
                    Données chauffeur (KYC, RIB, justificatifs)
                  </td>
                  <td className="p-3">
                    Durée de la relation contractuelle + 5 ans (obligation
                    anti-blanchiment)
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Cookies de mesure d’audience</td>
                  <td className="p-3">13 mois maximum (recommandation CNIL)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Logs techniques (IP, requêtes)</td>
                  <td className="p-3">6 mois</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Conversations chatbot Limova</td>
                  <td className="p-3">12 mois</td>
                </tr>
                <tr>
                  <td className="p-3">
                    Prospects (formulaire contact sans réservation)
                  </td>
                  <td className="p-3">3 ans après le dernier contact actif</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            6. À qui vos données sont transmises
          </h2>
          <p className="mb-4">
            <strong>Nous ne vendons jamais vos données.</strong> Nous les
            partageons uniquement avec :
          </p>

          <h3 className="text-lg font-semibold mb-2">6.1 En interne</h3>
          <div className="pl-4 border-l-4 border-gray-200 mb-6">
            <p className="mb-1">
              • <strong>Les chauffeurs</strong> qui acceptent votre course :
              prénom, téléphone, adresse de prise en charge, adresse d’arrivée,
              instructions
            </p>
            <p>
              • <strong>Nos équipes administratives</strong> (admin habilités) :
              accès aux réservations, paiements et profils pour assurer le
              service et la facturation
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            6.2 Nos sous-traitants (prestataires techniques)
          </h3>
          <p className="mb-4">
            Chaque sous-traitant est lié par un{" "}
            <strong>contrat de sous-traitance RGPD (DPA)</strong> et ne peut
            traiter vos données que pour notre compte et selon nos instructions.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b">Sous-traitant</th>
                  <th className="text-left p-3 border-b">Rôle</th>
                  <th className="text-left p-3 border-b">Localisation</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Stripe</td>
                  <td className="p-3">
                    Paiements, vérification KYC chauffeur, versements
                  </td>
                  <td className="p-3">Irlande (UE) + USA</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Google Firebase</td>
                  <td className="p-3">
                    Authentification, base de données, hébergement
                  </td>
                  <td className="p-3">UE + USA</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Cloudflare R2</td>
                  <td className="p-3">
                    Stockage sécurisé des documents chauffeurs
                  </td>
                  <td className="p-3">UE</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Google Maps</td>
                  <td className="p-3">
                    Calcul d’itinéraires, autocomplétion d’adresses
                  </td>
                  <td className="p-3">USA</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Vercel</td>
                  <td className="p-3">Hébergement du site izymoto.com</td>
                  <td className="p-3">UE (région Paris/Francfort) + USA</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Resend</td>
                  <td className="p-3">
                    Envoi des emails transactionnels (confirmation, devis)
                  </td>
                  <td className="p-3">UE</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">Limova</td>
                  <td className="p-3">Chatbot conversationnel IA</td>
                  <td className="p-3">
                    {/* TODO Fayssal: vérifier l'hébergement Limova (UE / USA) */}
                    UE (à confirmer)
                  </td>
                </tr>
                <tr>
                  <td className="p-3">
                    Google Analytics 4 (déploiement à venir)
                  </td>
                  <td className="p-3">Mesure d’audience anonymisée</td>
                  <td className="p-3">USA</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            6.3 Transferts hors Union Européenne
          </h3>
          <p className="mb-3">
            Certains prestataires (Stripe, Google, Vercel, GA4) opèrent
            partiellement depuis les <strong>États-Unis</strong>. Ces transferts
            sont encadrés par :
          </p>
          <div className="pl-4 border-l-4 border-gray-200 mb-4">
            <p className="mb-1">
              • Les <strong>Clauses Contractuelles Types</strong> de la
              Commission Européenne (2021/914)
            </p>
            <p className="mb-1">
              • Le <strong>Data Privacy Framework</strong> (DPF) pour les
              entreprises américaines certifiées (Stripe, Google, Vercel sont
              certifiés DPF)
            </p>
            <p>
              • Des mesures complémentaires : chiffrement en transit (TLS),
              chiffrement au repos, contrôles d’accès stricts
            </p>
          </div>

          <h3 className="text-lg font-semibold mb-2">6.4 Autorités publiques</h3>
          <p>
            Nous pouvons être amenés à communiquer certaines données à des
            autorités (police, justice, administration fiscale) uniquement sur{" "}
            <strong>réquisition légale</strong>.
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            7. Cookies et traceurs
          </h2>
          <p className="mb-4">
            Notre site utilise des cookies dans 3 catégories. Vous pouvez à tout
            moment{" "}
            {/* TODO Fayssal: remplacer par le lien vers la modale de paramétrage cookies une fois la bannière intégrée */}
            <span className="underline">gérer vos préférences cookies</span>{" "}
            depuis le bandeau d’information.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b">Catégorie</th>
                  <th className="text-left p-3 border-b">Exemples</th>
                  <th className="text-left p-3 border-b">Consentement</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-3">
                    <strong>Strictement nécessaires</strong>
                  </td>
                  <td className="p-3">
                    Session Firebase (connexion), panier de réservation en cours,
                    sécurité Stripe (anti-fraude)
                  </td>
                  <td className="p-3">
                    Non requis (indispensables au fonctionnement)
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3">
                    <strong>Mesure d’audience</strong>
                  </td>
                  <td className="p-3">
                    Google Analytics 4 (à venir, IP anonymisée), Vercel Analytics
                  </td>
                  <td className="p-3">Requis (opt-in explicite)</td>
                </tr>
                <tr>
                  <td className="p-3">
                    <strong>Fonctionnels tiers</strong>
                  </td>
                  <td className="p-3">
                    Google Maps (carte interactive), chatbot Limova
                  </td>
                  <td className="p-3">
                    Requis si activation (sinon désactivés par défaut)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            8. Sécurité de vos données
          </h2>
          <p className="mb-3">
            Nous mettons en œuvre des mesures techniques et organisationnelles
            conformes à l’état de l’art :
          </p>
          <div className="pl-4 border-l-4 border-gray-200">
            <p className="mb-1">
              • Chiffrement <strong>TLS 1.3</strong> sur toutes les
              communications (HTTPS partout)
            </p>
            <p className="mb-1">
              • Chiffrement <strong>au repos</strong> des données sensibles
              (Firebase, R2)
            </p>
            <p className="mb-1">
              • Mots de passe <strong>hashés</strong> (jamais stockés en clair)
            </p>
            <p className="mb-1">
              • Données bancaires <strong>jamais stockées</strong> chez nous
              (déléguées à Stripe, certifié PCI-DSS niveau 1)
            </p>
            <p className="mb-1">
              • Accès admin <strong>restreints</strong> et tracés (logs d’audit)
            </p>
            <p className="mb-1">
              • Authentification forte recommandée (2FA) pour les comptes
              administrateurs
            </p>
            <p>
              • Sauvegardes quotidiennes chiffrées, restauration testée
              régulièrement
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">9. Vos droits RGPD</h2>
          <p className="mb-4">
            Le RGPD vous donne 7 droits sur vos données. Vous pouvez tous les
            exercer en nous écrivant à{" "}
            <strong>rgpd@izymoto.com</strong> (réponse sous 1 mois maximum,
            extensible à 3 mois si la demande est complexe) :
          </p>

          <div className="pl-4 border-l-4 border-gray-200 mb-4">
            <p className="mb-2">
              <strong>Droit d’accès</strong> — obtenir une copie complète des
              données que nous détenons sur vous
            </p>
            <p className="mb-2">
              <strong>Droit de rectification</strong> — corriger toute donnée
              inexacte ou incomplète
            </p>
            <p className="mb-2">
              <strong>Droit à l’effacement</strong> (« droit à l’oubli ») —
              supprimer vos données, sous réserve de nos obligations légales
              (comptabilité, anti-blanchiment)
            </p>
            <p className="mb-2">
              <strong>Droit à la limitation</strong> — geler temporairement
              l’usage de vos données
            </p>
            <p className="mb-2">
              <strong>Droit à la portabilité</strong> — récupérer vos données
              dans un format lisible et réutilisable (JSON)
            </p>
            <p className="mb-2">
              <strong>Droit d’opposition</strong> — refuser un traitement basé
              sur l’intérêt légitime (notamment marketing)
            </p>
            <p>
              <strong>Droit de retirer votre consentement</strong> — à tout
              moment, sans justification (newsletter, cookies analytiques…)
            </p>
          </div>

          <p className="mb-2">
            Vous pouvez également définir des{" "}
            <strong>directives post-mortem</strong> auprès d’un tiers de
            confiance certifié pour décider du sort de vos données après votre
            décès (loi du 7 octobre 2016).
          </p>
          <p className="text-sm text-gray-600">
            Pour exercer vos droits, joignez une copie d’une pièce d’identité
            uniquement si nous avons un doute raisonnable sur votre identité
            (cette copie sera supprimée immédiatement après vérification).
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            10. Réclamation auprès de la CNIL
          </h2>
          <p className="mb-3">
            Si vous estimez, après nous avoir contactés, que vos droits ne sont
            pas respectés, vous pouvez introduire une réclamation auprès de
            l’autorité française de contrôle :
          </p>
          <div className="pl-4 border-l-4 border-amber-400">
            <p className="mb-1">
              <strong>
                Commission Nationale de l’Informatique et des Libertés (CNIL)
              </strong>
            </p>
            <p className="mb-1">3 place de Fontenoy — TSA 80715</p>
            <p className="mb-1">75334 Paris Cedex 07</p>
            <p className="mb-1">Téléphone : +33 1 53 73 22 22</p>
            <p>
              Site web :{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                www.cnil.fr
              </a>
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">
            11. Modifications de cette politique
          </h2>
          <p>
            Cette politique peut évoluer en cas de nouveau service ou de nouveau
            sous-traitant. En cas de modification substantielle, nous vous en
            informerons par email (utilisateurs inscrits) et par un bandeau
            visible sur le site au moins 30 jours avant l’entrée en vigueur. La
            version en vigueur est toujours consultable sur cette page, avec sa
            date de mise à jour.
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-semibold mb-4">12. Nous contacter</h2>
          <div className="pl-4 border-l-4 border-gray-200 mb-4">
            <p className="mb-1">
              <strong>Demandes RGPD :</strong> rgpd@izymoto.com
            </p>
            <p className="mb-1">
              <strong>Questions générales :</strong> contact@izymoto.com
            </p>
            <p className="mb-1">
              <strong>Téléphone :</strong> +33 6 49 50 25 25
            </p>
            <p>
              <strong>Adresse postale :</strong> IzyMoto, 25 Rue de Ponthieu,
              75008 Paris
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Dernière mise à jour : 19 mai 2026
          </p>
        </section>
      </div>
    </div>
  );
}
