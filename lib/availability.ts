// ── Motor de disponibilidad ─────────────
// Genera los horarios disponibles para un día, servicio y barbero(s).
import { prisma } from "./db";
import { SLOT_STEP_MIN, minToLabel, weekdayOf, todayStr } from "./time";

export type Slot = { startMin: number; label: string; barberIds: string[] };

type Interval = { start: number; end: number };

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Devuelve los slots disponibles.
 * @param barberId  id del barbero o "ANY" para cualquiera disponible
 */
export async function getAvailability(
  branchId: string,
  serviceId: string,
  date: string,
  barberId: string
): Promise<Slot[]> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return [];

  const barbers =
    barberId === "ANY"
      ? await prisma.barber.findMany({ where: { branchId, active: true } })
      : await prisma.barber.findMany({ where: { id: barberId, active: true } });

  if (barbers.length === 0) return [];

  const weekday = weekdayOf(date);
  const now = new Date();
  const today = todayStr();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Reservas activas del día (las canceladas no bloquean)
  const bookings = await prisma.booking.findMany({
    where: {
      date,
      status: "RESERVADO",
      barberId: { in: barbers.map((b) => b.id) },
    },
    select: { barberId: true, startMin: true, endMin: true },
  });

  // Bloqueos del día
  const blocks = await prisma.block.findMany({
    where: { date, barberId: { in: barbers.map((b) => b.id) } },
    select: { barberId: true, startMin: true, endMin: true },
  });

  // Turnos de trabajo
  const shifts = await prisma.shift.findMany({
    where: { weekday, barberId: { in: barbers.map((b) => b.id) } },
    select: { barberId: true, startMin: true, endMin: true },
  });

  const byBarber = new Map<string, Interval[]>();
  for (const b of barbers) byBarber.set(b.id, []);
  for (const s of shifts) {
    byBarber.get(s.barberId)!.push({ start: s.startMin, end: s.endMin });
  }

  const slotMap = new Map<number, Set<string>>();

  for (const barber of barbers) {
    const busy: Interval[] = [
      ...bookings.filter((x) => x.barberId === barber.id).map((x) => ({ start: x.startMin, end: x.endMin })),
      ...blocks.filter((x) => x.barberId === barber.id).map((x) => ({ start: x.startMin, end: x.endMin })),
    ];

    for (const shift of byBarber.get(barber.id)!) {
      for (let start = shift.start; start + service.durationMin <= shift.end; start += SLOT_STEP_MIN) {
        const cand: Interval = { start, end: start + service.durationMin };
        if (date === today && cand.start <= nowMin + 30) continue; // margen de 30 min
        if (busy.some((iv) => overlaps(cand, iv))) continue;
        if (!slotMap.has(start)) slotMap.set(start, new Set());
        slotMap.get(start)!.add(barber.id);
      }
    }
  }

  return [...slotMap.entries()]
    .filter(([, ids]) => ids.size > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([startMin, ids]) => ({ startMin, label: minToLabel(startMin), barberIds: [...ids] }));
}

/** Verifica y asigna un barbero concreto para un slot (usado al confirmar). */
export async function pickBarberForSlot(
  branchId: string,
  serviceId: string,
  date: string,
  startMin: number,
  preferredBarberId: string | null
): Promise<string | null> {
  const slots = await getAvailability(branchId, serviceId, date, preferredBarberId ?? "ANY");
  const slot = slots.find((s) => s.startMin === startMin);
  if (!slot) return null;
  if (preferredBarberId && slot.barberIds.includes(preferredBarberId)) return preferredBarberId;
  return slot.barberIds[0] ?? null;
}
