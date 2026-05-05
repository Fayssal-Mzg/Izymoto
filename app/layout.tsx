import Script from "next/script";
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
        <Script
          src="https://limova-web-sltj.onrender.com/scripts/chatbot-loader.js"
          data-connection-id="0ac42bfe-b334-4a78-a15a-2004ae8005e9"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
