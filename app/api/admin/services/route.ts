import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

export async function GET() {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const owned = await ownedBranchIds(account);
  const services = await prisma.service.findMany({
    where: { OR: [{ branchId: null }, { branchId: { in: owned } }] },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { name, description, durationMin, price } = await req.json();
  if (!name || !durationMin || !price) {
    return NextResponse.json({ error: "Nombre, duración y precio son obligatorios" }, { status: 400 });
  }
  const owned = await ownedBranchIds(account);
  if (owned.length === 0) {
    return NextResponse.json({ error: "Tu cuenta no tiene sucursales asignadas" }, { status: 400 });
  }
  const last = await prisma.service.findFirst({ orderBy: { sortOrder: "desc" } });
  const service = await prisma.service.create({
    data: {
      name,
      description: description || null,
      durationMin: Number(durationMin),
      price: Number(price),
      branchId: owned[0],
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ service });
}
