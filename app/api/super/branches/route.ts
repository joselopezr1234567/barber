import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { RUBRO_OPTIONS } from "@/lib/verticals";

/** Lista todas las sucursales (super admin). */
export async function GET() {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: { account: true },
  });
  return NextResponse.json({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      active: b.active,
      ownerName: b.account?.name ?? null,
      ownerEmail: b.account?.email ?? null,
    })),
  });
}

/** Crea una sucursal (super admin). */
export async function POST(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { name, address, phone, accountId, vertical, freeMonths, monthlyPrice } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!phone || !phone.trim()) {
    return NextResponse.json({ error: "El teléfono es obligatorio" }, { status: 400 });
  }
  if (accountId) {
    const owner = await prisma.account.findUnique({ where: { id: accountId } });
    if (!owner) {
      return NextResponse.json({ error: "Cuenta propietaria no encontrada" }, { status: 400 });
    }
  }
  try {
    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        address: address?.trim() || "",
        phone: phone.trim(),
        vertical: typeof vertical === "string" && vertical ? vertical : "BARBERIA",
        accountId: accountId || null,
        freeMonths: Number.isInteger(freeMonths) && freeMonths > 0 ? Math.min(freeMonths, 24) : 0,
        monthlyPrice: Number.isInteger(monthlyPrice) && monthlyPrice > 0 ? monthlyPrice : 10000,
      },
    });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (e) {
    console.error("Error creando sucursal:", e);
    return NextResponse.json({ error: "No se pudo crear el negocio" }, { status: 500 });
  }
}
