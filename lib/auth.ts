import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SECRET = process.env.AUTH_SECRET || "dev-secret-cambiar";
const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type SessionAccount = {
  id: string;
  email: string;
  name: string;
  role: string; // PLATFORM_ADMIN | SHOP_OWNER
};

type Payload = { id: string; exp: number };

// ── Contraseñas (scrypt) ──
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, dk] = stored.split(":");
  if (!salt || !dk) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(dk, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

// ── Cookie de sesión firmada (HMAC-SHA256) ──
function hmac(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

function sign(payload: Payload): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${hmac(b64)}`;
}

function verify(token: string): Payload | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  try {
    const expected = Buffer.from(hmac(b64), "hex");
    const given = Buffer.from(sig, "hex");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as Payload;
    if (!payload?.id || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Crea la cookie de sesión (solo usable en Route Handlers / Server Actions). */
export async function startSession(accountId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign({ id: accountId, exp: Date.now() + MAX_AGE * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Lee y valida la sesión; devuelve la cuenta activa o null. */
export async function getSession(): Promise<SessionAccount | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  const account = await prisma.account.findUnique({ where: { id: payload.id } });
  if (!account || !account.active) return null;
  return { id: account.id, email: account.email, name: account.name, role: account.role };
}

/** Sucursales que puede administrar la cuenta. */
export async function ownedBranchIds(account: { id: string }): Promise<string[]> {
  const branches = await prisma.branch.findMany({
    where: { accountId: account.id },
    select: { id: true },
  });
  return branches.map((b) => b.id);
}
