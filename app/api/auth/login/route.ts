import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, startSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email: string; password: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!account || !account.active || !verifyPassword(password, account.passwordHash)) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  await startSession(account.id);
  return NextResponse.json({
    ok: true,
    role: account.role,
    redirect: account.role === "PLATFORM_ADMIN" ? "/super" : "/admin",
  });
}
