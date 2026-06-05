import { Bike, Calendar, Check } from "lucide-react";

interface Forfait {
  title: string;
  icon: "bike" | "calendar";
  price: string;
  desc: string;
  features: string[];
  popular?: boolean;
}

const FORFAITS: Forfait[] = [
  {
    title: "Transfert aéroport en moto",
    icon: "bike",
    price: "À partir de 80€",
    desc: "Transport depuis ou vers les aéroports de Paris (Orly, CDG). Tarif fixe sans surprises.",
    features: ["Accueil personnalisé", "Attente incluse (15 min)", "Aide avec les bagages"],
  },
  {
    title: "Trajet en ville en moto-taxi",
    icon: "bike",
    price: "À partir de 50€",
    desc: "Déplacements depuis Paris dans toute la France. Tarif de base pour des trajets jusqu'à 10 km.",
    features: ["Ponctualité garantie", "Confort premium", "Équipement fourni"],
    popular: true,
  },
  {
    title: "Mise à disposition moto-taxi",
    icon: "calendar",
    price: "80€/h",
    desc: "Chauffeur à votre disposition pour plusieurs heures ou toute la journée. Idéal pour visites ou événements.",
    features: ["Arrêts multiples", "Facturation à l'heure", "Service personnalisé"],
  },
];

/**
 * Les 3 cartes forfait de la page d'accueil, réutilisables (page tarifs, etc.).
 * `ctaHref` cible le CTA "Réserver" (défaut: section réservation de la home).
 */
export default function ForfaitCards({
  ctaHref = "#reservation",
}: {
  ctaHref?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {FORFAITS.map((f) => {
        const Icon = f.icon === "calendar" ? Calendar : Bike;
        return (
          <div
            key={f.title}
            className={
              f.popular
                ? "relative flex h-full flex-col overflow-hidden rounded-lg bg-navy-950 p-6 text-white shadow-xl ring-2 ring-mint-400/50 transition-all duration-300 hover:ring-mint-400 md:-translate-y-2"
                : "flex h-full flex-col rounded-lg bg-white p-6 shadow-md transition-all duration-300 hover:shadow-lg hover:ring-1 hover:ring-mint-400/40"
            }
          >
            {f.popular && (
              <div className="absolute right-0 top-0 rounded-bl-lg bg-mint-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy-950">
                Populaire
              </div>
            )}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Icon size={20} className={f.popular ? "text-mint-400" : "text-mint-600"} />
                <h3 className={`text-xl font-bold ${f.popular ? "" : "text-navy-950"}`}>
                  {f.title}
                </h3>
              </div>
              <div className="h-1 w-12 bg-mint-400" />
            </div>
            <div className={`mb-4 text-3xl font-bold ${f.popular ? "text-mint-400" : "text-navy-950"}`}>
              {f.price}
            </div>
            <p className={`mb-6 flex-grow ${f.popular ? "text-white/75" : "text-gray-600"}`}>
              {f.desc}
            </p>
            <ul className="mb-6 space-y-2">
              {f.features.map((feat) => (
                <li
                  key={feat}
                  className={`flex items-center ${f.popular ? "text-white/90" : "text-gray-700"}`}
                >
                  <Check className={`mr-2 h-5 w-5 ${f.popular ? "text-mint-400" : "text-mint-600"}`} />
                  {feat}
                </li>
              ))}
            </ul>
            <a
              href={ctaHref}
              className={
                f.popular
                  ? "mt-auto w-full rounded-lg bg-mint-400 px-6 py-3 text-center font-semibold text-navy-950 shadow-[0_10px_30px_-10px_rgba(45,212,191,0.6)] transition-colors duration-300 hover:bg-mint-300"
                  : "mt-auto w-full rounded-lg bg-navy-950 px-6 py-3 text-center font-semibold text-white transition-colors duration-300 hover:bg-navy-800"
              }
            >
              Réserver
            </a>
          </div>
        );
      })}
    </div>
  );
}
