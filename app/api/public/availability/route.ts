import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const serviceId = sp.get("serviceId");
  const date = sp.get("date");
  const barberId = sp.get("barberId") ?? "ANY";

  if (!branchId || !serviceId || !date) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const slots = await getAvailability(branchId, serviceId, date, barberId);
  return NextResponse.json({ slots });
}
