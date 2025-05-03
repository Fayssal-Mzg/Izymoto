import React from "react";

export default function NosTarifs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Nos Tarifs</h1>
      
      <div className="text-sm mb-2">Dernière mise à jour le 1er janvier 2024</div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Tarifs des Trajets</h2>
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
                <td className="py-3 px-4 border-b text-right">65</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Orly</td>
                <td className="py-3 px-4 border-b text-right">90</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Paris / Roissy</td>
                <td className="py-3 px-4 border-b text-right">110-115</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Orly / La Défense</td>
                <td className="py-3 px-4 border-b text-right">110</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Roissy / La Défense</td>
                <td className="py-3 px-4 border-b text-right">125-130</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Orly / Roissy</td>
                <td className="py-3 px-4 border-b text-right">145</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b font-semibold text-left">MAJORATIONS</th>
                <th className="py-3 px-4 border-b font-semibold text-right">En %</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Soir de 20h à 21h</td>
                <td className="py-3 px-4 border-b text-right">+20%</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Nuit de 21h à 7h</td>
                <td className="py-3 px-4 border-b text-right">+50%</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Samedi</td>
                <td className="py-3 px-4 border-b text-right">+50%</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">Dimanche et jours fériés</td>
                <td className="py-3 px-4 border-b text-right">+50%</td>
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
          <li>Pour les destinations PARIS ⇒ Petite couronne: minimum de 90 EUR.</li>
          <li>Toutes destinations possibles: prise en charge 30 EUR + 2 EUR / km (hors Paris limitrophe).</li>
          <li>Réservation à moins de 2h: augmentation forfaitaire de 20 EUR.</li>
          <li>Réservation après 21h pour le lendemain matin: augmentation forfaitaire de 20 EUR.</li>
          <li>Trajet spécial: devis sur demande.</li>
          <li>Mise à disposition: devis sur demande.</li>
          <li>Trajet récurrent: formule d'abonnement possible.</li>
        </ul>
      </section>

      <section className="mb-12 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Règlement des prestations</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Les clients ne règlent pas directement après la course au chauffeur, mais sur facture, envoyée par email ou courrier et paiement à réception.</li>
          <li>Les paiements par cartes CB et American Express sont acceptés (des frais de 4% sont appliqués).</li>
          <li><strong>Paiement en ligne possible sur demande.</strong></li>
        </ul>
      </section>

      <section className="text-sm text-gray-600 italic">
        <p>Tous nos chauffeurs sont certifiés par le décret n° 2010-1223 du 11 Octobre 2010 applicable au 1er Avril 2011.</p>
        <p>Tous ces tarifs sont applicables hors conditions exceptionnelles (grève, catastrophe naturelle…) et grands évènements.</p>
      </section>
    </div>
  );
}