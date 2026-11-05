import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MONTHLY_PRICE = 10000; // CLP

function periodKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/**
 * Asegura que existan registros de pago desde el alta del negocio hasta el
 * mes actual. Los primeros `freeMonths` meses quedan marcados como "GRATIS"
 * (paid=true, note="Meses de cortesía") y no se cobran.
 * Idempotente: puede llamarse en cada lectura sin duplicar.
 */
async function ensurePayments(branchId: string): Promise<void> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return;

  const start = branch.freeMonthsStart ?? branch.createdAt;
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  const rows: {
    branchId: string; period: string; amount: number; paid: boolean; note: string | null;
  }[] = [];
  for (let i = 0; i <= monthsElapsed; i++) {
    const d = addMonths(start, i);
    const period = periodKey(d);
    const free = i < branch.freeMonths;
    rows.push({
      branchId,
      period,
      amount: free ? 0 : branch.monthlyPrice || MONTHLY_PRICE,
      paid: free,
      note: free ? "Meses de cortesía" : null,
    });
  }
  if (!rows.length) return;
  // SQLite no soporta skipDuplicates: filtramos los que ya existen.
  const existing = await prisma.payment.findMany({
    where: { branchId, period: { in: rows.map((r) => r.period) } },
    select: { period: true },
  });
  const have = new Set(existing.map((e) => e.period));
  const nuevos = rows.filter((r) => !have.has(r.period));
  if (nuevos.length) await prisma.payment.createMany({ data: nuevos });
}

/** GET /api/super/payments — resumen de pagos de todos los negocios. */
export async function GET() {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" }, include: { account: true } });
  const out = [];
  for (const b of branches) {
    await ensurePayments(b.id);
    const payments = await prisma.payment.findMany({
      where: { branchId: b.id },
      orderBy: { period: "desc" },
    });
    out.push({
      branch: {
        id: b.id,
        name: b.name,
        ownerEmail: b.account?.email ?? null,
        freeMonths: b.freeMonths,
        monthlyPrice: b.monthlyPrice,
        active: b.active,
        createdAt: b.createdAt,
      },
      payments,
      owed: payments.filter((p) => !p.paid).reduce((s, p) => s + p.amount, 0),
    });
  }
  return NextResponse.json({ branches: out });
}

/** POST /api/super/payments — crear registro manual de un mes. Body: { branchId, period } */
export async function POST(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { branchId, period } = await req.json().catch(() => ({}));
  if (!branchId || !/^\d{4}-\d{2}$/.test(period ?? "")) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const payment = await prisma.payment.upsert({
    where: { branchId_period: { branchId, period } },
    update: {},
    create: { branchId, period, amount: branch.monthlyPrice || MONTHLY_PRICE },
  });
  return NextResponse.json({ payment }, { status: 201 });
}

/** PATCH /api/super/payments — marcar pagado/no pagado. Body: { paymentId, paid, note? } */
export async function PATCH(req: NextRequest) {
  const account = await getSession();
  if (!account || account.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { paymentId, paid, note } = await req.json().catch(() => ({}));
  if (!paymentId || typeof paid !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { paid, paidAt: paid ? new Date() : null, note: note === undefined ? undefined : note },
  });
  return NextResponse.json({ payment });
}
