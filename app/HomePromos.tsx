"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Branch = {
  id: string;
  name: string;
  coverUrl: string | null;
  logoUrl: string | null;
  promoText: string | null;
};

/**
 * Portada: fondo con la imagen de las sucursales que tienen propaganda,
 * rotando al azar, con una franja de anuncios que corre (marquee) y botón "Agendar →".
 */
export default function HomePromos() {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetch("/api/public/bootstrap")
      .then((r) => (r.ok ? r.json() : { branches: [] }))
      .then((d) => setBranches(d.branches ?? []))
      .catch(() => setBranches([]));
  }, []);

  const promos = useMemo(
    () => branches.filter((b) => b.promoText && (b.coverUrl || b.logoUrl)),
    [branches]
  );

  // Rotación del fondo al azar
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (promos.length <= 1) return;
    const order = promos.map((_, i) => i).sort(() => Math.random() - 0.5);
    let pos = 0;
    const iv = setInterval(() => {
      pos = (pos + 1) % promos.length;
      setIndex(order[pos]);
    }, 5000);
    setIndex(order[0]);
    return () => clearInterval(iv);
  }, [promos]);

  const current = promos[index];

  // Texto del marquee: todas las promos concatenadas
  const marqueeText = promos.map((p) => `${p.name}: ${p.promoText}`).join("   •   ");

  return (
    <>
      {/* Fondo con imagen rotando */}
      {current && (
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={current.coverUrl ?? current.logoUrl ?? ""}
            alt=""
            className="absolute inset-0 h-full w-full animate-fade-up object-cover"
          />
          <div className="absolute inset-0 bg-zinc-950/70" />
        </div>
      )}

      {/* Franja de propaganda que corre (marquee) */}
      {marqueeText && (
        <div className="fixed inset-x-0 bottom-0 z-10 overflow-hidden border-t border-gold-500/30 bg-zinc-950/80 py-2.5 backdrop-blur">
          <div className="marquee flex w-max gap-16 whitespace-nowrap text-sm font-medium text-gold-300">
            <span className="flex items-center gap-16">
              {marqueeText}
              {"   •   "}
              <Link
                href="/reservar"
                className="rounded-lg bg-gold-500 px-3 py-1 text-xs font-bold text-zinc-950 transition hover:bg-gold-400"
              >
                Agendar →
              </Link>
            </span>
            <span className="flex items-center gap-16" aria-hidden>
              {marqueeText}
              {"   •   "}
              <Link
                href="/reservar"
                className="rounded-lg bg-gold-500 px-3 py-1 text-xs font-bold text-zinc-950 transition hover:bg-gold-400"
              >
                Agendar →
              </Link>
            </span>
            <span className="flex items-center gap-16" aria-hidden>
              {marqueeText}
              {"   •   "}
              <Link
                href="/reservar"
                className="rounded-lg bg-gold-500 px-3 py-1 text-xs font-bold text-zinc-950 transition hover:bg-gold-400"
              >
                Agendar →
              </Link>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
