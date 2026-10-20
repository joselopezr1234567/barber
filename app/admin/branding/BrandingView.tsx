"use client";

import { useCallback, useEffect, useState } from "react";

type Branch = {
  id: string;
  name: string;
  address: string;
  logoUrl: string | null;
  coverUrl: string | null;
  logoData?: unknown;
  coverData?: unknown;
  promoText: string | null;
  promoLinkUrl: string | null;
};

const CACHE_BUST = () => `?v=${Date.now()}`;

function ImageField({
  branch,
  kind,
  current,
  onSaved,
}: {
  branch: Branch;
  kind: "logo" | "cover";
  current: string | null;
  onSaved: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/public/branding/${branch.id}/${kind}`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo subir la imagen");
    }
    setPreview(null);
    setUploading(false);
    onSaved();
  };

  const url = preview ?? (current ? `${current}${CACHE_BUST()}` : null);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold">{kind === "logo" ? "Logo" : "Imagen de fondo (cover)"}</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {kind === "logo"
          ? "PNG o WebP cuadrado, se muestra junto al nombre del negocio."
          : "Foto ancha que aparece arriba del flujo de reserva personalizado."}
      </p>
      <div className="mt-3 flex items-center gap-4">
        {url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={kind}
            className={kind === "logo"
              ? "h-14 w-14 rounded-lg border border-zinc-200 object-contain"
              : "h-20 w-36 rounded-lg border border-zinc-200 object-cover"}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400">
            {kind === "logo" ? "🏪" : "🖼️"}
          </div>
        )}
        <div className="flex flex-col gap-1 text-xs font-medium">
          <label className="cursor-pointer rounded-lg bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800">
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function BrandingView() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoDraft, setPromoDraft] = useState<Record<string, { text: string; link: string }>>({});
  const [savingPromo, setSavingPromo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/branches");
    if (res.ok) {
      const data = await res.json();
      setBranches(data.branches ?? []);
      setPromoDraft(
        Object.fromEntries(
          (data.branches ?? []).map((b: Branch) => [
            b.id,
            { text: b.promoText ?? "", link: b.promoLinkUrl ?? "" },
          ])
        )
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const savePromo = async (branchId: string) => {
    const d = promoDraft[branchId];
    if (!d) return;
    setSavingPromo(branchId);
    const res = await fetch("/api/admin/branches/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        promoText: d.text.trim() || null,
        promoLinkUrl: d.link.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Error al guardar");
    }
    setSavingPromo(null);
    load();
  };

  return (
    <div className="min-w-0">
      <div>
        <h1 className="text-2xl font-bold">Personalización</h1>
        <p className="text-sm text-zinc-500">
          Logo, imagen de fondo y propaganda que ven tus clientes al reservar.
        </p>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Cargando…</p>
      ) : (
        <div className="mt-6 space-y-6">
          {branches.map((b) => (
            <section key={b.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="font-semibold">{b.name}</h2>
              <p className="text-xs text-zinc-500">{b.address}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ImageField branch={b} kind="logo" current={b.logoUrl} onSaved={load} />
                <ImageField branch={b} kind="cover" current={b.coverUrl} onSaved={load} />
              </div>

              {/* Propaganda */}
              <div className="mt-4 rounded-xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold">Propaganda bajo el botón "Reservar cita"</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Un anuncio corto (máx. 200 caracteres) con enlace opcional. Ej: "🔥 20% OFF pagando en efectivo".
                </p>
                <input
                  value={promoDraft[b.id]?.text ?? ""}
                  onChange={(e) => setPromoDraft({ ...promoDraft, [b.id]: { ...promoDraft[b.id], text: e.target.value } })}
                  maxLength={200}
                  placeholder="Ej: 🔥 20% OFF pagando en efectivo"
                  className="mt-3 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm"
                />
                <input
                  value={promoDraft[b.id]?.link ?? ""}
                  onChange={(e) => setPromoDraft({ ...promoDraft, [b.id]: { ...promoDraft[b.id], link: e.target.value } })}
                  placeholder="https://enlace-opcional (Instagram, web, etc.)"
                  className="mt-2 w-full rounded-lg border-zinc-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => savePromo(b.id)}
                  disabled={savingPromo === b.id}
                  className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
                >
                  {savingPromo === b.id ? "Guardando…" : "Guardar propaganda"}
                </button>
              </div>
            </section>
          ))}
          {!loading && branches.length === 0 && (
            <p className="rounded-xl bg-white py-8 text-center text-sm text-zinc-400">No hay sucursales.</p>
          )}
        </div>
      )}
    </div>
  );
}
