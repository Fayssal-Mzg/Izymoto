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
    default: "Taxi moto Paris — Moto-taxi premium 24/7 | Izymoto",
    template: "%s | IZYMOTO",
  },
  description:
    "Taxi moto à Paris 24h/24 : transferts CDG, Orly, gares et trajets business en moto-taxi premium. Tarif fixe dès 50€. Réservation en ligne 7j/7.",
  keywords: [
    "taxi moto paris",
    "taxi moto",
    "moto taxi paris",
    "moto-taxi paris",
    "taxi moto cdg",
    "moto taxi cdg",
    "taxi moto orly",
    "moto taxi orly",
    "taxi moto roissy",
    "taxi moto aéroport",
    "taxi moto gare du nord",
    "taxi moto gare de lyon",
    "taxi moto la défense",
    "taxi moto disneyland",
    "réservation taxi moto paris",
    "tarif taxi moto paris",
    "prix taxi moto paris",
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
    title: "Taxi moto Paris — Moto-taxi premium 24/7 | Izymoto",
    description:
      "Taxi moto Paris 24h/24 : transferts CDG, Orly, gares, trajets business. Tarif fixe dès 50€. Réservation 7j/7.",
    images: [
      {
        url: "/taxi-paris.jpg",
        width: 1200,
        height: 630,
        alt: "Taxi moto Izymoto à Paris — moto-taxi premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taxi moto Paris — Moto-taxi 24/7 | Izymoto",
    description:
      "Taxi moto Paris 24h/24 : transferts CDG, Orly, gares. Tarif fixe dès 50€.",
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
    "Service de taxi moto et moto-taxi premium à Paris et en Île-de-France. Transferts aéroport, trajets en ville, mise à disposition.",
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
    "https://www.facebook.com/Izymoto/",
    "https://www.instagram.com/izymoto_paris",
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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "IZYMOTO",
  alternateName: ["Izymoto", "Izymoto Taxi", "Izymoto Moto-taxi"],
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/Izymoto.svg`,
    width: 512,
    height: 512,
  },
  image: `${SITE_URL}/taxi-paris.jpg`,
  description:
    "Izymoto est un service de taxi moto et moto-taxi premium basé à Paris. Transferts aéroports (CDG, Orly, Beauvais), gares (Gare du Nord, Gare de Lyon), trajets en ville et mise à disposition à l'heure, 24h/24 et 7j/7.",
  foundingDate: "2010",
  email: "contact@izymoto.com",
  telephone: "+33649502525",
  address: {
    "@type": "PostalAddress",
    streetAddress: "25 Rue de Ponthieu",
    addressLocality: "Paris",
    postalCode: "75008",
    addressRegion: "Île-de-France",
    addressCountry: "FR",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+33649502525",
    email: "contact@izymoto.com",
    contactType: "customer service",
    areaServed: "FR",
    availableLanguage: ["French", "English"],
  },
  sameAs: [
    "https://www.facebook.com/Izymoto/",
    "https://www.instagram.com/izymoto_paris",
    "https://www.linkedin.com/in/azeddine-zaouia-a6640788/",
  ],
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
        <Script
          id="ld-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <AuthProvider>
          <GoogleMapsProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </GoogleMapsProvider>
        </AuthProvider>
        <Script
          src="https://limova-web-sltj.onrender.com/scripts/chatbot-loader.js?v=20260515"
          data-connection-id="0ac42bfe-b334-4a78-a15a-2004ae8005e9"
          data-mode="bubble"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
