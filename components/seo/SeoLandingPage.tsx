import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Clock, Shield, MapPin, Phone, Star } from "lucide-react";

export type FaqItem = { question: string; answer: string };

export type SeoLandingProps = {
  slug: string;
  h1: string;
  intro: string;
  highlights?: string[];
  priceFrom?: number;
  priceUnit?: string;
  routes?: { label: string; price: string; duration?: string }[];
  faq: FaqItem[];
  serviceName: string;
  areaServed: string;
};

const SITE_URL = "https://izymoto.com";

export default function SeoLandingPage({
  slug,
  h1,
  intro,
  highlights = [],
  priceFrom,
  priceUnit = "EUR",
  routes = [],
  faq,
  serviceName,
  areaServed,
}: SeoLandingProps) {
  const url = `${SITE_URL}/${slug}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: serviceName,
    serviceType: "Moto-taxi",
    provider: { "@id": `${SITE_URL}/#business` },
    areaServed: { "@type": "Place", name: areaServed },
    url,
    ...(priceFrom && {
      offers: {
        "@type": "Offer",
        price: priceFrom,
        priceCurrency: priceUnit,
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/reserver`,
      },
    }),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: serviceName, item: url },
    ],
  };

  return (
    <>
      <Script
        id={`ld-service-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <Script
        id={`ld-faq-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id={`ld-breadcrumb-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <article className="bg-white">
        <section className="bg-slate-900 text-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <nav aria-label="Fil d'ariane" className="text-sm text-gray-400 mb-4">
              <Link href="/" className="hover:text-white">Accueil</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{serviceName}</span>
            </nav>
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{h1}</h1>
            <p className="text-base md:text-lg text-gray-300 max-w-3xl mb-8">{intro}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/reserver"
                className="bg-white text-black font-medium text-base px-6 py-3 rounded-lg inline-flex items-center justify-center hover:bg-gray-200 transition"
              >
                Réserver maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="tel:+33649502525"
                className="border border-gray-400 text-white font-medium text-base px-6 py-3 rounded-lg inline-flex items-center justify-center hover:bg-white/10 transition"
              >
                <Phone className="mr-2 h-5 w-5" />
                +33 6 49 50 25 25
              </a>
            </div>
          </div>
        </section>

        {highlights.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-4xl font-bold mb-8 text-center">
                Pourquoi choisir Izymoto pour ce trajet
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {highlights.map((h, i) => (
                  <div key={i} className="bg-gray-50 p-6 rounded-lg flex items-start gap-4">
                    <Star className="h-6 w-6 text-black flex-shrink-0 mt-1" />
                    <p className="text-gray-700">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {routes.length > 0 && (
          <section className="py-12 md:py-16 bg-gray-50">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-4xl font-bold mb-8 text-center">
                Tarifs indicatifs
              </h2>
              <div className="overflow-x-auto max-w-3xl mx-auto">
                <table className="min-w-full bg-white border border-gray-200 shadow-sm">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="py-3 px-4 text-left">Trajet</th>
                      <th className="py-3 px-4 text-right">Prix à partir de</th>
                      <th className="py-3 px-4 text-right">Durée estimée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 border-b">
                        <td className="py-3 px-4">{r.label}</td>
                        <td className="py-3 px-4 text-right font-semibold">{r.price}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{r.duration ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Tarifs fixes annoncés avant la course. Attente 15 min incluse.
              </p>
            </div>
          </section>
        )}

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl md:text-4xl font-bold mb-8 text-center">
              Questions fréquentes
            </h2>
            <div className="space-y-4">
              {faq.map((item, i) => (
                <details key={i} className="bg-gray-50 rounded-lg p-5 group">
                  <summary className="font-semibold cursor-pointer list-none flex justify-between items-center">
                    <span>{item.question}</span>
                    <span className="text-2xl text-black group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-gray-700 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-black text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à réserver votre {serviceName.toLowerCase()} ?
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Devis instantané, paiement sécurisé, chauffeur en route en 15 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/reserver"
                className="bg-white text-black font-medium text-lg px-8 py-4 rounded-lg inline-flex items-center justify-center hover:bg-gray-200"
              >
                Obtenir mon devis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="tel:+33649502525"
                className="border border-white text-white font-medium text-lg px-8 py-4 rounded-lg inline-flex items-center justify-center hover:bg-white/10"
              >
                <Phone className="mr-2 h-5 w-5" />
                Appeler
              </a>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Clock className="h-5 w-5" /> 24h/24, 7j/7
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Shield className="h-5 w-5" /> Équipement fourni
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <MapPin className="h-5 w-5" /> Paris & IDF
              </div>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
