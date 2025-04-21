import { Footer } from "@/components/Footer";
import Header from "@/components/Header";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/app/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-black">
        <AuthProvider>
          <GoogleMapsProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </GoogleMapsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
