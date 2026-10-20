import Link from "next/link";
import HomePromos from "./HomePromos";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6 pb-20 text-center">
      <HomePromos />
      <div>
        <p className="text-4xl">📅</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          Pro<span className="text-gold-400">Agenda</span>
        </h1>
        <p className="mt-3 max-w-md text-zinc-400">
          Agenda tu cita en segundos: servicio, profesional y horario disponible en tiempo real.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/reservar"
          className="rounded-xl bg-gold-500 px-6 py-3.5 text-center font-semibold text-zinc-950 transition hover:bg-gold-400"
        >
          Reservar una cita
        </Link>
      </div>
    </main>
  );
}
