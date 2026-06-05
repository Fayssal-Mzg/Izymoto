import { cn } from "@/lib/utils";

/**
 * Halo lumineux mint réutilisable, à poser en fond d'une section sombre (navy).
 * Purement décoratif : `pointer-events-none` + `aria-hidden`.
 *
 * Usage : conteneur en `relative overflow-hidden`, puis `<Halo />` en premier
 * enfant, le contenu au-dessus en `relative z-10`.
 */
export default function Halo({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="bg-luxury-radial absolute inset-0 opacity-70" />
      <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-mint-400/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-mint-600/15 blur-3xl" />
    </div>
  );
}
