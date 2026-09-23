import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickBarberForSlot } from "@/lib/availability";

/** Crear reserva desde el flujo público */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branchId, serviceId, barberId, date, startMin, name, phone, email } = body as {
      branchId: string;
      serviceId: string;
      barberId: string | null; // null = cualquier barbero
      date: string;
      startMin: number;
      name: string;
      phone: string;
      email?: string;
    };

    if (!branchId || !serviceId || !date || typeof startMin !== "number" || !name || !phone) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const service = await prisma.service.findFirst({ where: { id: serviceId, active: true } });
    if (!service) return NextResponse.json({ error: "Servicio no disponible" }, { status: 400 });

    // Asignar barbero y validar disponibilidad en el último momento
    const assignedBarberId = await pickBarberForSlot(branchId, serviceId, date, startMin, barberId);
    if (!assignedBarberId) {
      return NextResponse.json({ error: "Ese horario acaba de ocuparse. Elige otro." }, { status: 409 });
    }

    // Cliente por teléfono (único) o creación
    const client = await prisma.client.upsert({
      where: { phone },
      update: { name, email: email ?? undefined },
      create: { name, phone, email: email || null },
    });

    const booking = await prisma.booking.create({
      data: {
        branchId,
        barberId: assignedBarberId,
        serviceId,
        clientId: client.id,
        date,
        startMin,
        endMin: startMin + service.durationMin,
        status: "RESERVADO",
      },
      include: { service: true, barber: true, branch: true },
    });

    return NextResponse.json({ token: booking.token, booking });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
  }
}
