import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}

const prisma = new PrismaClient();

async function main() {
  // Solo crea el administrador de la plataforma (idempotente).
  // Negocios, sucursales, profesionales, servicios y reservas se crean
  // desde el panel /super — nada hardcodeado aquí.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@proagenda.cl";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  await prisma.account.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrador Plataforma",
      role: "PLATFORM_ADMIN",
      passwordHash: hashPassword(adminPass),
    },
  });

  console.log("Seed completado ✅ (solo admin de plataforma)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
