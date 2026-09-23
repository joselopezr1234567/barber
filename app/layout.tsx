import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barbería Reservas — Agenda tu hora",
  description: "Reserva tu corte en segundos. Elige servicio, barbero y hora disponible en tiempo real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
