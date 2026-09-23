import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const branches = await prisma.branch.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { barbers: { where: { active: true }, orderBy: { name: "asc" } } },
    });
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ branches, services });
}
