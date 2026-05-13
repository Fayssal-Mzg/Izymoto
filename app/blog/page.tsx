import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Calendar, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog Izymoto — Guides taxi moto Paris",
  description:
    "Le blog Izymoto : guides, comparatifs et conseils sur le taxi moto à Paris. Prix, comparaisons VTC, réservation, astuces pour voyageurs business.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog Izymoto — Guides taxi moto Paris",
    description:
      "Guides, comparatifs et conseils sur le taxi moto à Paris.",
    url: "/blog",
  },
};

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readMinutes: number;
};

const ARTICLES: Article[] = [
  {
    slug: "prix-taxi-moto-paris-cdg",
    title: "Prix taxi moto Paris-CDG : combien ça coûte vraiment en 2026 ?",
    excerpt:
      "Tarif d'un taxi moto Paris-Roissy CDG : forfaits Izymoto, comparatif avec VTC, taxi classique et RER B, suppléments et astuces.",
    publishedAt: "2026-05-13",
    readMinutes: 7,
  },
  {
    slug: "taxi-moto-vs-vtc-paris",
    title: "Taxi moto vs VTC à Paris : qui est le plus rapide en 2026 ?",
    excerpt:
      "Comparatif détaillé taxi moto / VTC : temps de trajet, prix, confort, sécurité. Quel mode choisir selon votre besoin.",
    publishedAt: "2026-05-13",
    readMinutes: 8,
  },
  {
    slug: "comment-reserver-taxi-moto-paris",
    title: "Comment réserver un taxi moto à Paris : guide complet 2026",
    excerpt:
      "Étapes simples pour réserver un taxi moto à Paris : en ligne, par téléphone, à l'avance ou en urgence. Délais, infos, paiement.",
    publishedAt: "2026-05-13",
    readMinutes: 6,
  },
];

const SITE_URL = "https://izymoto.com";

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${SITE_URL}/blog#blog`,
  name: "Blog Izymoto",
  description: "Guides, comparatifs et conseils sur le taxi moto à Paris.",
  url: `${SITE_URL}/blog`,
  publisher: { "@id": `${SITE_URL}/#business` },
  blogPost: ARTICLES.map((a) => ({
    "@type": "BlogPosting",
    headline: a.title,
    url: `${SITE_URL}/blog/${a.slug}`,
    datePublished: a.publishedAt,
  })),
};

export default function BlogIndex() {
  return (
    <>
      <Script
        id="ld-blog"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      <section className="bg-slate-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <nav aria-label="Fil d'ariane" className="text-sm text-gray-400 mb-4">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-white">Blog</span>
          </nav>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Blog Izymoto — Guides taxi moto Paris</h1>
          <p className="text-base md:text-lg text-gray-300 max-w-3xl">
            Guides, comparatifs et conseils pour voyager mieux à Paris en taxi moto. Tarifs, comparaisons VTC, réservation, astuces business — tout ce qu'il faut savoir.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(article.publishedAt).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.readMinutes} min
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-3 group-hover:underline">{article.title}</h2>
                <p className="text-gray-700 mb-4 flex-1">{article.excerpt}</p>
                <span className="inline-flex items-center text-sm font-semibold text-black mt-auto">
                  Lire l'article
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
