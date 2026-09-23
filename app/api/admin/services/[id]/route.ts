import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

/** Verifica que la cuenta pueda operar este servicio */
async function canManage(accountId: string, serviceId: string): Promise<boolean> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return false;
  if (service.branchId === null) return true; // servicio global
  const owned = await ownedBranchIds({ id: accountId });
  return owned.includes(service.branchId);
}

/** Editar o pausar/activar servicio */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canManage(account.id, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const data = await req.json();
  const { name, description, durationMin, price, active } = data as {
    name?: string; description?: string; durationMin?: number; price?: number; active?: boolean;
  };

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(durationMin !== undefined && { durationMin: Number(durationMin) }),
      ...(price !== undefined && { price: Number(price) }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json({ service });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!(await canManage(account.id, id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  // No borramos si tiene reservas: se pausa (soft-off) para conservar historial
  const count = await prisma.booking.count({ where: { serviceId: id } });
  if (count > 0) {
    await prisma.service.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, softDeleted: true });
  }
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
