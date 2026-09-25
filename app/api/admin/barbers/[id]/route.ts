import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds, hashPassword } from "@/lib/auth";

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
  const { name, active, email, password } = await req.json();
  const data: Record<string, unknown> = {
    ...(name !== undefined && { name: String(name).trim() }),
    ...(active !== undefined && { active: Boolean(active) }),
  };
  if (email !== undefined) {
    const emailNorm = String(email).trim().toLowerCase();
    const dup = await prisma.barber.findFirst({
      where: { email: emailNorm, NOT: { id } },
    });
    if (dup) return NextResponse.json({ error: "Ya existe un barbero con ese correo" }, { status: 409 });
    data.email = emailNorm;
  }
  if (password) {
    if (String(password).length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    data.passwordHash = hashPassword(String(password));
  }
  const barber = await prisma.barber.update({ where: { id }, data });
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
