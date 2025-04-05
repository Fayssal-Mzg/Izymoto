"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";

const HomeCTA: React.FC = () => {
  return (
    <section className="py-20 bg-black text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-medium mb-6">
          Prêt à gagner du temps dans Paris ?
        </h2>

        <p className="text-gray-300 max-w-2xl mx-auto mb-10">
          Évitez les embouteillages et arrivez à destination rapidement avec
          notre service de moto-taxi premium.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/reserver"
            className="bg-white text-black px-6 py-3 rounded-lg font-medium inline-flex items-center hover:bg-gray-100 transition duration-300"
          >
            Réserver maintenant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>

          <Link
            href="/nos-tarifs"
            className="px-6 py-3 border border-white/40 rounded-lg font-medium hover:bg-white/10 transition duration-300"
          >
            Voir nos tarifs
          </Link>
        </div>

        <div className="mt-16 flex flex-col sm:flex-row justify-center items-center gap-8 md:gap-16">
          <div className="flex flex-col items-center">
            <div className="text-3xl font-medium mb-2">7J/7</div>
            <p className="text-gray-400">Disponibilité</p>
          </div>
          <div className="hidden sm:block w-px h-16 bg-gray-800"></div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-medium mb-2">15 MIN</div>
            <p className="text-gray-400">Délai moyen</p>
          </div>
          <div className="hidden sm:block w-px h-16 bg-gray-800"></div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-medium mb-2">100%</div>
            <p className="text-gray-400">Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeCTA;
