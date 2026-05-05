import { MetadataRoute } from "next";

const SITE_URL = "https://izymoto.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const corePages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/reserver`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/nos-tarifs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/aeroports`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/politique-de-confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const seoLandingPages: MetadataRoute.Sitemap = [
    "moto-taxi-paris",
    "moto-taxi-aeroport-cdg",
    "moto-taxi-aeroport-orly",
    "moto-taxi-gare-du-nord",
    "moto-taxi-gare-de-lyon",
    "moto-taxi-la-defense",
    "moto-taxi-disneyland",
  ].map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  return [...corePages, ...seoLandingPages];
}
