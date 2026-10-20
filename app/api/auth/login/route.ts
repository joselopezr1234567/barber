import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, startSession, startBarberSession } from "@/lib/auth";

/**
 * Login unificado: una sola pantalla para admin de plataforma, dueño del
 * local (SHOP_OWNER) y trabajadores (profesionales/barberos).
 * Detecta automáticamente el tipo de cuenta y redirige al panel correcto.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }
  const mail = String(email).trim().toLowerCase();

  // 1) Cuentas de administración (dueño del local + super admin)
  const account = await prisma.account.findUnique({ where: { email: mail } });
  if (account && account.active && verifyPassword(password, account.passwordHash)) {
    await startSession(account.id);
    return NextResponse.json({
      ok: true,
      role: account.role,
      redirect: account.role === "PLATFORM_ADMIN" ? "/super" : "/admin",
    });
  }

  // 2) Trabajadores (profesionales / barberos del local)
  const barber = await prisma.barber.findUnique({
    where: { email: mail },
    include: { branch: { select: { name: true } } },
  });
  if (barber && barber.active && barber.passwordHash && verifyPassword(password, barber.passwordHash)) {
    await startBarberSession(barber.id);
    return NextResponse.json({
      ok: true,
      redirect: "/barber",
      barber: { name: barber.name, branchName: barber.branch?.name ?? "" },
    });
  }

  return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
}
