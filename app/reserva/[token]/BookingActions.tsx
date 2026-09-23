"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BookingActions({ token, gcalUrl, icsUrl }: { token: string; gcalUrl: string; icsUrl: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    await fetch(`/api/public/bookings/${token}/cancel`, { method: "POST" });
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border-zinc-700 bg-zinc-900 py-3 text-center text-sm font-medium transition hover:border-zinc-500"
        >
          📅 Google Calendar
        </a>
        <a
          href={icsUrl}
          className="rounded-xl border-zinc-700 bg-zinc-900 py-3 text-center text-sm font-medium transition hover:border-zinc-500"
        >
          🍎 Apple / .ics
        </a>
      </div>

      <Link
        href={`/reservar?reprogramar=${token}`}
        className="block rounded-xl border-zinc-700 bg-zinc-900 py-3 text-center text-sm font-medium transition hover:border-zinc-500"
      >
        🔄 Reprogramar cita
      </Link>

      {confirming ? (
        <div className="rounded-xl border-red-900 bg-red-950/50 p-4">
          <p className="text-sm text-red-200">¿Seguro que quieres cancelar tu cita?</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={cancel}
              disabled={cancelling}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {cancelling ? "Cancelando…" : "Sí, cancelar"}
            </button>
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-lg border-zinc-700 py-2 text-sm">
              Volver
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full rounded-xl py-3 text-sm text-zinc-500 underline-offset-4 transition hover:text-red-400 hover:underline"
        >
          Cancelar reserva
        </button>
      )}
    </div>
  );
}
