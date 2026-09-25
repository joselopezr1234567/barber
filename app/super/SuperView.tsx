"use client";

import { useCallback, useEffect, useState } from "react";

type BranchRef = { id: string; name: string };
type BranchFull = { id: string; name: string; address: string | null; ownerName: string | null; ownerEmail: string | null };
type Account = {
  id: string; email: string; name: string; role: string; active: boolean;
  createdAt: string;       branches: { id: string; name: string; barbers: { id: string; name: string; active: boolean }[] }[];
  };

const EMPTY_FORM = { name: "", email: "", password: "", role: "SHOP_OWNER" };

export default function SuperView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<BranchRef[]>([]);
  const [branchesFull, setBranchesFull] = useState<BranchFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formBranches, setFormBranches] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Account | null>(null);
  const [viewingBarbers, setViewingBarbers] = useState<Account | null>(null);

  // Nueva sucursal
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", ownerEmail: "", ownerPassword: "" });
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const createBranch = async () => {
    setSavingBranch(true);
    setBranchError(null);
    // 1. crear cuenta dueña (si se indican credenciales)
    let accountId: string | null = null;
    if (branchForm.ownerEmail.trim() && branchForm.ownerPassword.length >= 6) {
      const rAcc = await fetch("/api/super/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchForm.name,
          email: branchForm.ownerEmail.trim(),
          password: branchForm.ownerPassword,
          role: "SHOP_OWNER",
          branchIds: [],
        }),
      });
      const dAcc = await rAcc.json();
      if (!rAcc.ok) {
        setSavingBranch(false);
        setBranchError(dAcc.error ?? "Error al crear el login de la barbería");
        return;
      }
      accountId = dAcc.account.id;
    }
    const r = await fetch("/api/super/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: branchForm.name, address: branchForm.address, phone: branchForm.phone, accountId }),
    });
    const data = await r.json();
    setSavingBranch(false);
    if (!r.ok) {
      setBranchError(data.error ?? "Error al crear la sucursal");
      return;
    }
    setCreatingBranch(false);
    setBranchForm({ name: "", address: "", phone: "", ownerEmail: "", ownerPassword: "" });
    load();
  };
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBranches, setEditBranches] = useState<string[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/accounts");
    if (!res.ok) return;
    const data = await res.json();
    setAccounts(data.accounts);
    setBranches(data.branches);
    setLoading(false);
    // cargar sucursales completas para gestión
    const r2 = await fetch("/api/super/branches");
    if (r2.ok) {
      const d2 = await r2.json();
      setBranchesFull(d2.branches);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAccount = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/super/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, branchIds: formBranches }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Error al crear la cuenta");
      return;
    }
    setCreating(false);
    setForm(EMPTY_FORM);
    setFormBranches([]);
    load();
  };

  const toggleActive = async (a: Account) => {
    const res = await fetch(`/api/super/accounts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !a.active }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Error");
      return;
    }
    load();
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setEditName(a.name);
    setEditPassword("");
    setEditBranches(a.branches.map((b) => b.id));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/super/accounts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        branchIds: editBranches,
        ...(editPassword && { password: editPassword }),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Error al guardar");
      return;
    }
    setEditing(null);
    load();
  };

  const toggleBranch = (list: string[], id: string, set: (v: string[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const branchNames = (a: Account) =>
    a.branches.length ? a.branches.map((b) => b.name).join(", ") : "—";

  const barberCounts = (a: Account) => {
    const total = a.branches.reduce((n, b) => n + (b.barbers?.length ?? 0), 0);
    return total;
  };

  const allBarbers = (a: Account) =>
    a.branches.flatMap((b) =>
      (b.barbers ?? []).map((w) => ({ ...w, branchName: b.name }))
    );

  return (
    <div className="min-w-[800px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logins de barberías</h1>
          <p className="text-sm text-zinc-500">
            Crea y administra las cuentas que usan las barberías para entrar a su panel.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setCreatingBranch(true); setBranchError(null); }}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            + Nueva barbería
          </button>
          <button
            onClick={() => { setCreating(true); setError(null); setForm(EMPTY_FORM); setFormBranches([]); }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            + Nueva cuenta
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Sucursales</th>
              <th className="px-4 py-3">Trabajadores</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-zinc-500">{a.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    a.role === "PLATFORM_ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {a.role === "PLATFORM_ADMIN" ? "Plataforma" : "Barbería"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{branchNames(a)}</td>
                <td className="px-4 py-3 text-xs">
                  {barberCounts(a) === 0 ? (
                    <span className="text-zinc-400">—</span>
                  ) : (
                    <button
                      onClick={() => setViewingBarbers(a)}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 hover:bg-zinc-200"
                    >
                      {barberCounts(a)} trab.
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    a.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                  }`}>
                    {a.active ? "Activa" : "Desactivada"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(a)} className="text-xs font-medium text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => toggleActive(a)} className="ml-3 text-xs font-medium text-zinc-500 hover:underline">
                    {a.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Cargando…</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal crear sucursal */}
      {creatingBranch && (
        <Modal onClose={() => setCreatingBranch(false)}>
          <h3 className="font-semibold">Nueva barbería</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Se crea la sucursal y opcionalmente su login para /admin.</p>
          <div className="mt-4 space-y-3">
            <Field label="Nombre de la barbería / sucursal">
              <input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className={inputCls} placeholder="Barbería El Estilo" />
            </Field>
            <Field label="Dirección (opcional)">
              <input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Teléfono">
              <input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} className={inputCls} placeholder="+56 9 1234 5678" />
            </Field>
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-600">Login de la barbería (opcional pero recomendado)</p>
              <Field label="Email">
                <input type="email" value={branchForm.ownerEmail} onChange={(e) => setBranchForm({ ...branchForm, ownerEmail: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Contraseña (mín. 6)">
                <input type="text" value={branchForm.ownerPassword} onChange={(e) => setBranchForm({ ...branchForm, ownerPassword: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </div>
          {branchError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{branchError}</p>}
          <div className="mt-5 flex gap-2">
            <button onClick={createBranch} disabled={savingBranch} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {savingBranch ? "Creando…" : "Crear barbería"}
            </button>
            <button onClick={() => setCreatingBranch(false)} className="rounded-lg border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal crear cuenta */}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <h3 className="font-semibold">Nueva cuenta</h3>
          <div className="mt-4 space-y-3">
            <Field label="Nombre / Barbería">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Contraseña (mín. 6)">
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Rol">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                <option value="SHOP_OWNER">Barbería (accede a /admin)</option>
                <option value="PLATFORM_ADMIN">Plataforma (accede a /super)</option>
              </select>
            </Field>
            {form.role === "SHOP_OWNER" && (
              <Field label="Sucursales asignadas">
                <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-lg border-zinc-200 p-2">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formBranches.includes(b.id)}
                        onChange={() => toggleBranch(formBranches, b.id, setFormBranches)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </Field>
            )}
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button onClick={createAccount} disabled={saving} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? "Creando…" : "Crear cuenta"}
            </button>
            <button onClick={() => setCreating(false)} className="rounded-lg border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal ver trabajadores */}
      {viewingBarbers && (
        <Modal onClose={() => setViewingBarbers(null)}>
          <h3 className="font-semibold">Trabajadores de {viewingBarbers.name}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{viewingBarbers.email}</p>
          <div className="mt-4 space-y-3">
            {allBarbers(viewingBarbers).length === 0 ? (
              <p className="text-sm text-zinc-400">Esta barbería aún no registra trabajadores.</p>
            ) : (
              viewingBarbers.branches.map((b) => (
                <div key={b.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{b.name}</p>
                  <ul className="mt-1 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                    {(b.barbers ?? []).map((w) => (
                      <li key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{w.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          w.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                        }`}>
                          {w.active ? "Activo" : "Inactivo"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <div className="mt-5">
            <button onClick={() => setViewingBarbers(null)} className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white">
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal editar */}
      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 className="font-semibold">Editar cuenta</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{editing.email}</p>
          <div className="mt-4 space-y-3">
            <Field label="Nombre">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Nueva contraseña (dejar vacío para no cambiar)">
              <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className={inputCls} />
            </Field>
            {editing.role === "SHOP_OWNER" && (
              <Field label="Sucursales asignadas">
                <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-lg border-zinc-200 p-2">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editBranches.includes(b.id)}
                        onChange={() => toggleBranch(editBranches, b.id, setEditBranches)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </Field>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={saveEdit} className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white">
              Guardar cambios
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg border-zinc-300 px-4 py-2 text-sm">Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "mt-1 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs text-zinc-500">{label}{children}</label>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
