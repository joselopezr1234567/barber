import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

/** Ficha digital de cliente: historial (solo sucursales propias) + notas privadas */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const branchIds = await ownedBranchIds(account);

  // El cliente debe tener al menos una visita en las sucursales de la cuenta
  const client = await prisma.client.findFirst({
    where: { id, bookings: { some: { branchId: { in: branchIds } } } },
    include: {
      bookings: {
        where: { branchId: { in: branchIds } },
        include: { service: true, barber: true },
        orderBy: [{ date: "desc" }, { startMin: "desc" }],
      },
      notes: { include: { barber: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  return NextResponse.json({ client });
}

/** Agregar nota privada de un barbero */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const branchIds = await ownedBranchIds(account);

  const { id } = await params;
  const { barberId, text } = await req.json();
  if (!barberId || !text?.trim()) {
    return NextResponse.json({ error: "barbero y texto requeridos" }, { status: 400 });
  }
  // El barbero debe pertenecer a una sucursal propia y el cliente ser de la cartera
  const barber = await prisma.barber.findFirst({
    where: { id: barberId, branchId: { in: branchIds } },
  });
  if (!barber) return NextResponse.json({ error: "Barbero no válido" }, { status: 403 });
  const knownClient = await prisma.client.findFirst({
    where: { id, bookings: { some: { branchId: { in: branchIds } } } },
  });
  if (!knownClient) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const note = await prisma.clientNote.create({
    data: { clientId: id, barberId, text: text.trim() },
    include: { barber: true },
  });
  return NextResponse.json({ note });
}
