import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Webhook de Twilio: Status Callbacks.
 *
 * Twilio hace POST aquí cada vez que el mensaje de WhatsApp cambia de estado:
 *   queued -> sent -> delivered -> read   (o failed / undelivered)
 *
 * Configurado automáticamente vía `statusCallback` en lib/reminders.ts
 * (lib/reminders.ts incluye ?bookingId=<id> para saber qué reserva actualizar).
 *
 * Para producción se recomienda además validar la firma Twilio:
 *   TWILIO_WEBHOOK_URL debe apuntar a esta ruta y usar twilio.webhook()
 *   (npm i twilio) con twilio.authToken.
 */

// Mapea el estado de Twilio al reminderStatus interno de la reserva.
// No sobrescribimos CONFIRMADO (el cliente ya confirmó asistencia).
function mapStatus(twilioStatus: string): string | null {
  switch (twilioStatus) {
    case "queued":
    case "accepted":
    case "scheduled":
      return "ENVIADO"; // aún no sale; lo tratamos como enviado a la cola
    case "sent":
      return "ENVIADO";
    case "delivered":
      return "ENTREGADO";
    case "read":
      return "LEIDO";
    case "failed":
    case "undelivered":
      return "FALLADO";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  // Twilio envía application/x-www-form-urlencoded por defecto
  let form: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    form = await req.json().catch(() => ({}));
  } else {
    const fd = await req.formData().catch(() => null);
    if (fd) fd.forEach((v, k) => { form[k] = String(v); });
  }

  const bookingId = req.nextUrl.searchParams.get("bookingId") ?? form.bookingId ?? "";
  const messageStatus = form.MessageStatus ?? form.messageStatus ?? "";
  const sid = form.MessageSid ?? "";

  if (!bookingId || !messageStatus) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const newStatus = mapStatus(messageStatus);
  if (!newStatus) {
    console.warn(`[wa-status] estado desconocido: ${messageStatus} (booking=${bookingId})`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    console.warn(`[wa-status] reserva no encontrada: ${bookingId} (sid=${sid})`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  // No degradar: CONFIRMADO > LEIDO > ENTREGADO > ENVIADO > FALLADO
  const rank: Record<string, number> = {
    PENDIENTE: 0, FALLADO: 1, ENVIADO: 2, ENTREGADO: 3, LEIDO: 4, CONFIRMADO: 5,
  };
  const current = rank[booking.reminderStatus] ?? 0;
  const next = rank[newStatus] ?? 0;
  if (next <= current) {
    return NextResponse.json({ ok: true, ignored: true, current: booking.reminderStatus });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { reminderStatus: newStatus },
  });
  console.log(`[wa-status] booking=${bookingId} ${booking.reminderStatus} -> ${newStatus} (twilio=${messageStatus})`);

  return NextResponse.json({ ok: true });
}
