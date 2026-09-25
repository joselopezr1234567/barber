"use client";

import { useCallback, useEffect, useState } from "react";

type Booking = {
  id: string;
  startMin: number;
  status: string;
  service?: { name: string; priceMin?: number | null };
  client?: { name?: string; phone?: string } | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
  NO_ASISTIO: "No asistió",
};

const STATUS_CLS: Record<string, string> = {
  RESERVADO: "bg-blue-100 text-blue-700",
  ATENDIDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-600",
  NO_ASISTIO: "bg-zinc-200 text-zinc-600",
};

function fmtTime(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function BarberAgendaView({
  barberName,
  branchName,
}: {
  barberName: string;
  branchName: string;
}) {
  const [date, setDate] = useState(todayISO());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/barber/agenda?date=${date}`);
    if (res.ok) {
      const data = await res.json();
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } else {
      setBookings([]);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (bookingId: string, status: string) => {
    const res = await fetch("/api/barber/agenda", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, status }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error al actualizar");
      return;
    }
    load();
  };

  const logout = async () => {
    await fetch("/api/auth/barber/logout", { method: "POST" });
    window.location.href = "/barber-login";
  };

  const total = bookings.length;
  const ingresos = bookings
    .filter((b) => b.status === "ATENDIDO")
    .reduce((sum, b) => sum + (b.service?.priceMin ?? 0), 0);

  return (
    <div className="min-h-dvh bg-zinc-100">
      <header className="bg-zinc-900 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">{branchName}</p>
            <h1 className="text-xl font-bold">Mi agenda — {barberName}</h1>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-zinc-500">
            {loading ? "Cargando…" : `${total} cita${total === 1 ? "" : "s"}`}
          </span>
          {ingresos > 0 && (
            <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              Ingresos del día: ${ingresos.toLocaleString()}
            </span>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="w-16 text-center">
                <p className="text-lg font-bold">{fmtTime(b.startMin)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.client?.name ?? "Cliente"}</p>
                <p className="truncate text-sm text-zinc-500">
                  {b.service?.name ?? "Servicio"}
                  {b.client?.phone ? ` · ${b.client.phone}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[b.status] ?? "bg-zinc-200 text-zinc-600"}`}>
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
              <select
                value={b.status}
                onChange={(e) => setStatus(b.id, e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
              >
                {Object.keys(STATUS_LABEL).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          ))}
          {!loading && !bookings.length && (
            <div className="rounded-xl bg-white p-10 text-center text-zinc-400 shadow-sm">
              No tienes citas para este día.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
