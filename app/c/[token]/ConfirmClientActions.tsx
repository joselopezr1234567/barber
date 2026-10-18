"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ConfirmClientActions({ token, confirmed }: { token: string; confirmed: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);

  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const confirm = async () => {
    setBusy("confirm");
    await fetch(`/api/public/bookings/${token}/confirm`, { method: "POST" });
    router.refresh();
    setBusy(null);
  };

  const cancel = async () => {
    setBusy("cancel");
    const res = await fetch(`/api/public/bookings/${token}/cancel`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (data?.message) setCancelMsg(data.message);
    router.refresh();
    setBusy(null);
  };

  return (
    <div className="mt-6 space-y-3">
      {cancelMsg && (
        <div className="rounded-xl border-zinc-700 bg-zinc-900 p-4 text-center text-sm text-zinc-300">
          {cancelMsg}
        </div>
      )}
      {/* Confirmar asistencia */}
      {confirmed ? (
        <div className="rounded-xl border-emerald-800 bg-emerald-950/50 py-3 text-center text-sm font-semibold text-emerald-300">
          ✅ Asistencia confirmada
        </div>
      ) : (
        <button
          onClick={confirm}
          disabled={busy !== null}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy === "confirm" ? "Confirmando…" : "✅ Confirmar asistencia"}
        </button>
      )}

      {/* Reprogramar */}
      <Link
        href={`/reservar?reprogramar=${token}`}
        className="block rounded-xl border-zinc-700 bg-zinc-900 py-3 text-center text-sm font-medium transition hover:border-zinc-500"
      >
        🔄 Reprogramar cita
      </Link>

      {/* Cancelar con confirmación */}
      {confirming ? (
        <div className="rounded-xl border-red-900 bg-red-950/50 p-4">
          <p className="text-sm text-red-200">¿Seguro que quieres cancelar tu cita?</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={cancel}
              disabled={busy !== null}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "cancel" ? "Cancelando…" : "Sí, cancelar"}
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
          ❌ Cancelar reserva
        </button>
      )}
    </div>
  );
}
