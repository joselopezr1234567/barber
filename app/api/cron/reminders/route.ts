import { NextRequest, NextResponse } from "next/server";
import { processReminders } from "@/lib/reminders";

/**
 * Procesa recordatorios pendientes.
 * Protegido por CRON_SECRET: se llama desde un cron externo cada 30-60 min:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://tu-app/api/cron/reminders
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const stats = await processReminders();
  return NextResponse.json({ ok: true, ...stats });
}
