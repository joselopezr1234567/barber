import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getBarberSession } from "@/lib/auth";
import BarberAgendaView from "./BarberAgendaView";

export default async function BarberPage() {
  const session = await getBarberSession();
  if (!session) redirect("/barber-login");

  const barber = await prisma.barber.findUnique({
    where: { id: session.id },
    include: { branch: { select: { name: true } } },
  });

  return (
    <BarberAgendaView
      barberName={barber?.name ?? "Barbero"}
      branchName={barber?.branch?.name ?? ""}
    />
  );
}
