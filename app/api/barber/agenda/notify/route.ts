import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBarberSession } from "@/lib/auth";
import { sendPushToClient, pushEnabled } from "@/lib/push";
import { minToLabel, prettyDate } from "@/lib/time";

/**
 * POST /api/barber/agenda/notify  { bookingId }
 * El profesional envía al celular del cliente la notificación con la
 * pregunta de confirmación (✅ Confirmar · 🔄 Reprogramar · ❌ Cancelar).
 * Al confirmar, la reserva queda CONFIRMADA y la agenda se refresca sola.
 */
export async function POST(req: NextRequest) {
  const session = await getBarberSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { bookingId } = await req.json().catch(() => ({}));
  if (!bookingId) return NextResponse.json({ error: "Falta bookingId" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, service: true, branch: true },
  });
  if (!booking || booking.barberId !== session.id) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (!pushEnabled) {
    return NextResponse.json({ error: "Notificaciones no configuradas en el servidor" }, { status: 501 });
  }
  if (booking.status !== "RESERVADO") {
    return NextResponse.json({ error: "Esta cita ya no está pendiente" }, { status: 400 });
  }

  const cuando = `${prettyDate(booking.date)} · ${minToLabel(booking.startMin)}`;
  const sent = await sendPushToClient(booking.clientId, {
    title: "¿Confirmas tu cita?",
    body: `${booking.service.name} en ${booking.branch.name} — ${cuando}\n✅ Confirmar · 🔄 Reprogramar · ❌ Cancelar`,
    url: `/c/${booking.token}`,
    tag: `cita-${booking.id}`,
    token: booking.token,
    bookingId: booking.id,
  });

  if (sent === 0) {
    return NextResponse.json({
      error: "El cliente aún no activa las notificaciones. Envíale su enlace de reserva para que las active.",
    }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { reminderStatus: "NOTIFICADO", reminderType: "RECORDATORIO" },
  });

  return NextResponse.json({ ok: true });
}
