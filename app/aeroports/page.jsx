// app/aeroports/page.jsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function AeroportsPage() {
  return (
    <div className="bg-[#fdfbf5]">
      {/* Section Hero avec bannière */}
      <section className="relative">
        <div className="h-[40vh] md:h-[50vh] w-full relative">
          <Image
            src="/aeroport-banner.jpg" // À remplacer par votre image d'aéroport
            alt="Taxi moto aéroports Paris"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white p-6 max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                Taxi Moto aux Aéroports de Paris
              </h1>
              <p className="text-lg md:text-xl mb-6">
                Réservez un taxi moto pour vos transferts aéroport et arrivez à
                destination rapidement et sans stress
              </p>
              <Link
                href="/reserver"
                className="bg-[#ffc107] text-black px-8 py-3 rounded-md font-medium hover:bg-yellow-500 transition-colors duration-300"
              >
                Réserver maintenant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section Principaux aéroports */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Nos services taxi moto aux aéroports de Paris
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Aéroport CDG */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 relative">
                <Image
                  src="/cdg-airport.jpg" // À remplacer par votre image
                  alt="Aéroport Charles de Gaulle"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">
                  Charles de Gaulle (CDG)
                </h3>
                <p className="text-gray-600 mb-4">
                  Profitez d'un transfert rapide entre Paris et l'aéroport CDG,
                  sans aucun stress lié aux embouteillages.
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">À partir de</p>
                    <p className="text-2xl font-bold text-[#ffc107]">100€</p>
                  </div>
                  <Link
                    href="/reserver"
                    className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            </div>

            {/* Aéroport Orly */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 relative">
                <Image
                  src="/orly-airport.jpg" // À remplacer par votre image
                  alt="Aéroport d'Orly"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Orly (ORY)</h3>
                <p className="text-gray-600 mb-4">
                  Rejoignez rapidement l'aéroport d'Orly depuis Paris ou la
                  banlieue, sans vous soucier des transports en commun.
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">À partir de</p>
                    <p className="text-2xl font-bold text-[#ffc107]">80€</p>
                  </div>
                  <Link
                    href="/reserver"
                    className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            </div>

            {/* Aéroport Beauvais */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 relative">
                <Image
                  src="/beauvais-airport.jpg" // À remplacer par votre image
                  alt="Aéroport de Beauvais"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Beauvais (BVA)</h3>
                <p className="text-gray-600 mb-4">
                  Service de taxi moto premium entre Paris et l'aéroport de
                  Beauvais, pour un voyage confortable et ponctuel.
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">À partir de</p>
                    <p className="text-2xl font-bold text-[#ffc107]">150€</p>
                  </div>
                  <Link
                    href="/reserver"
                    className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition"
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Avantages */}
      <section className="py-16 px-4 bg-black text-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Pourquoi choisir le taxi moto pour l'aéroport ?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffc107] rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Gain de temps</h3>
              <p className="text-gray-300">
                Évitez les embouteillages et réduisez considérablement votre
                temps de trajet vers l'aéroport.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffc107] rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Ponctualité garantie</h3>
              <p className="text-gray-300">
                Assurez-vous d'arriver à l'heure pour votre vol, sans stress ni
                imprévu.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffc107] rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Prix fixe</h3>
              <p className="text-gray-300">
                Connaissez le coût exact de votre trajet à l'avance, sans
                surprise ni supplément.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#ffc107] rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Confort premium</h3>
              <p className="text-gray-300">
                Bénéficiez d'un service personnalisé et d'un équipement de
                qualité pour votre trajet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Questions fréquentes
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-2">
                Comment fonctionne la prise en charge à l'aéroport ?
              </h3>
              <p className="text-gray-600">
                Notre chauffeur vous attendra à la sortie de votre terminal avec
                une pancarte à votre nom. Il vous aidera avec vos bagages et
                vous conduira directement à votre destination.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-2">
                Combien de bagages puis-je emporter ?
              </h3>
              <p className="text-gray-600">
                Nos motos sont équipées pour transporter un bagage de taille
                cabine par passager. Pour des bagages plus volumineux, veuillez
                nous contacter à l'avance.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-2">
                Que se passe-t-il en cas de retard de vol ?
              </h3>
              <p className="text-gray-600">
                Nous surveillons l'heure d'arrivée de votre vol en temps réel.
                Notre chauffeur ajustera son horaire en fonction des retards
                éventuels, sans frais supplémentaires.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-2">
                Comment réserver un taxi moto pour l'aéroport ?
              </h3>
              <p className="text-gray-600">
                Vous pouvez réserver directement en ligne via notre formulaire
                de réservation ou nous contacter par téléphone. Précisez votre
                numéro de vol pour que nous puissions suivre son statut.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section témoignages */}
      <section className="py-16 px-4 bg-gray-100">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Ce que disent nos clients
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 mr-4">
                  JP
                </div>
                <div>
                  <h4 className="font-bold">Jean-Philippe M.</h4>
                  <div className="flex text-yellow-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "J'utilise IzyMoto pour mes déplacements vers CDG chaque
                semaine. Toujours ponctuels et professionnels, ils m'ont fait
                gagner des heures précieuses. Service impeccable !"
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 mr-4">
                  SD
                </div>
                <div>
                  <h4 className="font-bold">Sophie D.</h4>
                  <div className="flex text-yellow-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "J'étais sceptique au début, mais maintenant je ne prends plus
                que IzyMoto pour mes trajets vers Orly. Efficace, rapide et très
                pratique, surtout avec les embouteillages parisiens !"
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 mr-4">
                  TL
                </div>
                <div>
                  <h4 className="font-bold">Thomas L.</h4>
                  <div className="flex text-yellow-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Chauffeur très professionnel et sympathique. J'ai pu arriver à
                CDG en 25 minutes alors que j'étais en retard. Service qui m'a
                sauvé de rater mon vol. Je recommande vivement !"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section CTA */}
      <section className="py-16 px-4 bg-[#ffc107]">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-black mb-6">
            Prêt à réserver votre taxi moto pour l'aéroport ?
          </h2>
          <p className="text-xl text-gray-800 mb-8 max-w-2xl mx-auto">
            Gagnez du temps et voyagez sans stress avec notre service de taxi
            moto rapide et fiable vers tous les aéroports de Paris.
          </p>
          <Link
            href="/reserver"
            className="bg-black text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 transition-colors duration-300 inline-block"
          >
            Réserver maintenant
          </Link>
        </div>
      </section>
    </div>
  );
}
