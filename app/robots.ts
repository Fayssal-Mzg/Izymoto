import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const disallowAll = [
    "/admin/",
    "/profil/",
    "/connexion/",
    "/inscription/",
    "/api/",
    "/paiement-reussi/",
    "/paiement-annule/",
  ];

  const aiBotsAllowed = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "Bytespider",
    "MistralAI-User",
    "cohere-ai",
    "Meta-ExternalAgent",
    "DuckAssistBot",
    "YouBot",
    "Amazonbot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: disallowAll,
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/admin/", "/profil/", "/api/"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: ["/admin/", "/profil/", "/api/"],
      },
      ...aiBotsAllowed.map((bot) => ({
        userAgent: bot,
        allow: ["/"],
        disallow: ["/admin/", "/profil/", "/connexion/", "/inscription/", "/api/"],
      })),
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: "https://izymoto.com/sitemap.xml",
    host: "https://izymoto.com",
  };
}
