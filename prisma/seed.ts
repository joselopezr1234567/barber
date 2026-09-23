import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { toDateStr } from "../lib/time";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}

const prisma = new PrismaClient();

async function main() {
  // Cuentas de acceso (idempotente)
  const adminEmail = "admin@barberia.cl";
  const ownerEmail = "dueño@barberia.cl";
  await prisma.account.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrador Plataforma",
      role: "PLATFORM_ADMIN",
      passwordHash: hashPassword("admin123"),
    },
  });
  const owner = await prisma.account.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: "Barbería Central",
      role: "SHOP_OWNER",
      passwordHash: hashPassword("barberia123"),
    },
  });

  // Sucursales (idempotente)
  let central = await prisma.branch.findFirst({ where: { name: "Barbería Central" } });
  if (!central) {
    central = await prisma.branch.create({
      data: {
        name: "Barbería Central",
        address: "Av. Providencia 1234, Santiago",
        phone: "+56 9 1234 5678",
        accountId: owner.id,
      },
    });
  }
  let norte = await prisma.branch.findFirst({ where: { name: "Sucursal Norte" } });
  if (!norte) {
    norte = await prisma.branch.create({
      data: {
        name: "Sucursal Norte",
        address: "Calle Larga 567, Santiago",
        phone: "+56 9 8765 4321",
        accountId: owner.id,
      },
    });
  }
  if (!norte.accountId) {
    await prisma.branch.update({ where: { id: norte.id }, data: { accountId: owner.id } });
  }

  // Barberos
  let carlos = await prisma.barber.findFirst({ where: { name: "Carlos Mendoza" } });
  if (!carlos) carlos = await prisma.barber.create({ data: { name: "Carlos Mendoza", branchId: central.id } });
  let jorge = await prisma.barber.findFirst({ where: { name: "Jorge Ríos" } });
  if (!jorge) jorge = await prisma.barber.create({ data: { name: "Jorge Ríos", branchId: central.id } });
  let miguel = await prisma.barber.findFirst({ where: { name: "Miguel Torres" } });
  if (!miguel) miguel = await prisma.barber.create({ data: { name: "Miguel Torres", branchId: central.id } });
  const andres = await prisma.barber.findFirst({ where: { name: "Andrés Silva" } });
  if (!andres) await prisma.barber.create({ data: { name: "Andrés Silva", branchId: norte.id } });

  // Servicios (name no es único: puede repetirse por sucursal)
  const upsertService = async (data: Prisma.ServiceUncheckedCreateInput) => {
    const existing = await prisma.service.findFirst({ where: { name: data.name } });
    return existing ?? prisma.service.create({ data });
  };
  const corte = await upsertService({ name: "Corte Tradicional", description: "Corte a tijera o máquina, incluye lavado y peinado.", durationMin: 30, price: 12000, sortOrder: 1 });
  const combo = await upsertService({ name: "Combo Corte + Barba", description: "Corte completo más arreglo y perfilado de barba.", durationMin: 50, price: 18000, sortOrder: 2 });
  const afeitado = await upsertService({ name: "Afeitado Clásico", description: "Afeitado a navaja con toalla caliente.", durationMin: 30, price: 10000, sortOrder: 3 });
  await upsertService({ name: "Corte Niño", description: "Corte para menores de 12 años.", durationMin: 30, price: 9000, sortOrder: 4 });
  await upsertService({ name: "Tinte / Camuflaje de Canas", description: "Aplicación de color o camuflaje.", durationMin: 45, price: 15000, sortOrder: 5 });

  // Turnos: Lun–Sáb 10:00–13:30 y 14:30–20:00 (domingo libre) — solo si no existen
  const existingShifts = await prisma.shift.findFirst();
  if (!existingShifts) {
  const shiftData: { barberId: string; weekday: number; startMin: number; endMin: number }[] = [];
  for (const barber of [carlos, jorge, miguel]) {
    for (let wd = 1; wd <= 6; wd++) {
      shiftData.push(
        { barberId: barber.id, weekday: wd, startMin: 10 * 60, endMin: 13 * 60 + 30 },
        { barberId: barber.id, weekday: wd, startMin: 14 * 60 + 30, endMin: 20 * 60 }
      );
    }
  }
  await prisma.shift.createMany({ data: shiftData });
  }

  // Clientes
  const upsertClient = (data: { name: string; phone: string; email: string }) =>
    prisma.client.upsert({ where: { phone: data.phone }, update: {}, create: data });
  const pedro = await upsertClient({ name: "Pedro Soto", phone: "+56911111111", email: "pedro@example.com" });
  const lucas = await upsertClient({ name: "Lucas Fernández", phone: "+56922222222", email: "lucas@example.com" });
  const mateo = await upsertClient({ name: "Mateo Herrera", phone: "+56933333333", email: "mateo@example.com" });

  const today = toDateStr(new Date());

  await prisma.booking.create({ data: { branchId: central.id, barberId: carlos.id, serviceId: corte.id, clientId: pedro.id, date: today, startMin: 10 * 60, endMin: 10 * 60 + 30, status: "ATENDIDO" } });
  await prisma.booking.create({ data: { branchId: central.id, barberId: carlos.id, serviceId: combo.id, clientId: lucas.id, date: today, startMin: 11 * 60, endMin: 11 * 60 + 50, status: "RESERVADO" } });
  await prisma.booking.create({ data: { branchId: central.id, barberId: jorge.id, serviceId: afeitado.id, clientId: mateo.id, date: today, startMin: 15 * 60, endMin: 15 * 60 + 30, status: "RESERVADO" } });
  await prisma.booking.create({ data: { branchId: central.id, barberId: miguel.id, serviceId: corte.id, clientId: pedro.id, date: today, startMin: 16 * 60, endMin: 16 * 60 + 30, status: "NO_ASISTIO" } });

  // Nota privada de ejemplo
  await prisma.clientNote.create({
    data: { clientId: pedro.id, barberId: carlos.id, text: "Degradado medio, peineta #1.5 en lados, prefiere patillas en punta." },
  });

  // Bloqueo de ejemplo (imprevisto)
  await prisma.block.create({
    data: { barberId: jorge.id, date: today, startMin: 18 * 60, endMin: 19 * 60, reason: "Imprevisto personal" },
  });

  console.log("Seed completado ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
