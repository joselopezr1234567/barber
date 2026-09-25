import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBarberSession } from "@/lib/auth";

/** Agenda del barbero logueado: solo sus citas del día. */
export async function GET(req: NextRequest) {
  const session = await getBarberSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });

  const bookings = await prisma.booking.findMany({
    where: { date, barberId: session.id },
    include: { service: true, client: true },
    orderBy: { startMin: "asc" },
  });

  const blocks = await prisma.block.findMany({
    where: { date, barberId: session.id },
  });

  const weekday = new Date(date + "T12:00:00").getDay();
  const shifts = await prisma.shift.findMany({
    where: { weekday, barberId: session.id },
  });

  return NextResponse.json({ bookings, blocks, shifts });
}

/** El barbero puede actualizar el estado de sus propias citas. */
export async function PATCH(req: NextRequest) {
  const session = await getBarberSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { bookingId, status } = await req.json().catch(() => ({}));
  const valid = ["RESERVADO", "ATENDIDO", "CANCELADO", "NO_ASISTIO"];
  if (!bookingId || !valid.includes(status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.barberId !== session.id) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  return NextResponse.json({ ok: true });
}
