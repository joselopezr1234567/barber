import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

export async function GET() {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const owned = await ownedBranchIds(account);
  const barbers = await prisma.barber.findMany({
    where: { branchId: { in: owned } },
    include: { branch: { select: { name: true } } },
    orderBy: [{ branchId: "asc" }, { name: "asc" }],
  });
  const branches = await prisma.branch.findMany({
    where: { id: { in: owned } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ barbers, branches });
}

export async function POST(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { name, branchId } = await req.json();
  if (!name || !branchId) {
    return NextResponse.json({ error: "Nombre y sucursal son obligatorios" }, { status: 400 });
  }
  const owned = await ownedBranchIds(account);
  if (!owned.includes(branchId)) {
    return NextResponse.json({ error: "No tienes acceso a esta sucursal" }, { status: 403 });
  }
  const barber = await prisma.barber.create({
    data: { name: String(name).trim(), branchId },
  });
  return NextResponse.json({ barber });
}
