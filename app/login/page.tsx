"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Login único para dueño del local, super admin y trabajadores. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Error al iniciar sesión");
      return;
    }
    router.push(data.redirect);
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Panel para negocios con agenda: barberías, peluquerías, centros médicos y más.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-zinc-600">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="tu@barberia.cl"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Contraseña
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? "Ingresando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-400">
          ¿Cliente? Reserva sin cuenta en{" "}
          <a href="/reservar" className="underline hover:text-zinc-600">
            /reservar
          </a>
        </p>

        <InstallHint />
      </div>
    </div>
  );
}

/**
 * Aviso pequeño para instalar la app desde la pantalla de login
 * (iOS: instrucciones Compartir → Agregar a inicio; Android/Chrome: botón instalar).
 * No aparece si ya está instalada o si el usuario lo cerró antes.
 */
function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredRef = useRef<any>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("pwa-dismissed-login")) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e;
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // En iOS no hay evento nativo: mostrar directo.
    if (ios) setVisible(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa-dismissed-login", "1");
  };

  const install = async () => {
    if (deferredRef.current) {
      deferredRef.current.prompt();
      const { outcome } = await deferredRef.current.userChoice;
      if (outcome === "accepted") dismiss();
      deferredRef.current = null;
    }
  };

  return (
    <div className="animate-fade-up mt-4 rounded-xl border border-gold-500/40 bg-zinc-950 p-3 text-zinc-300">
      <div className="flex items-start gap-2.5">
        <span className="text-xl">📲</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Instala ProAgenda</p>
          {isIOS ? (
            <p className="mt-0.5 text-xs text-zinc-400">
              Toca <strong>Compartir</strong> ⬆️ y luego{" "}
              <strong>“Agregar a pantalla de inicio”</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-400">Úsala como una app desde tu pantalla de inicio.</p>
          )}
        </div>
        <button onClick={dismiss} aria-label="Cerrar" className="text-xs text-zinc-500 hover:text-zinc-300">✕</button>
      </div>
      {!isIOS && (
        <button
          onClick={install}
          className="mt-2.5 w-full rounded-lg bg-gold-500 py-2 text-xs font-bold text-zinc-950 transition hover:bg-gold-400"
        >
          Instalar ahora
        </button>
      )}
    </div>
  );
}
