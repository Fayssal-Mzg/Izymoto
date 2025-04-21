const nextConfig = {
  // Mode strict de React pour détecter les problèmes potentiels
  reactStrictMode: true,
  // Configuration des images
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  // Configuration des variables d'environnement
  env: {
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL || "https://izymoto.com",
    // Ajoutez ici d'autres variables d'environnement si nécessaire
  },
  // Configurations de sécurité et de performance
  poweredByHeader: false, // Masquer l'en-tête X-Powered-By
  productionBrowserSourceMaps: false, // Désactiver les source maps en production
  // Gestion des erreurs pendant le build
  eslint: {
    ignoreDuringBuilds: true, // Ignorer les erreurs ESLint pendant le build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignorer les erreurs TypeScript pendant le build
  },
  // Configuration des en-têtes pour la sécurité
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN", // Prévenir le clickjacking
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Prévenir le MIME type sniffing
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Contrôle de l'envoi du referrer
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)", // Contrôle des permissions
          },
        ],
      },
    ];
  },
  // Redirections optionnelles
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://izymoto.com",
        permanent: true,
      },
    ];
  },
  // Configuration webpack si nécessaire (optionnel)
  webpack: (config, { isServer }) => {
    // Optimisations personnalisées si besoin
    return config;
  },
};
module.exports = nextConfig;
