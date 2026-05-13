"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Bike, Loader2, AlertCircle } from "lucide-react";

export default function DriverLoginPage() {
  const router = useRouter();
  const { user, logIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/chauffeur");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email et mot de passe requis.");
      return;
    }
    try {
      setSubmitting(true);
      await logIn(email, password);
      router.replace("/chauffeur");
    } catch (err: any) {
      setError("Identifiants incorrects.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-amber-400/10 ring-1 ring-amber-400/30 flex items-center justify-center">
              <Bike className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-base font-bold text-amber-400 leading-tight">
                Izymoto Pro
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Espace chauffeur
              </p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl font-bold text-white mb-1">
            Connexion chauffeur
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Accédez à votre espace pro et aux courses disponibles.
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-300">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                placeholder="vous@exemple.fr"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-slate-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-400 text-black text-sm font-semibold rounded-md hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400">
              Pas encore chauffeur Izymoto ?{" "}
              <Link
                href="/chauffeur/inscription"
                className="font-semibold text-amber-400 hover:underline"
              >
                Devenir chauffeur
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
