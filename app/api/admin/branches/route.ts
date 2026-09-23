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
    include: { barbers: { where: { active: true }, orderBy: { name: "asc" } } },
  });
  return NextResponse.json({ branches });
}
