"use client";

import { useCallback, useEffect, useState } from "react";
import { minToLabel, labelToMin, WEEKDAYS } from "@/lib/time";

type Barber = { id: string; name: string; branchId: string; active: boolean };
type Shift = { id?: string; weekday: number; startMin: number; endMin: number };

/** Estado local: por día, lista de bloques {start,end} en "HH:MM" */
type DayBlock = { start: string; end: string };
type DayBlocks = DayBlock[][]; // un array por cada día de la semana
type BranchWithBarbers = { barbers: Barber[] };
const emptyWeek = (): DayBlocks =>
  Array.from({ length: 7 }, () => [] as DayBlock[]);

export default function ShiftsView() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [days, setDays] = useState<DayBlocks>(emptyWeek);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/public/bootstrap");
      const data = await res.json();
      const all = data.branches.flatMap((b: BranchWithBarbers) => b.barbers);
      setBarbers(all);
      if (all.length > 0) setBarberId(all[0].id);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!barberId) return;
    const res = await fetch(`/api/admin/shifts?barberId=${barberId}`);
    const data = await res.json();
    const next = emptyWeek();
    for (const s of data.shifts as Shift[]) {
      next[s.weekday].push({ start: minToLabel(s.startMin), end: minToLabel(s.endMin) });
    }
    setDays(next);
    setMessage(null);
  }, [barberId]);

  useEffect(() => { load(); }, [load]);

  const setBlock = (day: number, i: number, key: "start" | "end", value: string) => {
    setDays((prev) => prev.map((blocks, d) => d === day ? blocks.map((b, j) => j === i ? { ...b, [key]: value } : b) : blocks));
  };

  const addBlock = (day: number) => {
    setDays((prev) => prev.map((blocks, d) => d === day ? [...blocks, { start: "10:00", end: "20:00" }] : blocks));
  };

  const removeBlock = (day: number, i: number) => {
    setDays((prev) => prev.map((blocks, d) => d === day ? blocks.filter((_, j) => j !== i) : blocks));
  };

  const save = async () => {
    if (!barberId) return;
    setSaving(true);
    setMessage(null);
    const shifts = days.flatMap((blocks, weekday) =>
      blocks
        .filter((b) => b.start && b.end)
        .map((b) => ({ weekday, startMin: labelToMin(b.start), endMin: labelToMin(b.end) }))
    );
    const res = await fetch("/api/admin/shifts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, shifts }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMessage("✅ Turnos guardados");
      load();
    } else {
      setMessage(`⚠️ ${data.error ?? "Error al guardar"}`);
    }
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="min-w-[800px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Turnos de trabajo</h1>
          <p className="text-sm text-zinc-500">
            Configura los bloques de trabajo por día. Dos bloques el mismo día = jornada partida (ej. almuerzo entre medio).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={barberId ?? ""}
            onChange={(e) => setBarberId(e.target.value)}
            className="rounded-lg border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            onClick={save}
            disabled={saving || !barberId}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm">{message}</p>}

      <div className="mt-6 space-y-3">
        {WEEKDAYS.map((name, day) => (
          <div key={name} className="rounded-xl border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{name}</p>
              <button onClick={() => addBlock(day)} className="text-xs font-medium text-blue-600 hover:underline">
                + Agregar bloque
              </button>
            </div>
            {days[day].length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">Día libre (sin atención)</p>
            ) : (
              <div className="mt-3 space-y-2">
                {days[day].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <input type="time" value={b.start} onChange={(e) => setBlock(day, i, "start", e.target.value)}
                      className="rounded-lg border-zinc-300 px-2 py-1.5" />
                    <span className="text-zinc-400">a</span>
                    <input type="time" value={b.end} onChange={(e) => setBlock(day, i, "end", e.target.value)}
                      className="rounded-lg border-zinc-300 px-2 py-1.5" />
                    <button onClick={() => removeBlock(day, i)} className="ml-2 text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
