import twilio from "twilio";
import { prisma } from "./db";
import { minToLabel, prettyDate, toDateStr, addDaysStr } from "./time";

// ── Config Twilio (WhatsApp) ─────────────────────────────────
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // sandbox por defecto
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

export const twilioEnabled = Boolean(accountSid && authToken);
const client = twilioEnabled ? twilio(accountSid!, authToken!) : null;

/** Normaliza un teléfono chileno al formato wa:+569XXXXXXXX */
export function toWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("56")) digits = digits.slice(2);
  if (digits.startsWith("9") && digits.length === 9) return `whatsapp:+56${digits}`;
  if (digits.length === 8) return `whatsapp:+569${digits}`;
  return `whatsapp:+${digits}`;
}

function links(token: string) {
  const base = baseUrl || "";
  return {
    confirmar: `${base}/api/public/bookings/${token}/confirm`,
    reprogramar: `${base}/reservar?reprogramar=${token}`,
    cancelar: `${base}/api/public/bookings/${token}/cancel`,
  };
}

export function buildReminderMessage(
  type: "RECORDATORIO" | "CONFIRMACION",
  data: {
    token: string;
    clientName: string;
    serviceName: string;
    barberName: string;
    branchName: string;
    date: string;
    startMin: number;
  }
): string {
  const l = links(data.token);
  const cuando = `${prettyDate(data.date)} a las ${minToLabel(data.startMin)}`;
  const base = `💈 *${data.branchName}*\nHola ${data.clientName.split(" ")[0]}! Te recordamos tu cita:\n\n✂️ *${data.serviceName}*\n👨‍🔧 Barbero: ${data.barberName}\n📅 ${cuando}\n\n`;

  if (type === "RECORDATORIO") {
    return `${base}Tu cita es *mañana*. Si necesitas cambiarla:\n🔄 Reprogramar: ${l.reprogramar}\n❌ Cancelar: ${l.cancelar}`;
  }
  return `${base}*¿Confirmas tu asistencia hoy?*\n\n✅ Confirmar: ${l.confirmar}\n❌ Cancelar: ${l.cancelar}`;
}

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!client) return false;
  try {
    await client.messages.create({ from: fromNumber, to, body });
    return true;
  } catch (e) {
    console.error("[twilio] error enviando:", e);
    return false;
  }
}

// ── Envío individual ─────────────────────────────────────────
export async function sendReminderForBooking(bookingId: string, type: "RECORDATORIO" | "CONFIRMACION") {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, service: true, barber: true, branch: true },
  });
  if (!booking || booking.status !== "RESERVADO") return { ok: false, reason: "reserva no válida" };
  if (!booking.client.phone) return { ok: false, reason: "cliente sin teléfono" };

  const body = buildReminderMessage(type, {
    token: booking.token,
    clientName: booking.client.name,
    serviceName: booking.service.name,
    barberName: booking.barber?.name ?? "Por asignar",
    branchName: booking.branch.name,
    date: booking.date,
    startMin: booking.startMin,
  });

  const sent = await sendWhatsApp(toWhatsApp(booking.client.phone), body);
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      reminderStatus: sent ? "ENVIADO" : "FALLADO",
      reminderType: type,
    },
  });
  return { ok: sent };
}

// ── Procesador: qué enviar según hora/hora actual ────────────
export async function processReminders(): Promise<{ processed: number; sent: number; skipped: number; errors: number }> {
  const stats = { processed: 0, sent: 0, skipped: 0, errors: 0 };
  if (!client) {
    console.warn("[reminders] Twilio no configurado (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)");
    return stats;
  }

  const now = new Date();
  const today = toDateStr(now);
  const tomorrow = addDaysStr(today, 1);
  const hour = now.getHours();

  const pending = await prisma.booking.findMany({
    where: {
      status: "RESERVADO",
      reminderStatus: "PENDIENTE",
      date: { in: [today, tomorrow] },
    },
    include: { client: true, service: true, barber: true, branch: true },
  });

  for (const booking of pending) {
    stats.processed++;
    let type: "RECORDATORIO" | "CONFIRMACION" | null = null;

    if (booking.date === tomorrow && hour >= 18) {
      // Cita mañana y son las 18:00 o más → recordatorio víspera
      type = "RECORDATORIO";
    } else if (booking.date === today && booking.startMin < 12 * 60 && hour >= 18) {
      // caso borde: cita de hoy en la mañana y son 18:00 → ya pasó, descartar
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderStatus: "DESCARTADO" } });
      stats.skipped++;
      continue;
    } else if (booking.date === today && booking.startMin >= 12 * 60 && hour >= 10) {
      // Cita hoy en la tarde → confirmación a las 10:00
      type = "CONFIRMACION";
    }

    if (!type) {
      stats.skipped++;
      continue;
    }

    if (!booking.client.phone) {
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderStatus: "DESCARTADO" } });
      stats.skipped++;
      continue;
    }

    const body = buildReminderMessage(type, {
      token: booking.token,
      clientName: booking.client.name,
      serviceName: booking.service.name,
      barberName: booking.barber?.name ?? "Por asignar",
      branchName: booking.branch.name,
      date: booking.date,
      startMin: booking.startMin,
    });

    const sent = await sendWhatsApp(toWhatsApp(booking.client.phone), body);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderStatus: sent ? "ENVIADO" : "FALLADO", reminderType: type },
    });

    if (sent) stats.sent++;
    else stats.errors++;
  }

  return stats;
}
