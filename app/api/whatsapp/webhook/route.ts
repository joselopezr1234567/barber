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

/**
 * Busca la reserva activa más reciente del teléfono que responde.
 * Puede haber clientes duplicados con el mismo número en formatos distintos
 * ("945099183", "+56945099183", ...), así que se evalúan TODOS los matcheos
 * y se devuelve la reserva activa más reciente entre todos.
 */
async function findActiveBooking(fromPhone: string) {
  const d = digits(fromPhone);
  const tail = d.slice(-9); // últimos 9 dígitos ej: 945099183
  const tail8 = d.slice(-8);
  const clients = await prisma.client.findMany({
    where: {
      phone: { not: "" },
      // Pre-filtro en BD (los teléfonos terminan en los mismos dígitos);
      // el matching difuso se hace en memoria abajo.
      OR: tail8.length >= 8
        ? [{ phone: { contains: tail8 } }, { phone: { contains: tail } }]
        : undefined,
    },
  });
  const matchedIds = clients
    .filter((c) => {
      const cp = digits(c.phone);
      return cp.endsWith(tail) || cp.endsWith(tail8) || tail.endsWith(cp.slice(-8));
    })
    .map((c) => c.id);
  if (!matchedIds.length) return null;
  const b = await prisma.booking.findFirst({
    where: { clientId: { in: matchedIds }, status: "RESERVADO" },
    orderBy: { createdAt: "desc" },
  });
  if (!b) return null;
  return prisma.booking.findUnique({
    where: { id: b.id },
    include: { client: true, service: true, barber: true, branch: true },
  });
}

async function reply(rawTo: string, body: string) {
  const twilio = (await import("twilio")).default;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  // Twilio a veces manda "From" con espacios ("whatsapp: 56945099183"):
  // se normaliza a whatsapp:+XXXXXXXX antes de responder.
  const digitsOnly = rawTo.replace(/\D/g, "");
  const to = `whatsapp:+${digitsOnly}`;
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

  // Normalización del comando: Twilio envía los botones como "✅ Confirmar",
  // "🔄 Reprogramar", "❌ Cancelar" y el usuario puede escribir variantes
  // ("confirmo", "quiero cancelar", "REPROGRAMAR"). Se busca la acción por
  // prefijo de palabra para que todo caiga en la acción correcta.
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes: "confirmacion" → "confirmacion"
    .replace(/[^a-z0-9 ]/g, " ");
  const cmd =
    /\b(confirmar|confirmo|confirmada|si|sip|ok)\b/.test(norm)
      ? "confirmar"
      : /\b(reprogramar|cambiar|mover|otra hora|reagendar)\b/.test(norm)
        ? "reprogramar"
        : /\b(cancelar|cancelo|anular)\b/.test(norm)
          ? "cancelar"
          : "";
  console.log(`[webhook] de=${from} botón=${buttonId} texto=${text} → cmd=${cmd || "menú"}`);

  const booking = await findActiveBooking(from);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (!booking) {
    await reply(from, "No encontramos una reserva activa a tu nombre. Si necesitas ayuda, escríbenos 🙏");
    return NextResponse.json({ ok: true });
  }

  if (cmd === "confirmar") {
    if (booking.reminderStatus === "CONFIRMADO") {
      await reply(from, "✅ Tu cita ya estaba confirmada. ¡Nos vemos! 💈");
      return NextResponse.json({ ok: true });
    }
    if (booking.status !== "RESERVADO") {
      await reply(from, "Esta reserva ya no está activa. Si necesitas una nueva cita, agéndala cuando quieras 💈");
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

  if (cmd === "cancelar") {
    if (booking.status !== "RESERVADO") {
      await reply(from, "Esta reserva ya no está activa 💈");
      return NextResponse.json({ ok: true });
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELADO", reminderStatus: "DESCARTADO" } });
    await reply(from, "¡Gracias por avisarnos! 🙏 Tu cita fue cancelada y el horario quedó libre. Vuelve cuando quieras 💈");
    return NextResponse.json({ ok: true });
  }

  if (cmd === "reprogramar") {
    if (booking.status !== "RESERVADO") {
      await reply(from, "Esta reserva ya no está activa. Agenda una nueva cuando quieras 💈");
      return NextResponse.json({ ok: true });
    }
    // Reserva activa: solo se puede reprogramar si sigue en estado RESERVADO.
    await reply(
      from,
      `🔄 Para reprogramar tu cita, entra aquí y elige nuevo día y hora:
${baseUrl}/reservar?reprogramar=${booking.token}`
    );
    return NextResponse.json({ ok: true });
  }

  // Texto libre: menú
  await reply(from, "¡Hola! Puedes usar los botones del mensaje anterior o escribir: *Confirmar*, *Reprogramar* o *Cancelar*.");
  return NextResponse.json({ ok: true });
}
