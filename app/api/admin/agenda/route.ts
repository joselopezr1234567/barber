import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

/** Agenda del día: columnas por barbero con sus citas (solo sucursales propias) */
export async function GET(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const branchId = sp.get("branchId");
  if (!date || !branchId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const owned = await ownedBranchIds(account);
  if (!owned.includes(branchId)) {
    return NextResponse.json({ error: "Sucursal no autorizada" }, { status: 403 });
  }

  const barbers = await prisma.barber.findMany({
    where: { branchId, active: true },
    orderBy: { name: "asc" },
  });

  const bookings = await prisma.booking.findMany({
    where: { date, branchId },
    include: { service: true, client: true },
    orderBy: { startMin: "asc" },
  });

  const blocks = await prisma.block.findMany({
    where: { date, barberId: { in: barbers.map((b) => b.id) } },
  });

  const weekday = new Date(date + "T12:00:00").getDay();
  const shifts = await prisma.shift.findMany({
    where: { weekday, barberId: { in: barbers.map((b) => b.id) } },
  });

  return NextResponse.json({ barbers, bookings, blocks, shifts });
}
