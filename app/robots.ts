import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin/",
          "/profil/",
          "/connexion/",
          "/inscription/",
          "/api/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/admin/", "/profil/"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: ["/admin/", "/profil/"],
      },
    ],
    sitemap: "https://izymoto.com/sitemap.xml",
  };
}
