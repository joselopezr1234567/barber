"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice, minToLabel, prettyDate } from "@/lib/time";

type Barber = { id: string; name: string };
type Service = { id: string; name: string; price: number };
type Booking = {
  id: string; date: string; startMin: number; endMin: number; status: string;
  service: Service; barber: Barber | null;
};
type Note = { id: string; text: string; createdAt: string; barber: Barber };
type ClientDetail = {
  id: string; name: string; phone: string; email: string | null;
  bookings: Booking[]; notes: Note[];
};
type ClientRow = { id: string; name: string; phone: string; _count: { bookings: number } };

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado", ATENDIDO: "Atendido", CANCELADO: "Cancelado", NO_ASISTIO: "No asistió",
};

export default function ClientsView() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [selected, setSelected] = useState<ClientDetail | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [noteBarberId, setNoteBarberId] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetch("/api/public/bootstrap")
      .then((r) => r.json())
      .then((data) => {
        const all: Barber[] = data.branches.flatMap((b: { barbers: Barber[] }) => b.barbers);
        setBarbers(all);
        if (all.length > 0) setNoteBarberId(all[0].id);
      });
  }, []);

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setRows(data.clients);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadList, 250);
    return () => clearTimeout(t);
  }, [loadList]);

  const openClient = async (id: string) => {
    const res = await fetch(`/api/admin/clients/${id}`);
    const data = await res.json();
    setSelected(data.client);
  };

  const addNote = async () => {
    if (!selected || !noteText.trim()) return;
    setSavingNote(true);
    await fetch(`/api/admin/clients/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId: noteBarberId, text: noteText }),
    });
    setNoteText("");
    setSavingNote(false);
    openClient(selected.id);
  };

  return (
    <div className="flex min-w-[800px] gap-6">
      {/* Lista */}
      <div className={selected ? "w-80 shrink-0" : "w-full max-w-2xl"}>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-zinc-500">Ficha digital con historial de visitas y notas del barbero.</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="mt-4 w-full rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <div className="mt-4 overflow-hidden rounded-xl border-zinc-200 bg-white">
          {rows.map((c) => (
            <button
              key={c.id}
              onClick={() => openClient(c.id)}
              className={`flex w-full items-center justify-between border-b border-zinc-100 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-zinc-50 ${
                selected?.id === c.id ? "bg-blue-50" : ""
              }`}
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.phone}</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {c._count.bookings} visitas
              </span>
            </button>
          ))}
          {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-zinc-400">Sin resultados.</p>}
        </div>
      </div>

      {/* Ficha */}
      {selected && (
        <div className="flex-1">
          <div className="rounded-xl border-zinc-200 bg-white">
            <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-zinc-500">{selected.phone}{selected.email ? ` · ${selected.email}` : ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-zinc-700">Cerrar ✕</button>
            </div>

            <div className="grid md:grid-cols-2">
              {/* Historial */}
              <div className="border-b border-zinc-200 p-5 md:border-b-0 md:border-r">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Historial de visitas ({selected.bookings.length})
                </h3>
                <ul className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {selected.bookings.map((b) => (
                    <li key={b.id} className="rounded-lg border-zinc-200 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{prettyDate(b.date)}</span>
                        <span className={`text-[10px] font-semibold uppercase ${
                          b.status === "CANCELADO" || b.status === "NO_ASISTIO" ? "text-red-500" :
                          b.status === "ATENDIDO" ? "text-emerald-600" : "text-blue-600"
                        }`}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {minToLabel(b.startMin)} · {b.service.name} · {formatPrice(b.service.price)}
                        {b.barber ? ` · ${b.barber.name}` : ""}
                      </p>
                    </li>
                  ))}
                  {selected.bookings.length === 0 && (
                    <li className="text-sm text-zinc-400">Sin visitas registradas.</li>
                  )}
                </ul>
              </div>

              {/* Notas privadas */}
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Notas privadas del barbero
                </h3>
                <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {selected.notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-amber-50 p-3 text-sm">
                      <p>{n.text}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">— {n.barber.name}</p>
                    </li>
                  ))}
                  {selected.notes.length === 0 && (
                    <li className="text-sm text-zinc-400">Sin notas todavía.</li>
                  )}
                </ul>

                <div className="mt-4 space-y-2">
                  <select
                    value={noteBarberId}
                    onChange={(e) => setNoteBarberId(e.target.value)}
                    className="w-full rounded-lg border-zinc-300 px-2 py-1.5 text-xs"
                  >
                    {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    placeholder="Ej: Degradado medio, peineta #1.5 en lados, prefiere patillas en punta…"
                    className="w-full rounded-lg border-zinc-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={addNote}
                    disabled={savingNote || !noteText.trim()}
                    className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {savingNote ? "Guardando…" : "Agregar nota"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
