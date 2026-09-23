import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
  const { name, address, phone, accountId } = await req.json();
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
        accountId: accountId || null,
      },
    });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (e) {
    console.error("Error creando sucursal:", e);
    return NextResponse.json({ error: "No se pudo crear la barbería" }, { status: 500 });
  }
}
