import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProAgenda — Agenda tu hora",
  description: "Reserva tu cita en segundos. Elige servicio, profesional y horario disponible en tiempo real."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
