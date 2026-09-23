// ── Utilidades de tiempo (todo en hora local, sin zonas horarias) ──

/** 'YYYY-MM-DD' para una fecha dada (local) */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDaysStr(s: string, days: number): string {
  const d = fromDateStr(s);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(s: string): number {
  return fromDateStr(s).getDay();
}

/** 545 → '09:05' */
export function minToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** '09:05' → 545 */
export function labelToMin(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return h * 60 + m;
}

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** '2025-09-23' → 'martes 23 de septiembre' */
export function prettyDate(s: string): string {
  const d = fromDateStr(s);
  return `${WEEKDAYS[d.getDay()].toLowerCase()} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** Formato CLP: 12000 → '$12.000' */
export function formatPrice(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

export const SLOT_STEP_MIN = 15;
