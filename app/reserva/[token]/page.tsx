import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatPrice, minToLabel, prettyDate } from "@/lib/time";
import BookingActions from "./BookingActions";

export default async function ReservaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { service: true, barber: true, branch: true, client: true },
  });
  if (!booking) notFound();

  const cancelled = booking.status === "CANCELADO";
  const title = encodeURIComponent(`${booking.service.name} - ${booking.branch.name}`);
  const ymd = booking.date.replace(/-/g, "");
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${ymd}T${pad(Math.floor(booking.startMin / 60))}${pad(booking.startMin % 60)}00`;
  const end = `${ymd}T${pad(Math.floor(booking.endMin / 60))}${pad(booking.endMin % 60)}00`;
  const details = encodeURIComponent(`Barbero: ${booking.barber?.name ?? "Por asignar"}`);
  const location = encodeURIComponent(booking.branch.address);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-16 pt-10">
      <div className="animate-fade-up text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${cancelled ? "bg-red-950" : "bg-emerald-950"}`}>
          {cancelled ? "✕" : "✓"}
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {cancelled ? "Reserva cancelada" : "¡Reserva confirmada!"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {cancelled
            ? "Tu cita fue cancelada. Puedes agendar una nueva cuando quieras."
            : `Te esperamos, ${booking.client.name.split(" ")[0]}.`}
        </p>
      </div>

      {/* Resumen */}
      <div className="animate-fade-up mt-8 rounded-2xl border-zinc-800 bg-zinc-900 p-5 text-sm">
        <div className="flex justify-between"><span className="text-zinc-400">Servicio</span><span className="font-medium">{booking.service.name}</span></div>
        <div className="mt-2.5 flex justify-between"><span className="text-zinc-400">Barbero</span><span className="font-medium">{booking.barber?.name ?? "Cualquiera"}</span></div>
        <div className="mt-2.5 flex justify-between"><span className="text-zinc-400">Sucursal</span><span className="font-medium">{booking.branch.name}</span></div>
        <div className="mt-2.5 flex justify-between capitalize"><span className="text-zinc-400">Fecha</span><span className="font-medium">{prettyDate(booking.date)}</span></div>
        <div className="mt-2.5 flex justify-between">
          <span className="text-zinc-400">Hora</span>
          <span className="font-medium">{minToLabel(booking.startMin)} – {minToLabel(booking.endMin)}</span>
        </div>
        <div className="mt-2.5 flex justify-between border-t border-zinc-800 pt-2.5 font-semibold">
          <span>Precio</span><span className="text-gold-400">{formatPrice(booking.service.price)}</span>
        </div>
      </div>

      {!cancelled && (
        <BookingActions
          token={booking.token}
          gcalUrl={gcalUrl}
          icsUrl={`/api/public/bookings/${booking.token}/ics`}
        />
      )}

      <p className="mt-8 text-center text-xs text-zinc-500">
        {booking.branch.name} · {booking.branch.address} · {booking.branch.phone}
      </p>
    </main>
  );
}
