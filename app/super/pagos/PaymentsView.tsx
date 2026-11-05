"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/time";

type Payment = {
  id: string;
  period: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
  note: string | null;
};
type BranchPayments = {
  branch: {
    id: string; name: string; ownerEmail: string | null;
    freeMonths: number; monthlyPrice: number; active: boolean; createdAt: string;
  };
  payments: Payment[];
  owed: number;
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

export default function PaymentsView() {
  const [data, setData] = useState<BranchPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super/payments");
    if (res.ok) {
      const d = await res.json();
      setData(d.branches);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (p: Payment) => {
    setBusyId(p.id);
    await fetch("/api/super/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: p.id, paid: !p.paid }),
    });
    await load();
    setBusyId(null);
  };

  const totalOwed = data.reduce((s, b) => s + b.owed, 0);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pagos mensuales</h1>
          <p className="text-sm text-zinc-500">
            Plan $10.000/mes por negocio. Los meses de cortesía aparecen como GRATIS.
          </p>
        </div>
        {totalOwed > 0 && (
          <span className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-700">
            Por cobrar: {formatPrice(totalOwed)}
          </span>
        )}
      </div>

      {loading && <p className="mt-8 text-center text-zinc-400">Cargando…</p>}

      {!loading && data.length === 0 && (
        <p className="mt-8 text-center text-zinc-400">Aún no hay negocios creados.</p>
      )}

      <div className="mt-6 space-y-4">
        {data.map(({ branch, payments, owed }) => (
          <div key={branch.id} className="rounded-xl border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{branch.name}</p>
                <p className="truncate text-xs text-zinc-500">{branch.ownerEmail ?? "Sin login"}</p>
              </div>
              {branch.freeMonths > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  🎁 {branch.freeMonths} mes{branch.freeMonths === 1 ? "" : "es"} gratis
                </span>
              )}
              {owed > 0 ? (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Debe {formatPrice(owed)}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Al día
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {payments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p)}
                  disabled={busyId === p.id}
                  title={p.paid ? `Pagado${p.paidAt ? ` · ${new Date(p.paidAt).toLocaleDateString()}` : ""} — clic para marcar impago` : "Pendiente — clic para marcar pagado"}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    p.paid
                      ? p.note === "Meses de cortesía"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-600 hover:border-red-400"
                  } ${busyId === p.id ? "opacity-50" : ""}`}
                >
                  {periodLabel(p.period)}
                  {p.paid ? (p.note === "Meses de cortesía" ? " · 🎁" : " · ✅") : " · ⏳"}
                  {p.amount > 0 && ` · ${formatPrice(p.amount)}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              Toca un mes para alternar entre pagado ✅ y pendiente ⏳.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
