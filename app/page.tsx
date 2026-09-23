import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <p className="text-4xl">💈</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          Barbería <span className="text-gold-400">Reservas</span>
        </h1>
        <p className="mt-3 max-w-md text-zinc-400">
          Agenda tu hora en segundos: servicio, barbero y horario disponible en tiempo real.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/reservar"
          className="rounded-xl bg-gold-500 px-6 py-3.5 text-center font-semibold text-zinc-950 transition hover:bg-gold-400"
        >
          Reservar una cita
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-zinc-700 px-6 py-3.5 text-center font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
        >
          Panel del barbero
        </Link>
      </div>
    </main>
  );
}
