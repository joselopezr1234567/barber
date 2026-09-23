import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

/** Editar cuenta: nombre, activar/desactivar, reset de contraseña, sucursales asignadas */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { name, active, password, branchIds } = (await req.json()) as {
    name?: string; active?: boolean; password?: string; branchIds?: string[];
  };

  const target = await prisma.account.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  // Evitar que el admin se desactive a sí mismo
  if (target.id === account.id && active === false) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 });
  }
  if (password !== undefined && password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(active !== undefined && { active }),
      ...(password && { passwordHash: hashPassword(password) }),
      ...(branchIds !== undefined && { branches: { set: branchIds.map((bid) => ({ id: bid })) } }),
    },
  });

  const { passwordHash: _ph, ...safe } = updated;
  return NextResponse.json({ account: safe });
}
