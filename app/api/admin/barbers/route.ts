import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds, hashPassword } from "@/lib/auth";
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
  const { name, branchId, email, password } = await req.json();
  if (!name || !branchId || !email || !password) {
    return NextResponse.json(
      { error: "Nombre, sucursal, correo y contraseña son obligatorios" },
      { status: 400 }
    );
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const dup = await prisma.barber.findUnique({ where: { email: emailNorm } });
  if (dup) {
    return NextResponse.json({ error: "Ya existe un barbero con ese correo" }, { status: 409 });
  }
  const owned = await ownedBranchIds(account);
  if (!owned.includes(branchId)) {
    return NextResponse.json({ error: "No tienes acceso a esta sucursal" }, { status: 403 });
  }
  const barber = await prisma.barber.create({
    data: {
      name: String(name).trim(),
      branchId,
      email: emailNorm,
      passwordHash: hashPassword(String(password)),
    },
  });
  return NextResponse.json({ barber });
}
