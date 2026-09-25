import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, startBarberSession } from "@/lib/auth";

/** Login exclusivo para barberos: solo obtienen su agenda. */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({
    where: { email: String(email).toLowerCase().trim() },
    include: { branch: { select: { id: true, name: true } } },
  });

  if (!barber || !barber.active || !barber.passwordHash) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const ok = await verifyPassword(password, barber.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  await startBarberSession(barber.id);
  return NextResponse.json({
    ok: true,
    redirect: "/barber",
    barber: { name: barber.name, branchName: barber.branch?.name ?? "" },
  });
}
