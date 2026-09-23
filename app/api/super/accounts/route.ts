import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

/** Listar cuentas + sucursales disponibles para asignar */
export async function GET() {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      branches: { select: { id: true, name: true } },
    },
  });
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return NextResponse.json({
    accounts: accounts.map(({ passwordHash: _ph, ...a }) => a),
    branches,
  });
}

/** Crear cuenta de barbería (o de plataforma) */
export async function POST(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { email, name, password, role, branchIds } = (await req.json()) as {
    email: string; name: string; password: string; role?: string; branchIds?: string[];
  };

  if (!email?.includes("@") || !name?.trim() || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Email válido, nombre y contraseña de al menos 6 caracteres son obligatorios" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = await prisma.account.findUnique({ where: { email: normalizedEmail } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const created = await prisma.account.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: hashPassword(password),
      role: role === "PLATFORM_ADMIN" ? "PLATFORM_ADMIN" : "SHOP_OWNER",
      ...(role !== "PLATFORM_ADMIN" && branchIds && {
        branches: { connect: branchIds.map((id) => ({ id })) },
      }),
    },
  });

  const { passwordHash: _ph, ...safe } = created;
  return NextResponse.json({ account: safe });
}
