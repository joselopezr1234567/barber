import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

/** Verifica que el barbero pertenece a una sucursal de la cuenta */
async function barberOwned(accountId: string, barberId: string): Promise<boolean> {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return false;
  const owned = await ownedBranchIds({ id: accountId });
  return owned.includes(barber.branchId);
}

export async function GET(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date requerido" }, { status: 400 });
  // Solo bloqueos de barberos de las sucursales propias
  const owned = await ownedBranchIds(account);
  const ownedBarbers = await prisma.barber.findMany({ where: { branchId: { in: owned } }, select: { id: true } });
  const blocks = await prisma.block.findMany({
    where: { date, barberId: { in: ownedBarbers.map((b) => b.id) } },
    include: { barber: true },
  });
  return NextResponse.json({ blocks });
}

/** Bloqueo rápido de tiempo (almuerzo, imprevisto) */
export async function POST(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { barberId, date, startMin, endMin, reason } = await req.json();
  if (!barberId || !date || typeof startMin !== "number" || typeof endMin !== "number" || endMin <= startMin) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (!(await barberOwned(account.id, barberId))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const block = await prisma.block.create({
    data: { barberId, date, startMin, endMin, reason: reason || null },
  });
  return NextResponse.json({ block });
}

export async function DELETE(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const block = await prisma.block.findUnique({ where: { id } });
  if (!block) return NextResponse.json({ error: "Bloqueo no encontrado" }, { status: 404 });
  if (!(await barberOwned(account.id, block.barberId))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  await prisma.block.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
