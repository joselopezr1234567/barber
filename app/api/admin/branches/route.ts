import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Sucursales que la cuenta logueada puede administrar (con sus barberos). */
export async function GET() {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const branches = await prisma.branch.findMany({
    where: { accountId: account.id, active: true },
    orderBy: { name: "asc" },
    // Importante: NO incluir logoData/coverData (bytes de imágenes, hasta 4 MB
    // cada uno) — serializarlos a JSON reventaba la memoria del servidor.
    select: {
      id: true, name: true, address: true, phone: true, vertical: true,
      logoUrl: true, coverUrl: true, promoText: true, promoLinkUrl: true, active: true,
      barbers: { where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true, branchId: true } },
    },
  });
  return NextResponse.json({ branches });
}
