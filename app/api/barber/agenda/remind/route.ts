import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBarberSession } from "@/lib/auth";
import { sendReminderForBooking } from "@/lib/reminders";

/**
 * El barbero logueado envía el WhatsApp de confirmación para una de sus citas.
 * Body: { bookingId, type?: "RECORDATORIO" | "CONFIRMACION" } (default CONFIRMACION)
 */
export async function POST(req: NextRequest) {
  const session = await getBarberSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { bookingId, type } = await req.json().catch(() => ({}));
  if (!bookingId) {
    return NextResponse.json({ error: "Falta bookingId" }, { status: 400 });
  }
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, barberId: session.id },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  if (booking.status !== "RESERVADO") {
    return NextResponse.json({ error: "Solo se puede enviar en reservas activas" }, { status: 400 });
  }
  const sendType = type === "RECORDATORIO" ? "RECORDATORIO" : "CONFIRMACION";
  const result = await sendReminderForBooking(bookingId, sendType);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "No se pudo enviar el mensaje" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
