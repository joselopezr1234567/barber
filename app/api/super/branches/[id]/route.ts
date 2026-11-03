import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * DELETE /api/super/branches/[id]
 * Elimina PERMANENTEMENTE una sucursal y todo su contenido:
 * reservas, servicios, barberos (con turnos y bloqueos), notas de clientes
 * asociadas a sus barberos y branding. Al desaparecer, la barbería también
 * desaparece de la pantalla principal de reservas (/ y /reservar).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const branch = await prisma.branch.findUnique({
    where: { id },
    include: { barbers: { select: { id: true } } },
  });
  if (!branch) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });

  const barberIds = branch.barbers.map((b) => b.id);

  // Orden de borrado por las claves foráneas sin cascada:
  await prisma.booking.deleteMany({ where: { branchId: id } });
  if (barberIds.length) {
    await prisma.clientNote.deleteMany({ where: { barberId: { in: barberIds } } });
  }
  await prisma.barber.deleteMany({ where: { branchId: id } }); // borra shifts y blocks en cascada
  await prisma.service.deleteMany({ where: { branchId: id } });
  await prisma.branch.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
