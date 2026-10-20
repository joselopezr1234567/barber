// Ruta: app/api/admin/branches/branding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/** Texto publicitario que aparece debajo del botón "Reservar cita". */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "SHOP_OWNER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { branchId, promoText, promoLinkUrl } = await req.json().catch(() => ({}));
  if (!branchId) return NextResponse.json({ error: "Falta branchId" }, { status: 400 });

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  if (session.role === "SHOP_OWNER" && branch.accountId !== session.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await prisma.branch.update({
    where: { id: branchId },
    data: {
      promoText: typeof promoText === "string" ? promoText.slice(0, 200) : null,
      promoLinkUrl: typeof promoLinkUrl === "string" && promoLinkUrl.trim()
        ? promoLinkUrl.trim().slice(0, 300)
        : null,
    },
  });
  return NextResponse.json({ ok: true });
}
