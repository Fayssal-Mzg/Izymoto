export interface LatLng {
  lat: number;
  lng: number;
}

// Plafond de distance accepté pour une course (km). Au-delà : valeur absurde, refusée.
export const DISTANCE_MAX_KM = 250;

// Un trajet routier est toujours plus long que la ligne droite : la distance déclarée
// ne peut pas être inférieure à (ligne droite × ratio). Le ratio laisse 5 % de marge.
export const DISTANCE_MIN_RATIO = 0.95;

export const isValidLatLng = (p: unknown): p is LatLng => {
  if (!p || typeof p !== "object") return false;
  const { lat, lng } = p as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// Distance à vol d'oiseau (formule de haversine), en km.
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
