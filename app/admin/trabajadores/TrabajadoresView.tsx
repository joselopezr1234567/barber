"use client";

import { useCallback, useEffect, useState } from "react";

type Barber = {
  id: string; name: string; active: boolean; branchId: string;
  branch?: { name: string };
};
type BranchRef = { id: string; name: string };

const inputCls = "mt-1 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs text-zinc-500">{label}{children}</label>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function TrabajadoresView() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [branches, setBranches] = useState<BranchRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/barbers");
    if (!res.ok) return;
    const data = await res.json();
    setBarbers(data.barbers ?? []);
    setBranches(data.branches ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setName("");
    setBranchId(branches[0]?.id ?? "");
    setError(null);
  };

  const openEdit = (b: Barber) => {
    setEditing(b);
    setCreating(false);
    setName(b.name);
    setBranchId(b.branchId);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const url = creating ? "/api/admin/barbers" : `/api/admin/barbers/${editing?.id}`;
    const res = await fetch(url, {
      method: creating ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, branchId }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    setCreating(false);
    setEditing(null);
    load();
  };

  const toggleActive = async (b: Barber) => {
    await fetch(`/api/admin/barbers/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    load();
  };

  const remove = async (b: Barber) => {
    if (!confirm(`¿Eliminar al barbero "${b.name}"?`)) return;
    await fetch(`/api/admin/barbers/${b.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-w-[700px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trabajadores</h1>
          <p className="text-sm text-zinc-500">
            Barberos exclusivos de cada barbería. Los barberos inactivos no aparecen al agendar.
          </p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
          + Agregar barbero
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Barbero</th>
              <th className="px-4 py-3">Barbería</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {barbers.map((b) => (
              <tr key={b.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{b.branch?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    b.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                  }`}>
                    {b.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(b)} className="text-xs font-medium text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => toggleActive(b)} className="ml-3 text-xs font-medium text-zinc-500 hover:underline">
                    {b.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => remove(b)} className="ml-3 text-xs font-medium text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
            {!loading && barbers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400">Aún no hay barberos registrados.</td></tr>
            )}
            {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400">Cargando…</td></tr>}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <Modal onClose={() => { setCreating(false); setEditing(null); }}>
          <h3 className="font-semibold">{creating ? "Nuevo barbero" : "Editar barbero"}</h3>
          <div className="mt-4 space-y-3">
            <Field label="Nombre">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ej: Carlos" />
            </Field>
            <Field label="Barbería">
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
                <option value="">Selecciona una barbería</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>{br.name}</option>
                ))}
              </select>
            </Field>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button onClick={save} disabled={saving || !name || !branchId} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="rounded-lg border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
