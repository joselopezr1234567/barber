import webpush from "web-push";
import { prisma } from "./db";

/**
 * Notificaciones push (Web Push estándar del navegador).
 *
 * El cliente acepta las notificaciones (Notification.requestPermission)
 * desde la página de confirmación de su reserva (/c/<token>) y el
 * dispositivo queda registrado en PushSubscription.
 *
 * El cron (/api/cron/push) envía el recordatorio 1 día antes de la cita
 * a todos los clientes con cita al día siguiente. No importa la hora:
 * solo se requiere que la cita sea de mañana y aún no esté notificada.
 */

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contacto@proagenda.cl";

export const pushEnabled = Boolean(vapidPublic && vapidPrivate);

if (pushEnabled) {
  webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  // Token e id de la reserva: permiten confirmar/cancelar directo
  // desde los botones de la notificación (ver public/sw.js).
  token?: string;
  bookingId?: string;
};

/** Envía a todas las suscripciones de un cliente. Borra las inválidas (410/404). */
export async function sendPushToClient(clientId: string, payload: PushPayload): Promise<number> {
  if (!pushEnabled) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { clientId } });
  return sendToSubs(subs, payload);
}

/** Envía a todas las suscripciones registradas (broadcast). */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  if (!pushEnabled) return 0;
  const subs = await prisma.pushSubscription.findMany();
  return sendToSubs(subs, payload);
}

async function sendToSubs(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
): Promise<number> {
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (e: any) {
        const status = e?.statusCode ?? 0;
        // Suscripción vencida o revocada por el usuario: eliminar.
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.warn(`[push] fallo (${status}):`, e?.message);
        }
      }
    })
  );
  return sent;
}

/** Fecha de mañana en formato YYYY-MM-DD (hora local del servidor). */
export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local del servidor). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Procesador de recordatorios: envía la notificación a los clientes con
 * cita MAÑANA (cualquier hora) y a los de HOY que aún no hayan sido
 * notificados (reserva creada ayer para hoy, p. ej.). Idempotente.
 */
export async function processPushReminders(): Promise<{ processed: number; sent: number; skipped: number }> {
  const stats = { processed: 0, sent: 0, skipped: 0 };
  if (!pushEnabled) {
    console.warn("[push] VAPID no configurado (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
    return stats;
  }

  const targets = await prisma.booking.findMany({
    where: {
      status: "RESERVADO",
      reminderStatus: "PENDIENTE",
      date: { in: [tomorrowISO(), todayISO()] },
    },
    include: { client: true, service: true, branch: true, barber: true },
  });

  for (const b of targets) {
    stats.processed++;
    const subs = await prisma.pushSubscription.findMany({ where: { clientId: b.clientId } });
    if (!subs.length) {
      stats.skipped++;
      continue; // sin dispositivo registrado: queda PENDIENTE para cuando acepte
    }
    const when = `${b.date} ${String(Math.floor(b.startMin / 60)).padStart(2, "0")}:${String(b.startMin % 60).padStart(2, "0")}`;
    const sent = await sendToSubs(subs, {
      title: "Recordatorio de tu cita",
      body: `Hola ${b.client.name.split(" ")[0]}, tu cita de ${b.service.name} en ${b.branch.name} es ${b.date === tomorrowISO() ? "mañana" : "hoy"} (${when})${b.barber ? ` con ${b.barber.name}` : ""}.\n\n✅ Confirmar · 🔄 Reprogramar · ❌ Cancelar`,
      url: `/c/${b.token}`,
      tag: `cita-${b.id}`,
      token: b.token,
      bookingId: b.id,
    });
    await prisma.booking.update({
      where: { id: b.id },
      data: { reminderStatus: sent > 0 ? "NOTIFICADO" : "PENDIENTE" },
    });
    if (sent > 0) stats.sent++;
  }
  return stats;
}
