import { NextResponse } from "next/server";

/** GET /api/push/config — entrega la clave pública VAPID al navegador. */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
