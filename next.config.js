/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pas besoin de spécifier swcMinify: true car c'est déjà la valeur par défaut
  images: {
    domains: ["firebasestorage.googleapis.com"],
    unoptimized: true,
  },
  // Configuration ESLint et TypeScript pour le déploiement
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
