"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/time";

type Service = {
  id: string; name: string; description: string | null;
  durationMin: number; price: number; active: boolean;
};

const EMPTY = { name: "", description: "", durationMin: "30", price: "12000" };

export default function ServicesView() {
  const [services, setServices] = useState<Service[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/services");
    const data = await res.json();
    setServices(data.services);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description ?? "", durationMin: String(s.durationMin), price: String(s.price) });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY);
  };

  const save = async () => {
    setSaving(true);
    const body = { name: form.name, description: form.description, durationMin: Number(form.durationMin), price: Number(form.price) };
    if (editing) {
      await fetch(`/api/admin/services/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/services", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const toggle = async (s: Service) => {
    await fetch(`/api/admin/services/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !s.active }),
    });
    load();
  };

  return (
    <div className="min-w-[700px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de servicios</h1>
          <p className="text-sm text-zinc-500">Nombre, duración y precio. Pausa los servicios que no ofreces ahora.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
          + Agregar servicio
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Duración</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.name}</p>
                  {s.description && <p className="text-xs text-zinc-500">{s.description}</p>}
                </td>
                <td className="px-4 py-3">{s.durationMin} min</td>
                <td className="px-4 py-3 font-medium">{formatPrice(s.price)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                  }`}>
                    {s.active ? "Activo" : "Pausado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="text-xs font-medium text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => toggle(s)} className="ml-3 text-xs font-medium text-zinc-500 hover:underline">
                    {s.active ? "Pausar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">No hay servicios todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal editar/crear */}
      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setEditing(null); setCreating(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">{editing ? "Editar servicio" : "Nuevo servicio"}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-zinc-500">Nombre
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs text-zinc-500">Descripción
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-zinc-500">Duración (min)
                  <input type="number" min="5" step="5" value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                    className="mt-1 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-xs text-zinc-500">Precio
                  <input type="number" min="0" step="500" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm" />
                </label>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button onClick={() => { setEditing(null); setCreating(false); }} className="rounded-lg border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
