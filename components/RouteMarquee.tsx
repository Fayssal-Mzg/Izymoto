import { Bike } from "lucide-react";

const DEFAULT_ITEMS = [
  "CDG",
  "Orly",
  "Beauvais",
  "Paris",
  "Gare du Nord",
  "La Défense",
  "Gare de Lyon",
  "Disneyland",
];

/**
 * Mini-bandeau de destinations qui défile horizontalement en continu.
 * Le contenu est dupliqué pour un défilement sans couture (translateX -50%).
 */
export default function RouteMarquee({
  items = DEFAULT_ITEMS,
  className = "",
}: {
  items?: string[];
  className?: string;
}) {
  const sequence = [...items, ...items];

  return (
    <div
      className={`overflow-hidden border-y border-navy-800 bg-navy-950 py-3 ${className}`}
    >
      <div className="animate-marquee flex w-max items-center gap-6 whitespace-nowrap">
        {sequence.map((item, i) => (
          <span key={i} className="flex items-center gap-6 text-sm tracking-wider text-white/80">
            <span className="font-medium uppercase">{item}</span>
            <Bike className="h-4 w-4 flex-shrink-0 text-mint-400" />
          </span>
        ))}
      </div>
    </div>
  );
}
