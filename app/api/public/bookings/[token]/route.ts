import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { service: true, barber: true, branch: true, client: true },
  });
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  return NextResponse.json({ booking });
}
