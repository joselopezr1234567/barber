"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDaysStr, formatPrice, minToLabel, prettyDate, todayStr, WEEKDAYS, MONTHS,
} from "@/lib/time";

type Branch = { id: string; name: string };
type Barber = { id: string; name: string };
type Service = { id: string; name: string; durationMin: number; price: number };
type Client = { id: string; name: string; phone: string };
type Booking = {
  id: string; startMin: number; endMin: number; status: string;
  service: Service; client: Client; barberId: string | null;
};
type Block = { id: string; barberId: string; startMin: number; endMin: number; reason: string | null };
type Shift = { barberId: string; startMin: number; endMin: number };

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  RESERVADO: { label: "Reservado", badge: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  ATENDIDO: { label: "Atendido", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" },
  CANCELADO: { label: "Cancelado", badge: "bg-zinc-200 text-zinc-500 border-zinc-300", dot: "bg-zinc-400" },
  NO_ASISTIO: { label: "No asistió", badge: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};


export default function AgendaView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState<{ barberId: string; open: boolean; start: string; end: string; para: string; reason: string }>({
    barberId: "", open: false, start: "13:00", end: "14:00", reason: "Almuerzo",
  });
  const [newBarber, setNewBarber] = useState<{ open: boolean; name: string; saving: boolean }>({
    open: false, name: "", saving: false,
  });

  const createBarber = async () => {
    if (!branchId || !newBarber.name.trim()) return;
    setNewBarber((s) => ({ ...s, saving: true }));
    const res = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBarber.name, branchId }),
    });
    setNewBarber((s) => ({ ...s, saving: false, open: false, name: "" }));
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Error al crear barbero");
      return;
    }
    load();
  };

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/branches");
      if (!res.ok) return; // 401: sin sesión
      const data = await res.json();
      setBranches(data.branches);
      if (data.branches.length > 0) setBranchId(data.branches[0].id);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agenda?date=${date}&branchId=${branchId}`);
      const data = await res.json().catch(() => ({}));
      setBarbers(res.ok ? (data.barbers ?? []) : []);
      setBookings(res.ok ? (data.bookings ?? []) : []);
      setBlocks(res.ok ? (data.blocks ?? []) : []);
      setShifts(res.ok ? (data.shifts ?? []) : []);
    } finally {
      setLoading(false);
    }
  }, [branchId, date]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: string) => {
    setOpenMenu(null);
    await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteBlock = async (id: string) => {
    await fetch(`/api/admin/blocks?id=${id}`, { method: "DELETE" });
    load();
  };

  const submitBlock = async () => {
    if (!blockForm.barberId) return;
    const [sh, sm] = blockForm.start.split(":").map(Number);
    const [eh, em] = blockForm.end.split(":").map(Number);
    await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId: blockForm.barberId, date,
        startMin: sh * 60 + sm, endMin: eh * 60 + em, reason: blockForm.reason,
      }),
    });
    setBlockForm((f) => ({ ...f, open: false }));
    load();
  };

  const dayLabel = useMemo(() => {
    const d = new Date(date + "T12:00:00");
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [date]);

  return (
    <div className="min-w-[900px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm capitalize text-zinc-500">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={branchId ?? ""}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex items-center rounded-lg border-zinc-300 bg-white">
            <button onClick={() => setDate(addDaysStr(date, -1))} className="px-3 py-2 text-sm hover:bg-zinc-50">◀</button>
            <button onClick={() => setDate(todayStr())} className="border-x border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50">Hoy</button>
            <button onClick={() => setDate(addDaysStr(date, 1))} className="px-3 py-2 text-sm hover:bg-zinc-50">▶</button>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-600">
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`} /> {v.label}
          </span>
        ))}
      </div>

      {/* Columnas por barbero */}
      <div className="mt-4 grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4 overflow-x-auto pb-4">
        {barbers.map((barber) => {
          const list = bookings.filter((b) => b.barberId === barber.id);
          const barberBlocks = blocks.filter((b) => b.barberId === barber.id);
          const barberShifts = shifts.filter((s) => s.barberId === barber.id);
          const shiftLabel = barberShifts.length
            ? barberShifts.map((s) => `${minToLabel(s.startMin)}–${minToLabel(s.endMin)}`).join(" · ")
            : "Libre";
          return (
            <div key={barber.id} className="rounded-xl border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="font-semibold">{barber.name}</p>
                <p className="text-xs text-zinc-500">Turno: {shiftLabel}</p>
              </div>
              <div className="space-y-2 p-3">
                {bookings
                  .filter((b) => b.barberId === barber.id)
                  .sort((a, b) => a.startMin - b.startMin)
                  .map((b) => {
                    const meta = STATUS_META[b.status];
                    return (
                      <div key={b.id} className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                          className={`w-full rounded-lg border p-3 text-left text-sm shadow-sm transition hover:shadow ${
                            b.status === "CANCELADO" ? "opacity-60" : ""
                          } ${meta.badge}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {minToLabel(b.startMin)} – {minToLabel(b.endMin)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className={`mt-1 font-medium ${b.status === "CANCELADO" ? "line-through" : ""}`}>{b.client.name}</p>
                          <p className="text-xs opacity-80">{b.service.name} · {formatPrice(b.service.price)}</p>
                        </button>
                        {openMenu === b.id && (
                          <div className="absolute right-2 top-2 z-10 w-44 rounded-lg border-zinc-200 bg-white p-1 shadow-lg">
                            {(["RESERVADO", "ATENDIDO", "CANCELADO", "NO_ASISTIO"] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => changeStatus(b.id, st)}
                                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 ${
                                  st === b.status ? "font-bold" : ""
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${STATUS_META[st].dot}`} />
                                {STATUS_META[st].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {barberBlocks.map((bl) => (
                  <div key={bl.id} className="flex items-center justify-between rounded-lg border-dashed border-zinc-400 bg-zinc-50 p-3 text-sm text-zinc-600">
                    <div>
                      <p className="font-medium">🚫 {minToLabel(bl.startMin)} – {minToLabel(bl.endMin)}</p>
                      <p className="text-xs">{bl.reason ?? "Bloqueado"}</p>
                    </div>
                    <button onClick={() => deleteBlock(bl.id)} className="text-xs text-red-500 hover:underline">Quitar</button>
                  </div>
                ))}

                {list.length === 0 && barberBlocks.length === 0 && (
                  <p className="py-6 text-center text-xs text-zinc-400">
                    {barberShifts.length === 0 ? "Sin turno este día" : "Sin citas"}
                  </p>
                )}

                <button
                  onClick={() => setBlockForm({ ...blockForm, open: true, barberId: barber.id })}
                  className="w-full rounded-lg border-dashed border-zinc-300 py-2 text-xs text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
                >
                  + Bloquear tiempo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulario de bloqueo rápido */}
      {blockForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBlockForm({ ...blockForm, open: false })}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Bloquear tiempo</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {barbers.find((b) => b.id === blockForm.barberId)?.name} · {prettyDate(date)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-zinc-500">Desde
                <input type="time" value={blockForm.start} onChange={(e) => setBlockForm({ ...blockForm, start: e.target.value })}
                  className="mt-1 w-full rounded-lg border-zinc-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-zinc-500">Hasta
                <input type="time" value={blockForm.end} onChange={(e) => setBlockForm({ ...blockForm, end: e.target.value })}
                  className="mt-1 w-full rounded-lg border-zinc-300 px-2 py-1.5 text-sm" />
              </label>
            </div>
            <label className="mt-3 block text-xs text-zinc-500">Motivo
              <input value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                placeholder="Almuerzo, imprevisto…"
                className="mt-1 w-full rounded-lg border-zinc-300 px-2 py-1.5 text-sm" />
            </label>
            <div className="mt-4 flex gap-2">
              <button onClick={submitBlock} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                Bloquear
              </button>
              <button onClick={() => setBlockForm({ ...blockForm, open: false })} className="rounded-lg border-zinc-300 px-4 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="mt-4 animate-pulse text-sm text-zinc-400">Cargando agenda…</p>}
    </div>
  );
}
