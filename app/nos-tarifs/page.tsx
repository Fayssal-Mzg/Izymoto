import React from "react";

export default function NosTarifs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Nos Tarifs</h1>

      <div className="text-sm mb-2">Dernière mise à jour le 5 mai 2026</div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Forfaits trajets</h2>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white border border-gray-200 shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b font-semibold text-left">TRAJETS</th>
                <th className="py-3 px-4 border-b font-semibold text-right">Coût en EUR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Paris</td>
                <td className="py-3 px-4 border-b text-right">46</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Orly</td>
                <td className="py-3 px-4 border-b text-right">76</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Roissy CDG</td>
                <td className="py-3 px-4 border-b text-right">99</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / La Défense</td>
                <td className="py-3 px-4 border-b text-right">50</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Le Bourget</td>
                <td className="py-3 px-4 border-b text-right">65</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Petite couronne (92, 93, 94)</td>
                <td className="py-3 px-4 border-b text-right">70</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">La Défense / Orly</td>
                <td className="py-3 px-4 border-b text-right">99</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">La Défense / Roissy CDG</td>
                <td className="py-3 px-4 border-b text-right">99</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Orly / Roissy CDG</td>
                <td className="py-3 px-4 border-b text-right">139</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Disneyland</td>
                <td className="py-3 px-4 border-b text-right">110</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Beauvais / Paris</td>
                <td className="py-3 px-4 border-b text-right">180</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold mb-4 mt-8">Mise à disposition</h2>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white border border-gray-200 shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b font-semibold text-left">DURÉE</th>
                <th className="py-3 px-4 border-b font-semibold text-right">Coût en EUR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">1 heure</td>
                <td className="py-3 px-4 border-b text-right">95</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">4 heures</td>
                <td className="py-3 px-4 border-b text-right">320</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">8 heures (journée)</td>
                <td className="py-3 px-4 border-b text-right">580</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-semibold mb-4 mt-8">Majorations</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b font-semibold text-left">SITUATION</th>
                <th className="py-3 px-4 border-b font-semibold text-right">Supplément</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Soir / matin tôt (6h-7h ou 20h-23h)</td>
                <td className="py-3 px-4 border-b text-right">+20€</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Nuit (23h-6h)</td>
                <td className="py-3 px-4 border-b text-right">+40€</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Week-end et jours fériés</td>
                <td className="py-3 px-4 border-b text-right">+20€</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Réservation à moins de 2h</td>
                <td className="py-3 px-4 border-b text-right">+20€</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Annulation à moins de 2 heures</td>
                <td className="py-3 px-4 border-b text-right">+100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Conditions tarifaires</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Tarifs applicables hors conditions exceptionnelles et grands évènements.</li>
          <li>Trajet hors zone forfaitaire : prise en charge 30€ + 3€/km, arrondi par paliers de 5€.</li>
          <li>Attente offerte : 5 minutes après l'heure de prise en charge.</li>
          <li>Aéroports : 20 minutes d'attente offertes après l'atterrissage, puis 1€ / minute.</li>
          <li>Réservation prioritaire : +20€ (prise en charge sous 15 min).</li>
          <li>Trajet récurrent : formule d'abonnement possible — devis sur demande.</li>
        </ul>
      </section>

      <section className="mb-12 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Règlement des prestations</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Paiement en ligne sécurisé (CB) lors de la réservation, ou directement au chauffeur (CB / espèces).</li>
          <li>Cartes Visa, Mastercard et American Express acceptées.</li>
          <li>Facturation entreprise sur demande pour les comptes pro.</li>
        </ul>
      </section>

      <section className="text-sm text-gray-600 italic">
        <p>
          Tous nos chauffeurs sont certifiés par le décret n° 2010-1223 du 11
          octobre 2010 applicable au 1er avril 2011.
        </p>
        <p>
          Tous ces tarifs sont applicables hors conditions exceptionnelles
          (grève, catastrophe naturelle…) et grands évènements.
        </p>
      </section>
    </div>
  );
}
