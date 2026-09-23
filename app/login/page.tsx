"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
          Panel para barberías y administración de la plataforma.
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
      </div>
    </div>
  );
}
