import Script from "next/script";

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  items: FaqItem[];
  title?: string;
  subtitle?: string;
  /** Injecte le JSON-LD FAQPage (SEO / réponses IA). Défaut: true. */
  withJsonLd?: boolean;
  /** id unique du <Script> JSON-LD si plusieurs FAQ sur une même page. */
  jsonLdId?: string;
  className?: string;
}

/**
 * Section FAQ réutilisable (DA navy/mint/cream). Accordéon natif <details>
 * (accessible, SEO-friendly, zéro JS). Style harmonisé sur tout le site.
 */
export default function FaqSection({
  items,
  title = "Questions fréquentes",
  subtitle,
  withJsonLd = true,
  jsonLdId = "faq-jsonld",
  className = "",
}: FaqSectionProps) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className={`bg-cream-50 py-16 md:py-24 ${className}`}>
      <div className="container mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold uppercase tracking-tight text-navy-950 md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-navy-600">{subtitle}</p>
          )}
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-mint-400" />
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-navy-100 bg-white transition-colors open:border-mint-300 open:shadow-sm"
            >
              <summary className="flex list-none items-center justify-between gap-4 p-5 font-semibold text-navy-950 md:p-6">
                <span>{item.q}</span>
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-navy-200 text-xl text-mint-600 transition-transform duration-300 group-open:rotate-45 group-open:border-mint-400">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-navy-600 md:px-6 md:pb-6">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      {withJsonLd && (
        <Script
          id={jsonLdId}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </section>
  );
}
