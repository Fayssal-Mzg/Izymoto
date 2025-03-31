// app/nos-tarifs/page.tsx

import React from "react";

const tarifs = [
  { trajet: "Paris – Paris", prix: 50 },
  { trajet: "Paris – 1ère couronne", prix: 65 },
  { trajet: "Paris – Orly", prix: 80 },
  { trajet: "Paris – Roissy CDG", prix: 100 },
  { trajet: "La Défense – Orly", prix: 90 },
  { trajet: "La Défense – Roissy CDG", prix: 110 },
  { trajet: "Orly – Roissy CDG", prix: 150 },
  { trajet: "Paris – Le Bourget", prix: 80 },
];

const misesADisposition = [
  { duree: "Une Heure (1h)", prix: 100 },
  { duree: "1/2 journée (4h)", prix: 350 },
  { duree: "Journée complète (8h)", prix: 650 },
];

const fraisAdditionnels = [
  "Attente : 10 min gratuites puis 1€/min",
  "Majoration de 20 € pour toute commande souhaitée dans l’heure",
  "Courses hors forfait : 30 € de prise en charge + 2.50 €/km",
  "Majoration de 20 € pour les courses avant 7h et après 21h",
  "Majoration de 20 € les week-ends",
  "Majoration de 30 € les jours fériés",
];

export default function NosTarifs() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Nos Tarifs</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Tarifs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Trajet</th>
                <th className="py-2 px-4 border-b">Prix</th>
              </tr>
            </thead>
            <tbody>
              {tarifs.map((tarif, index) => (
                <tr key={index} className="text-center">
                  <td className="py-2 px-4 border-b">{tarif.trajet}</td>
                  <td className="py-2 px-4 border-b">{tarif.prix}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Mises à Disposition</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Durée</th>
                <th className="py-2 px-4 border-b">Prix</th>
              </tr>
            </thead>
            <tbody>
              {misesADisposition.map((dispo, index) => (
                <tr key={index} className="text-center">
                  <td className="py-2 px-4 border-b">{dispo.duree}</td>
                  <td className="py-2 px-4 border-b">{dispo.prix}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Frais Additionnels</h2>
        <ul className="list-disc list-inside">
          {fraisAdditionnels.map((frais, index) => (
            <li key={index} className="mb-2">
              {frais}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
