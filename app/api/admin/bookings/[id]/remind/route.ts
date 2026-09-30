import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, ownedBranchIds } from "@/lib/auth";
import { sendReminderForBooking, twilioEnabled } from "@/lib/reminders";

/** Envío manual de recordatorio/confirmación desde la agenda del admin. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const account = await getSession();
  if (!account || account.role !== "SHOP_OWNER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!twilioEnabled) {
    return NextResponse.json({ error: "WhatsApp no configurado en el servidor" }, { status: 501 });
  }

  const { id } = await params;
  const { type } = await req.json().catch(() => ({}));
  const kind = type === "CONFIRMACION" ? "CONFIRMACION" : "RECORDATORIO";

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  const owned = await ownedBranchIds(account);
  if (!owned.includes(booking.branchId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const result = await sendReminderForBooking(id, kind);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "No se pudo enviar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
