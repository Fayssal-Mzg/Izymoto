import type { Metadata } from "next";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import Header from "@/components/Header";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/app/globals.css";

const SITE_URL = "https://izymoto.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IZYMOTO — Moto-taxi à Paris 24/7 | Transferts aéroports & trajets premium",
    template: "%s | IZYMOTO",
  },
  description:
    "Service de moto-taxi premium à Paris et en Île-de-France. Transferts aéroport (CDG, Orly, Beauvais), trajets en ville, mise à disposition. Disponible 24h/24, 7j/7. Tarif fixe à partir de 50€.",
  keywords: [
    "moto taxi paris",
    "moto taxi cdg",
    "moto taxi orly",
    "moto taxi roissy",
    "moto taxi aéroport",
    "moto taxi gare du nord",
    "moto taxi gare de lyon",
    "moto taxi la défense",
    "moto taxi disneyland",
    "réservation moto taxi paris",
    "tarif moto taxi paris",
    "transport moto paris",
  ],
  authors: [{ name: "IZYMOTO" }],
  creator: "IZYMOTO",
  publisher: "IZYMOTO",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "IZYMOTO",
    title: "IZYMOTO — Moto-taxi à Paris 24/7",
    description:
      "Moto-taxi premium à Paris : transferts aéroport, trajets en ville et mise à disposition. Réservation en ligne, tarif fixe, disponible 7j/7.",
    images: [
      {
        url: "/taxi-paris.jpg",
        width: 1200,
        height: 630,
        alt: "Moto-taxi IZYMOTO à Paris",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IZYMOTO — Moto-taxi à Paris 24/7",
    description:
      "Moto-taxi premium à Paris : transferts aéroport, trajets en ville. Tarif fixe, 7j/7.",
    images: ["/taxi-paris.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "675d24b21567992b",
  },
  category: "transportation",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "TaxiService",
  "@id": `${SITE_URL}/#business`,
  name: "IZYMOTO",
  alternateName: "Izymoto Moto-taxi",
  description:
    "Service de moto-taxi premium à Paris et en Île-de-France. Transferts aéroport, trajets en ville, mise à disposition.",
  url: SITE_URL,
  telephone: "+33649502525",
  email: "contact@izymoto.com",
  image: `${SITE_URL}/taxi-paris.jpg`,
  logo: `${SITE_URL}/Izymoto.svg`,
  priceRange: "€€",
  currenciesAccepted: "EUR",
  paymentAccepted: "Cash, Credit Card, Debit Card",
  address: {
    "@type": "PostalAddress",
    streetAddress: "25 Rue de Ponthieu",
    addressLocality: "Paris",
    postalCode: "75008",
    addressRegion: "Île-de-France",
    addressCountry: "FR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 48.8718,
    longitude: 2.3068,
  },
  areaServed: [
    { "@type": "City", name: "Paris" },
    { "@type": "AdministrativeArea", name: "Île-de-France" },
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  sameAs: [
    "https://www.facebook.com/zaouiazeddine",
    "https://www.instagram.com/izymoto_taxi/",
    "https://www.linkedin.com/in/azeddine-zaouia-a6640788/",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Services Izymoto",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Transfert aéroport en moto-taxi" },
        priceSpecification: { "@type": "PriceSpecification", price: 80, priceCurrency: "EUR" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Trajet en ville en moto-taxi" },
        priceSpecification: { "@type": "PriceSpecification", price: 50, priceCurrency: "EUR" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Mise à disposition à l'heure" },
        priceSpecification: { "@type": "UnitPriceSpecification", price: 80, priceCurrency: "EUR", unitCode: "HUR" },
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-black">
        <Script
          id="ld-localbusiness"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <AuthProvider>
          <GoogleMapsProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </GoogleMapsProvider>
        </AuthProvider>
        <Script
          src="https://limova-web-sltj.onrender.com/scripts/chatbot-loader.js"
          data-connection-id="0ac42bfe-b334-4a78-a15a-2004ae8005e9"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
