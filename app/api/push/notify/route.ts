import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToClient, pushEnabled } from "@/lib/push";
import { minToLabel } from "@/lib/time";

/**
 * POST /api/push/notify  { token }
 * Envía INMEDIATAMENTE al celular del cliente la pregunta de la reserva:
 * ✅ Confirmar · 🔄 Reprogramar · ❌ Cancelar (botones de la notificación).
 * Se usa justo después de crear la reserva o de que el cliente acepte
 * las notificaciones, para que el primer aviso llegue al momento.
 */
export async function POST(req: NextRequest) {
  if (!pushEnabled) {
    return NextResponse.json({ error: "Push no configurado en el servidor" }, { status: 501 });
  }
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "Falta token" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { client: true, service: true, branch: true },
  });
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  if (booking.status === "CANCELADO") {
    return NextResponse.json({ ok: true, skipped: "cancelada" });
  }

  const cuando = `${booking.date} ${minToLabel(booking.startMin)}`;
  const sent = await sendPushToClient(booking.clientId, {
    title: "¿Confirmas tu cita?",
    body: `${booking.service.name} en ${booking.branch.name} — ${cuando}\n✅ Confirmar · 🔄 Reprogramar · ❌ Cancelar`,
    url: `/c/${booking.token}`,
    tag: `cita-${booking.id}`,
    token: booking.token,
    bookingId: booking.id,
  });

  if (sent > 0 && booking.reminderStatus === "PENDIENTE") {
    await prisma.booking.update({ where: { id: booking.id }, data: { reminderStatus: "NOTIFICADO" } });
  }

  return NextResponse.json({ ok: true, sent });
}
