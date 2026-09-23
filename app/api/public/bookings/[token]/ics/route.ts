import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fromDateStr } from "@/lib/time";

function pad(n: number) { return String(n).padStart(2, "0"); }

/** Descarga .ics para añadir a Apple Calendar / Outlook */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { service: true, barber: true, branch: true },
  });
  if (!booking) return new NextResponse("Not found", { status: 404 });

  const d = fromDateStr(booking.date);
  const fmt = (min: number) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barberia Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${booking.token}@barberia-reservas`,
    `DTSTAMP:${fmt(booking.startMin)}`,
    `DTSTART:${fmt(booking.startMin)}`,
    `DTEND:${fmt(booking.endMin)}`,
    `SUMMARY:${booking.service.name} - ${booking.branch.name}`,
    `DESCRIPTION:Barbero: ${booking.barber?.name ?? "Por asignar"}`,
    `LOCATION:${booking.branch.address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reserva-${booking.token}.ics"`,
    },
  });
}
