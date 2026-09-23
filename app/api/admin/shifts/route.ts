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
  const barberId = req.nextUrl.searchParams.get("barberId");
  if (!barberId) return NextResponse.json({ error: "barberId requerido" }, { status: 400 });
  if (!(await barberOwned(account.id, barberId))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const shifts = await prisma.shift.findMany({ where: { barberId }, orderBy: [{ weekday: "asc" }, { startMin: "asc" }] });
  return NextResponse.json({ shifts });
}

/** Guardar la configuración completa de turnos de un barbero */
export async function PUT(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { barberId, shifts } = (await req.json()) as {
    barberId: string;
    shifts: { weekday: number; startMin: number; endMin: number }[];
  };
  if (!barberId || !Array.isArray(shifts)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (!(await barberOwned(account.id, barberId))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  for (const s of shifts) {
    if (s.endMin <= s.startMin) {
      return NextResponse.json({ error: "Hay bloques donde la hora de término es menor o igual a la de inicio" }, { status: 400 });
    }
  }
  await prisma.$transaction([
    prisma.shift.deleteMany({ where: { barberId } }),
    prisma.shift.createMany({ data: shifts.map((s) => ({ ...s, barberId })) }),
  ]);
  const saved = await prisma.shift.findMany({ where: { barberId }, orderBy: [{ weekday: "asc" }, { startMin: "asc" }] });
  return NextResponse.json({ shifts: saved });
}
