import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Cancelación pública con token */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  if (booking.status !== "RESERVADO") {
    return NextResponse.json({ error: "La reserva no puede cancelarse" }, { status: 409 });
  }
  await prisma.booking.update({ where: { token }, data: { status: "CANCELADO" } });
  return NextResponse.json({ ok: true });
}
