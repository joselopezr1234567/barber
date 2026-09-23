import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickBarberForSlot } from "@/lib/availability";

/** Reprogramar reserva pública: nuevo día/hora/barbero, revalida disponibilidad */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { date, startMin, barberId } = (await req.json()) as {
    date: string;
    startMin: number;
    barberId: string | null;
  };
  if (!date || typeof startMin !== "number") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  if (booking.status !== "RESERVADO") {
    return NextResponse.json({ error: "Solo se pueden reprogramar reservas activas" }, { status: 409 });
  }

  // Liberar el slot actual de esta reserva para no chocar consigo misma:
  // se busca disponibilidad excluyendo la propia reserva (temporal CANCELADO)
  await prisma.booking.update({ where: { token }, data: { status: "CANCELADO" } });
  try {
    const assigned = await pickBarberForSlot(booking.branchId, booking.serviceId, date, startMin, barberId ?? null);
    if (!assigned) {
      await prisma.booking.update({ where: { token }, data: { status: "RESERVADO" } });
      return NextResponse.json({ error: "Ese horario no está disponible" }, { status: 409 });
    }
    const updated = await prisma.booking.update({
      where: { token },
      data: { date, startMin, endMin: startMin + (booking.endMin - booking.startMin), barberId: assigned, status: "RESERVADO" },
      include: { service: true, barber: true, branch: true },
    });
    return NextResponse.json({ booking: updated });
  } catch (e) {
    await prisma.booking.update({ where: { token }, data: { status: "RESERVADO" } });
    throw e;
  }
}
