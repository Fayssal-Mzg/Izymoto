import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Calendar, Clock, Phone } from "lucide-react";

export type ArticleFaqItem = { question: string; answer: string };

export type ArticleLayoutProps = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readMinutes: number;
  intro: string;
  faq?: ArticleFaqItem[];
  ctaTitle?: string;
  ctaText?: string;
  children: React.ReactNode;
};

const SITE_URL = "https://izymoto.com";
const PUBLISHER = "IZYMOTO";

export default function ArticleLayout({
  slug,
  title,
  description,
  publishedAt,
  updatedAt,
  readMinutes,
  intro,
  faq,
  ctaTitle = "Réservez votre taxi moto Izymoto",
  ctaText = "Devis instantané, prix fixe, chauffeur en route en 15 minutes.",
  children,
}: ArticleLayoutProps) {
  const url = `${SITE_URL}/blog/${slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    image: `${SITE_URL}/taxi-paris.jpg`,
    author: { "@type": "Organization", name: PUBLISHER, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: PUBLISHER,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/Izymoto.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  const faqSchema = faq && faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  return (
    <>
      <Script
        id={`ld-article-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id={`ld-breadcrumb-${slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <Script
          id={`ld-faq-${slug}`}
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <article className="bg-white">
        <header className="bg-slate-900 text-white py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <nav aria-label="Fil d'ariane" className="text-sm text-gray-400 mb-4">
              <Link href="/" className="hover:text-white">Accueil</Link>
              <span className="mx-2">/</span>
              <Link href="/blog" className="hover:text-white">Blog</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{title}</span>
            </nav>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">{title}</h1>
            <p className="text-base md:text-lg text-gray-300 mb-6">{intro}</p>
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(publishedAt).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {readMinutes} min de lecture
              </span>
            </div>
          </div>
        </header>

        <div className="py-10 md:py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="prose-content space-y-6 text-gray-800 leading-relaxed">
              {children}
            </div>

            {faq && faq.length > 0 && (
              <section className="mt-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">Questions fréquentes</h2>
                <div className="space-y-3">
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
              </section>
            )}
          </div>
        </div>

        <section className="py-12 md:py-16 bg-black text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">{ctaTitle}</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">{ctaText}</p>
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
                +33 6 49 50 25 25
              </a>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
