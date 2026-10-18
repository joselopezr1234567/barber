"use strict";
// ── Utilidades de tiempo (todo en hora local, sin zonas horarias) ──
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLOT_STEP_MIN = exports.MONTHS = exports.WEEKDAYS_SHORT = exports.WEEKDAYS = void 0;
exports.toDateStr = toDateStr;
exports.fromDateStr = fromDateStr;
exports.todayStr = todayStr;
exports.addDaysStr = addDaysStr;
exports.weekdayOf = weekdayOf;
exports.minToLabel = minToLabel;
exports.labelToMin = labelToMin;
exports.prettyDate = prettyDate;
exports.formatPrice = formatPrice;
/** 'YYYY-MM-DD' para una fecha dada (local) */
function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function fromDateStr(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}
function todayStr() {
    return toDateStr(new Date());
}
function addDaysStr(s, days) {
    const d = fromDateStr(s);
    d.setDate(d.getDate() + days);
    return toDateStr(d);
}
/** 0 = domingo … 6 = sábado */
function weekdayOf(s) {
    return fromDateStr(s).getDay();
}
/** 545 → '09:05' */
function minToLabel(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** '09:05' → 545 */
function labelToMin(label) {
    const [h, m] = label.split(":").map(Number);
    return h * 60 + m;
}
exports.WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
exports.WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
exports.MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
/** '2025-09-23' → 'martes 23 de septiembre' */
function prettyDate(s) {
    const d = fromDateStr(s);
    return `${exports.WEEKDAYS[d.getDay()].toLowerCase()} ${d.getDate()} de ${exports.MONTHS[d.getMonth()]}`;
}
/** Formato CLP: 12000 → '$12.000' */
function formatPrice(n) {
    return "$" + n.toLocaleString("es-CL");
}
exports.SLOT_STEP_MIN = 15;
