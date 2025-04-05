// app/layout.tsx
import { Footer } from "@/components/Footer";
import Header from "@/components/Header";
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
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
