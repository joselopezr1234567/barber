import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Confirma asistencia desde el enlace de WhatsApp (público, por token). */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) return new NextResponse("Reserva no encontrada", { status: 404 });
  if (booking.status !== "RESERVADO") {
    return new NextResponse("Esta reserva ya no está activa", { status: 409 });
  }

  await prisma.booking.update({ where: { token }, data: { reminderStatus: "CONFIRMADO" } });
  // HTML mínimo para el navegador del celular
  return new NextResponse(
    `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
     <body style="font-family:sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
       <div style="text-align:center"><div style="font-size:48px">✅</div>
       <h1>¡Asistencia confirmada!</h1><p>Nos vemos en tu cita.</p></div>
     </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
