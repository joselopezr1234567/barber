import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatPrice, minToLabel, prettyDate } from "@/lib/time";
import ConfirmClientActions from "./ConfirmClientActions";

/** Página pública con los 3 botones: Confirmar / Reprogramar / Cancelar */
export default async function ConfirmClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { service: true, barber: true, branch: true, client: true },
  });
  if (!booking) notFound();

  const cancelled = booking.status === "CANCELADO";
  const confirmed = booking.reminderStatus === "CONFIRMADO";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-16 pt-10">
      <div className="animate-fade-up text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
          cancelled ? "bg-red-950" : confirmed ? "bg-emerald-950" : "bg-zinc-800"
        }`}>
          {cancelled ? "❌" : confirmed ? "✅" : "💈"}
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {cancelled ? "Reserva cancelada" : confirmed ? "¡Asistencia confirmada!" : "Tu cita está reservada"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {cancelled
            ? "Tu cita fue cancelada."
            : confirmed
              ? `Gracias, ${booking.client.name.split(" ")[0]}. Nos vemos pronto.`
              : `Hola ${booking.client.name.split(" ")[0]}, ¿todo listo para tu cita?`}
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
        <ConfirmClientActions
          token={booking.token}
          confirmed={confirmed}
        />
      )}

      <p className="mt-8 text-center text-xs text-zinc-500">
        {booking.branch.name} · {booking.branch.address} · {booking.branch.phone}
      </p>
    </main>
  );
}
