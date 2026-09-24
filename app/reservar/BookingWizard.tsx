"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDaysStr, formatPrice, minToLabel, prettyDate, todayStr, WEEKDAYS_SHORT, fromDateStr,
} from "@/lib/time";

type Branch = { id: string; name: string; address: string; phone: string };
type Barber = { id: string; name: string; branchId: string };
type Service = { id: string; name: string; description: string | null; durationMin: number; price: number };
type Slot = { startMin: number; label: string; barberIds: string[] };

const STEPS = ["Local", "Servicio", "Barbero y hora", "Tus datos"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function BookingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rescheduleToken = searchParams.get("reprogramar");

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [step, setStep] = useState(0);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string>("ANY");
  const [date, setDate] = useState<string>(todayStr());
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchBarbers = useMemo(
    () => barbers.filter((b) => b.branchId === branchId),
    [barbers, branchId]
  );
  const service = services.find((s) => s.id === serviceId) ?? null;
  const branch = branches.find((b) => b.id === branchId) ?? null;

  // Días: hoy + 13
  const days = useMemo(() => {
    const t = todayStr();
    return Array.from({ length: 14 }, (_, i) => addDaysStr(t, i));
  }, []);

  // Bootstrap
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/public/bootstrap");
      const data = await res.json();
      setBranches(data.branches);
      setBarbers(data.branches.flatMap((b: Branch & { barbers: Barber[] }) => b.barbers));
      setServices(data.services);

      // Modo reprogramar: precargar datos de la reserva
      if (rescheduleToken) {
        const r = await fetch(`/api/public/bookings/${rescheduleToken}`);
        if (r.ok) {
          const { booking } = await r.json();
          setBranchId(booking.branchId);
          setServiceId(booking.serviceId);
          setBarberId(booking.barberId ?? "ANY");
          setStep(2);
        } else {
          setError("No encontramos la reserva a reprogramar");
        }
      } else if (data.branches.length === 1) {
        setBranchId(data.branches[0].id);
      }
      setLoading(false);
    })();
  }, [rescheduleToken]);

  // Cargar disponibilidad cuando cambia día/barbero (o servicio en modo reprogramar)
  const loadSlots = useCallback(async () => {
    if (!branchId || !serviceId) return;
    setSlotsLoading(true);
    setStartMin(null);
    try {
      const res = await fetch(
        `/api/public/availability?branchId=${branchId}&serviceId=${serviceId}&date=${date}&barberId=${barberId}`
      );
      const data = await res.json();
      setSlots(data.slots);
    } finally {
      setSlotsLoading(false);
    }
  }, [branchId, serviceId, date, barberId]);

  useEffect(() => {
    if (step === 2) loadSlots();
  }, [step, loadSlots]);

  const [branchSearch, setBranchSearch] = useState("");
  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(branchSearch.trim().toLowerCase()) ||
      b.address.toLowerCase().includes(branchSearch.trim().toLowerCase())
  );

  const submit = async () => {
    if (!branchId || !serviceId || startMin === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const url = rescheduleToken
        ? `/api/public/bookings/${rescheduleToken}/reschedule`
        : "/api/public/bookings";
      const body = rescheduleToken
        ? { date, startMin, barberId: barberId === "ANY" ? null : barberId }
        : { branchId, serviceId, barberId: barberId === "ANY" ? null : barberId, date, startMin, ...form };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al confirmar");
      router.push(`/reserva/${rescheduleToken ?? data.token}?nueva=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setSubmitting(false);
      loadSlots(); // refrescar slots por si cambió disponibilidad
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-zinc-500">Cargando…</div>
      </main>
    );
  }

  const canNext =
    (step === 0 && !!branchId) ||
    (step === 1 && !!serviceId) ||
    (step === 2 && startMin !== null) ||
    step === 3;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => (step > 0 ? setStep(step - 1) : router.push("/"))} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Volver
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest text-gold-400">
          {rescheduleToken ? "Reprogramar" : "Nueva reserva"}
        </span>
      </div>

      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-gold-500" : "bg-zinc-800"}`} />
            <p className={`mt-1.5 text-[10px] ${i === step ? "text-zinc-200" : "text-zinc-500"}`}>{label}</p>
          </li>
        ))}
      </ol>

      {/* Paso 1: Sucursal */}
      {step === 0 && (
        <section className="animate-fade-up">
          <h2 className="text-xl font-bold">¿Dónde quieres tu cita?</h2>
          <p className="mt-1 text-sm text-zinc-400">Elige la sucursal más cercana.</p>
          <input
            type="search"
            value={branchSearch}
            onChange={(e) => setBranchSearch(e.target.value)}
            placeholder="Buscar barbería por nombre…"
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-gold-500 focus:outline-none"
          />
          <div className="mt-4 space-y-3">
            {filteredBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => { setBranchId(b.id); setBarberId("ANY"); }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  branchId === b.id
                    ? "border-gold-500 bg-gold-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <p className="font-semibold">{b.name}</p>
                <p className="mt-0.5 text-sm text-zinc-400">{b.address}</p>
                <p className="text-sm text-zinc-500">{b.phone}</p>
              </button>
            ))}
            {filteredBranches.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">No encontramos barberías con ese nombre.</p>
            )}
          </div>
        </section>
      )}

      {/* Paso 2: Servicio */}
      {step === 1 && (
        <section className="animate-fade-up">
          <h2 className="text-xl font-bold">¿Qué te harás hoy?</h2>
          <p className="mt-1 text-sm text-zinc-400">Duración estimada y precio.</p>
          <div className="mt-4 space-y-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  serviceId === s.id
                    ? "border-gold-500 bg-gold-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{s.name}</p>
                  <p className="whitespace-nowrap font-semibold text-gold-400">{formatPrice(s.price)}</p>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {s.durationMin} min{s.description ? ` · ${s.description}` : ""}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Paso 3: Barbero y horario */}
      {step === 2 && (
        <section className="animate-fade-up">
          <h2 className="text-xl font-bold">Elige barbero y hora</h2>

          {/* Barberos */}
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setBarberId("ANY")}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${
                barberId === "ANY" ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-zinc-800 bg-zinc-900 text-zinc-300"
              }`}
            >
              ✨ Cualquiera
            </button>
            {branchBarbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarberId(b.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  barberId === b.id ? "border-gold-500 bg-gold-500/10" : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold">
                  {initials(b.name)}
                </span>
                {b.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Días */}
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const dt = fromDateStr(d);
              const active = d === date;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 transition ${
                    active ? "border-gold-500 bg-gold-500/10" : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                  }`}
                >
                  <span className={`text-[10px] uppercase ${active ? "text-gold-400" : "text-zinc-500"}`}>
                    {WEEKDAYS_SHORT[dt.getDay()]}
                  </span>
                  <span className={`text-lg font-bold ${active ? "text-gold-400" : "text-zinc-200"}`}>{dt.getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* Horas */}
          <div className="mt-5">
            <p className="text-sm font-medium text-zinc-300">{prettyDate(date)}</p>
            {slotsLoading ? (
              <div className="mt-3 animate-pulse text-sm text-zinc-500">Buscando horarios…</div>
            ) : !slots || slots.length === 0 ? (
              <div className="mt-3 rounded-xl border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
                No hay horarios para este día. Prueba con otra fecha o con “Cualquiera”.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.startMin}
                    onClick={() => setStartMin(s.startMin)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                      startMin === s.startMin
                        ? "border-gold-500 bg-gold-500 text-zinc-950"
                        : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Paso 4: Datos y confirmación */}
      {step === 3 && (
        <section className="animate-fade-up">
          <h2 className="text-xl font-bold">Confirma tu reserva</h2>

          {/* Resumen */}
          <div className="mt-4 rounded-2xl border-zinc-800 bg-zinc-900 p-4 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Sucursal</span><span>{branch?.name}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-zinc-400">Servicio</span><span>{service?.name}</span></div>
            <div className="mt-2 flex justify-between">
              <span className="text-zinc-400">Barbero</span>
              <span>{barberId === "ANY" ? "Cualquiera disponible" : branchBarbers.find((b) => b.id === barberId)?.name}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-zinc-400">Fecha</span>
              <span className="capitalize">{prettyDate(date)}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-zinc-400">Hora</span>
              <span>{startMin !== null ? `${minToLabel(startMin)} – ${minToLabel(startMin + (service?.durationMin ?? 0))}` : "—"}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-zinc-800 pt-2 font-semibold">
              <span>Total</span><span className="text-gold-400">{service ? formatPrice(service.price) : "—"}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <input
              placeholder="Nombre y apellido *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border-zinc-800 bg-zinc-900 px-4 py-3 outline-none placeholder:text-zinc-500 focus:border-gold-500"
            />
            <input
              placeholder="Teléfono / WhatsApp *"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border-zinc-800 bg-zinc-900 px-4 py-3 outline-none placeholder:text-zinc-500 focus:border-gold-500"
            />
            <input
              placeholder="Correo electrónico (opcional)"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border-zinc-800 bg-zinc-900 px-4 py-3 outline-none placeholder:text-zinc-500 focus:border-gold-500"
            />
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 rounded-xl border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Barra inferior fija */}
      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          {step === 3 ? (
            <button
              onClick={submit}
              disabled={submitting || !form.name.trim() || !form.phone.trim()}
              className="flex-1 rounded-xl bg-gold-500 py-3.5 font-semibold text-zinc-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Confirmando…" : rescheduleToken ? "Confirmar nueva hora" : "Confirmar Reserva"}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex-1 rounded-xl bg-gold-500 py-3.5 font-semibold text-zinc-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
