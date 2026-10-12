import { prisma } from "../lib/db";
import { buildReminderMessage, toWhatsApp } from "../lib/reminders";

// Envía un WhatsApp de prueba con botones a un número dado (por defecto el del dueño)
const to = process.argv[2] ?? "+56945099183";

async function main() {
  const booking = await prisma.booking.findFirst({
    where: { status: "RESERVADO" },
    orderBy: { createdAt: "desc" },
  });
  if (!booking) {
    console.error("No hay reservas RESERVADO para probar. Crea una primero.");
    process.exit(1);
  }

  const body = buildReminderMessage("CONFIRMACION", {
    token: booking.token,
    clientName: "Cliente Prueba",
    serviceName: "Corte Tradicional",
    barberName: "Carlos Mendoza",
    branchName: "Barbería Central",
    date: booking.date,
    startMin: booking.startMin,
  });

  console.log("Enviando a:", toWhatsApp(to));
  console.log("Token usado:", booking.token);

  // Reutiliza la misma lógica de envío con botones quick-reply
  const { sendTestWhatsApp } = await import("../lib/reminders");
  const ok = await sendTestWhatsApp(toWhatsApp(to), body);
  console.log(ok ? "✅ Enviado (revisa tu WhatsApp)" : "❌ Falló el envío (ver logs)");
  await prisma.$disconnect();
}

main();
