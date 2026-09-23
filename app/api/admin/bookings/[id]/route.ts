import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

const STATUSES = ["RESERVADO", "ATENDIDO", "CANCELADO", "NO_ASISTIO"];

/** Cambiar estado de la cita desde la agenda (solo sucursales propias) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const { status } = (await req.json()) as { status: string };
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  const owned = await ownedBranchIds(account);
  if (!owned.includes(booking.branchId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status },
    include: { service: true, client: true, barber: true },
  });
  return NextResponse.json({ booking });
}
