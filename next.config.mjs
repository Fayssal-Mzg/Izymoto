/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    const inversionPairs = [
      ["/taxi-moto-paris", "/moto-taxi-paris"],
      ["/taxi-moto-aeroport-cdg", "/moto-taxi-aeroport-cdg"],
      ["/taxi-moto-cdg", "/moto-taxi-aeroport-cdg"],
      ["/taxi-moto-roissy", "/moto-taxi-aeroport-cdg"],
      ["/taxi-moto-aeroport-orly", "/moto-taxi-aeroport-orly"],
      ["/taxi-moto-orly", "/moto-taxi-aeroport-orly"],
      ["/taxi-moto-gare-du-nord", "/moto-taxi-gare-du-nord"],
      ["/taxi-moto-gare-de-lyon", "/moto-taxi-gare-de-lyon"],
      ["/taxi-moto-la-defense", "/moto-taxi-la-defense"],
      ["/taxi-moto-disneyland", "/moto-taxi-disneyland"],
    ];
    return inversionPairs.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
