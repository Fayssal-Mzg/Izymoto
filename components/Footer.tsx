// app/components/Footer.jsx ou équivalent
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border py-6">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} IzyMoto. Tous droits réservés.
        </p>

        <nav className="flex space-x-4 mt-4 md:mt-0">
          <Link href="/" className="text-foreground hover:underline">
            Accueil
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link href="/services" className="text-foreground hover:underline">
            Services
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link href="/tarifs" className="text-foreground hover:underline">
            Tarifs
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link href="/contact" className="text-foreground hover:underline">
            Contact
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link
            href="/mentions-legales"
            className="text-foreground hover:underline"
          >
            Mentions Légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
