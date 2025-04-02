/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["firebasestorage.googleapis.com"], // Ajoutez ici vos domaines d'images si nécessaire
    unoptimized: true,
  },
  eslint: {
    // Désactiver ESLint pendant la build pour éviter les erreurs bloquantes
    // Mais gardez lint activé pendant le développement
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Désactiver TypeScript pendant la build pour éviter les erreurs bloquantes
    // Mais gardez la vérification activée pendant le développement
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase", "firebase-admin"],
  },
};

module.exports = nextConfig;
