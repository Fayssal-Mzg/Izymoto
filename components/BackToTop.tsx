"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Bouton « haut de page » : apparaît après 600px de scroll. Décalé au-dessus
 * de la barre « Réserver » mobile pour ne pas se chevaucher.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Revenir en haut de la page"
      className={`fixed right-4 bottom-20 z-40 grid h-11 w-11 place-items-center rounded-full border border-mint-400/40 bg-navy-950/90 text-mint-400 shadow-lg backdrop-blur transition-all duration-300 hover:bg-mint-400 hover:text-navy-950 md:bottom-6 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
