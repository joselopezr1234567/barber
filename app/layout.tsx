import type { Metadata } from "next";
import "./globals.css";
import InstallPrompt from "./InstallPrompt";

export const metadata: Metadata = {
  title: "ProAgenda — Agenda tu hora",
  description: "Reserva tu cita en segundos. Elige servicio, profesional y horario disponible en tiempo real.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ProAgenda",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
