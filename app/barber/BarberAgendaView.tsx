"use client";

import { useCallback, useEffect, useState } from "react";

type Booking = {
  id: string;
  startMin: number;
  status: string;
  reminderStatus?: string;
  service?: { name: string; priceMin?: number | null };
  client?: { name?: string; phone?: string } | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
  NO_ASISTIO: "No asistió",
  ENVIADO: "WA enviado",
  ENTREGADO: "WA entregado",
  LEIDO: "WA leído",
  FALLADO: "WA falló",
};
const STATUS_CLS: Record<string, string> = {
  RESERVADO: "bg-blue-100 text-blue-700",
  CONFIRMADO: "bg-green-100 text-green-700",
  ATENDIDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-red-100 text-red-600",
  NO_ASISTIO: "bg-zinc-200 text-zinc-600",
  ENVIADO: "bg-amber-100 text-amber-700",
  ENTREGADO: "bg-teal-100 text-teal-700",
  LEIDO: "bg-sky-100 text-sky-700",
  FALLADO: "bg-orange-100 text-orange-700",
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

  // Polling: refresca la agenda cada 30s para que el badge cambie solo
  // cuando el cliente confirma desde su WhatsApp.
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  // Refresca apenas se vuelve a la pestaña (p.ej. tras ver WhatsApp).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

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

  const sendWhatsApp = async (bookingId: string) => {
    const res = await fetch(`/api/barber/agenda/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, type: "CONFIRMACION" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Error al enviar el WhatsApp");
      return;
    }
    alert("📱 WhatsApp de confirmación enviado");
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
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[b.status === "RESERVADO" && b.reminderStatus === "CONFIRMADO" ? "CONFIRMADO" : b.status] ?? "bg-zinc-200 text-zinc-600"}`}>
                {STATUS_LABEL[b.status === "RESERVADO" && b.reminderStatus === "CONFIRMADO" ? "CONFIRMADO" : b.status] ?? b.status}
              </span>
              {b.status === "RESERVADO" &&
                b.reminderStatus &&
                ["ENVIADO", "ENTREGADO", "LEIDO"].includes(b.reminderStatus) && (
                  <span
                    title={`Estado del WhatsApp: ${STATUS_LABEL[b.reminderStatus]}`}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[b.reminderStatus]}`}
                  >
                    {STATUS_LABEL[b.reminderStatus]}
                  </span>
                )}
              <select
                value={b.status}
                onChange={(e) => setStatus(b.id, e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
              >
                {["RESERVADO", "ATENDIDO", "CANCELADO", "NO_ASISTIO"].map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              {b.status === "RESERVADO" && (
                <button
                  onClick={() => sendWhatsApp(b.id)}
                  title="Enviar WhatsApp de confirmación al cliente"
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  📱 WhatsApp
                </button>
              )}
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
