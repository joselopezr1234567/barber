import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatPrice, minToLabel, prettyDate } from "@/lib/time";

/** Confirma asistencia desde el enlace de WhatsApp (público, por token). */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { service: true, barber: true, branch: true },
  });
  if (!booking) return new NextResponse("Reserva no encontrada", { status: 404 });
  if (booking.status !== "RESERVADO") {
    return new NextResponse("Esta reserva ya no está activa", { status: 409 });
  }

  await prisma.booking.update({ where: { token }, data: { reminderStatus: "CONFIRMADO" } });
  // HTML mínimo para el navegador del celular
  return new NextResponse(
    `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
     <body style="font-family:sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
       <div style="text-align:center;max-width:420px;padding:24px">
         <div style="font-size:48px">✅</div>
         <h1 style="margin:8px 0 4px">¡Gracias por confirmar!</h1>
         <p style="color:#a1a1aa;margin:0 0 20px">Nos vemos en tu cita 💈</p>
         <div style="text-align:left;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:20px;font-size:14px;line-height:2">
           <div style="display:flex;justify-content:space-between"><span style="color:#a1a1aa">Servicio</span><strong>${booking.service.name}</strong></div>
           <div style="display:flex;justify-content:space-between"><span style="color:#a1a1aa">Profesional</span><strong>${booking.barber?.name ?? "Por asignar"}</strong></div>
           <div style="display:flex;justify-content:space-between"><span style="color:#a1a1aa">Sucursal</span><strong>${booking.branch.name}</strong></div>
           <div style="display:flex;justify-content:space-between"><span style="color:#a1a1aa">Fecha</span><strong>${prettyDate(booking.date)}</strong></div>
           <div style="display:flex;justify-content:space-between"><span style="color:#a1a1aa">Hora</span><strong>${minToLabel(booking.startMin)} – ${minToLabel(booking.endMin)}</strong></div>
           <div style="display:flex;justify-content:space-between;border-top:1px solid #27272a;padding-top:8px"><span>Precio</span><strong style="color:#d4b483">${formatPrice(booking.service.price)}</strong></div>
         </div>
       </div>
     </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
