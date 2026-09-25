"use client";

import { useCallback, useEffect, useState } from "react";

type BranchRef = { id: string; name: string };
type Barber = {
  id: string; name: string; active: boolean; branchId: string; email?: string | null;
  branch?: BranchRef;
};

const EMPTY = { name: "", branchId: "", email: "", password: "" };

export default function WorkersView() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [branches, setBranches] = useState<BranchRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Barber | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/barbers");
    if (res.ok) {
      const data = await res.json();
      setBarbers(Array.isArray(data.barbers) ? data.barbers : []);
      setBranches(Array.isArray(data.branches) ? data.branches : []);
    } else {
      setBarbers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Error al crear el trabajador");
      return;
    }
    setCreating(false);
    setForm(EMPTY);
    load();
  };

  const toggleActive = async (b: Barber) => {
    const res = await fetch(`/api/admin/barbers/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error");
      return;
    }
    load();
  };

  const openEdit = (b: Barber) => {
    setEditing(b);
    setEditName(b.name);
    setEditEmail(b.email ?? "");
    setEditPassword("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/admin/barbers/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: editEmail, ...(editPassword && { password: editPassword }) }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Error al guardar");
      return;
    }
    setEditing(null);
    load();
  };

  const remove = async (b: Barber) => {
    if (!confirm(`¿Eliminar a ${b.name}? Si tiene reservas asociadas será desactivado.`)) return;
    const res = await fetch(`/api/admin/barbers/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error al eliminar");
      return;
    }
    load();
  };

  const branchName = (b: Barber) =>
    branches.find((x) => x.id === b.branchId)?.name ?? b.branch?.name ?? "—";

  return (
    <div className="min-w-[700px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trabajadores</h1>
          <p className="text-sm text-zinc-500">
            Barberos de tus sucursales. Son exclusivos de cada barbería.
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setError(null); setForm({ ...EMPTY, branchId: branches[0]?.id ?? "" }); }}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          + Nuevo trabajador
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {barbers.map((b) => (
              <tr key={b.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-zinc-500">{b.email ?? "Sin acceso"}</p>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">{branchName(b)}</td>
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
            {!loading && !barbers.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                No hay trabajadores aún. Crea el primero.
              </td></tr>
            )}
            {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400">Cargando…</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal crear */}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <h3 className="font-semibold">Nuevo trabajador</h3>
          <div className="mt-4 space-y-3">
            <Field label="Nombre del barbero">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Correo (para que el barbero inicie sesión)">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="barbero@correo.cl" />
            </Field>
            <Field label="Contraseña (mín. 6)">
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="••••••" />
            </Field>
            {branches.length > 1 && (
              <Field label="Sucursal">
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={create} disabled={saving || !form.name.trim() || !form.email.trim() || form.password.length < 6} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? "Creando…" : "Crear"}
            </button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal editar */}
      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 className="font-semibold">Editar trabajador</h3>
          <div className="mt-4 space-y-3">
            <Field label="Nombre">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Correo">
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Nueva contraseña (dejar vacío para no cambiar)">
              <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={saveEdit} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white">Guardar</button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

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
