import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

async function requireOwnedBarber(accountId: string, barberId: string) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { error: "Barbero no encontrado", status: 404 as const };
  const owned = await ownedBranchIds({ id: accountId });
  if (!owned.includes(barber.branchId)) {
    return { error: "No tienes acceso a este barbero", status: 403 as const };
  }
  return { barber };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const res = await requireOwnedBarber(account.id, id);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  const { name, active } = await req.json();
  const barber = await prisma.barber.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(active !== undefined && { active: Boolean(active) }),
    },
  });
  return NextResponse.json({ barber });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const res = await requireOwnedBarber(account.id, id);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  try {
    await prisma.barber.delete({ where: { id } });
  } catch {
    // Barbero con reservas asociadas: desactivarlo en vez de borrarlo
    await prisma.barber.update({ where: { id }, data: { active: false } });
  }
  return NextResponse.json({ ok: true });
}
