import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";

/** Búsqueda de clientes de las sucursales de la cuenta (con conteo de visitas) */
export async function GET(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const branchIds = await ownedBranchIds(account);

  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const clients = await prisma.client.findMany({
    where: {
      ...(search
        ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] }
        : {}),
      bookings: { some: { branchId: { in: branchIds } } },
    },
    include: { _count: { select: { bookings: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });
  return NextResponse.json({ clients });
}
