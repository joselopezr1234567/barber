import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/push/subscribe
 * Registra (o actualiza) la suscripción push del navegador.
 * Body: { subscription: { endpoint, keys: { p256dh, auth } }, token?: string }
 * `token` es el token de la reserva: así vinculamos el dispositivo al cliente.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sub = body?.subscription;
  const token: string | undefined = body?.token;

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  let clientId: string | null = null;
  if (token) {
    const booking = await prisma.booking.findUnique({
      where: { token },
      select: { clientId: true },
    });
    clientId = booking?.clientId ?? null;
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, clientId },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, clientId },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE: el usuario revocó las notificaciones (o se limpió el endpoint). */
export async function DELETE(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
