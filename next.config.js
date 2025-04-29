/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode strict de React pour détecter les problèmes potentiels
  reactStrictMode: true,

  // Configuration des images
  images: {
    domains: ["firebasestorage.googleapis.com"],
    formats: ['image/webp'], // Ajouter le support pour WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Tailles d'appareils pour lesquelles optimiser
    minimumCacheTTL: 60, // Cache minimum en secondes
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

  // Configuration webpack pour optimiser les bundles JS
  webpack: (config, { isServer }) => {
    // Configuration de splitChunks pour optimiser les bundles
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 6,
      maxAsyncRequests: 6,
      minSize: 20000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          name(module) {
            // Vérification de sécurité supplémentaire
            try {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              return packageName 
                ? `npm.${packageName[1].replace('@', '')}` 
                : 'npm.vendor';
            } catch (error) {
              return 'npm.vendor';
            }
          },
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'npm.react',
          priority: 20,
        },
        lucide: {
          test: /[\\/]node_modules[\\/](lucide-react)[\\/]/,
          name: 'npm.icons',
          priority: 15,
        },
      },
    };
    
    return config;
  },
};

module.exports = nextConfig;