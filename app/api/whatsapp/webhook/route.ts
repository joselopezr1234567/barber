import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { minToLabel, prettyDate } from "@/lib/time";

/**
 * Webhook de Twilio WhatsApp: recibe las respuestas de los botones Quick Reply
 * (o mensajes de texto) y ejecuta la acción sobre la reserva más reciente
 * activa del número que responde.
 *
 * Configurar en Twilio Console (WhatsApp sandbox o número):
 *   WHEN A MESSAGE COMES IN -> https://TU-DOMINIO/api/whatsapp/webhook  (POST)
 */

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Busca la reserva activa más reciente del teléfono que responde. */
async function findActiveBooking(fromPhone: string) {
  const d = digits(fromPhone);
  const tail = d.slice(-9); // últimos 9 dígitos ej: 945099183
  const tail8 = d.slice(-8);
  const clients = await prisma.client.findMany({
    where: { phone: { not: "" } },
  });
  const match = clients.find((c) => {
    const cp = digits(c.phone);
    return cp.endsWith(tail) || cp.endsWith(tail8) || tail.endsWith(cp.slice(-8));
  });
  if (!match) return null;
  const b = await prisma.booking.findFirst({
    where: { clientId: match.id, status: "RESERVADO" },
    orderBy: { createdAt: "desc" },
  });
  if (!b) return null;
  return prisma.booking.findUnique({
    where: { id: b.id },
    include: { client: true, service: true, barber: true, branch: true },
  });
}

async function reply(to: string, body: string) {
  const twilio = (await import("twilio")).default;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const client = twilio(sid, token);
  try {
    await client.messages.create({ from, to, body });
  } catch (e) {
    console.error("[webhook] error respondiendo:", e);
  }
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const from = String(form.get("From") ?? "");
  const buttonId = String(form.get("ButtonPayload") ?? form.get("ButtonText") ?? "");
  const text = String(form.get("Body") ?? buttonId ?? "").trim();
  if (!from) return NextResponse.json({ ok: true });

  const cmd = (buttonId || text).toLowerCase();
  console.log(`[webhook] de=${from} botón=${buttonId} texto=${text}`);

  const booking = await findActiveBooking(from);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (!booking) {
    await reply(from, "No encontramos una reserva activa a tu nombre. Si necesitas ayuda, escríbenos 🙏");
    return NextResponse.json({ ok: true });
  }

  if (cmd.includes("confirmar")) {
    if (booking.reminderStatus === "CONFIRMADO") {
      await reply(from, "✅ Tu cita ya estaba confirmada. ¡Nos vemos! 💈");
      return NextResponse.json({ ok: true });
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { reminderStatus: "CONFIRMADO" } });
    const cuando = `${prettyDate(booking.date)} a las ${minToLabel(booking.startMin)}`;
    await reply(
      from,
      `✅ ¡Gracias por confirmar, ${booking.client.name.split(" ")[0]}!

Tu cita quedó confirmada:
💈 ${booking.branch.name}
✂️ ${booking.service.name}
👨‍🔧 ${booking.barber?.name ?? "Por asignar"}
📅 ${cuando}

¡Te esperamos! 💈`
    );
    return NextResponse.json({ ok: true });
  }

  if (cmd.includes("cancelar")) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELADO" } });
    await reply(from, "¡Gracias por avisarnos! 🙏 Tu cita fue cancelada y el horario quedó libre. Vuelve cuando quieras 💈");
    return NextResponse.json({ ok: true });
  }

  if (cmd.includes("reprogramar")) {
    await reply(
      from,
      `🔄 Para reprogramar tu cita, entra aquí y elige nuevo día y hora:\n${baseUrl}/reservar?reprogramar=${booking.token}`
    );
    return NextResponse.json({ ok: true });
  }

  // Texto libre: menú
  await reply(from, "¡Hola! Puedes usar los botones del mensaje anterior o escribir: *Confirmar*, *Reprogramar* o *Cancelar*.");
  return NextResponse.json({ ok: true });
}
