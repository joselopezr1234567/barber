// Ruta: app/api/public/branding/[branchId]/[file]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

/**
 * Sirve el logo / cover de una sucursal como imagen.
 *   GET /api/public/branding/<branchId>/logo  -> logo
 *   GET /api/public/branding/<branchId>/cover -> imagen de fondo
 * El binario vive en disco (public/branding/<branchId>/) y la ruta pública en la BD.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ branchId: string; file: string }> }
) {
  const { branchId, file } = await params;
  if (file !== "logo" && file !== "cover") {
    return new NextResponse("Not found", { status: 404 });
  }
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return new NextResponse("Not found", { status: 404 });
  const url = file === "logo" ? branch.logoUrl : branch.coverUrl;
  if (!url) return new NextResponse("Not found", { status: 404 });

  // Binario servido desde la BD (sobrevive a deploys, la carpeta public/ se
  // congela con el build en producción).
  const data = file === "logo" ? branch.logoData : branch.coverData;
  const mime = (file === "logo" ? branch.logoMime : branch.coverMime) ?? "image/png";
  if (data) {
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=60", // corto: permite ver el cambio al re-subir
      },
    });
  }

  // Fallback: archivo en disco (solo funciona en dev o si el archivo
  // quedó incluido en el build).
  const path = await import("node:path");
  const { readFile } = await import("node:fs/promises");
  const full = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    const buf = await readFile(full);
    const ext = full.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=60", // corto: permite ver el cambio al re-subir
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

/**
 * Sube el logo o cover: POST /api/public/branding/<branchId>/logo (multipart/form-data, campo "file").
 * Solo el dueño de la barbería (SHOP_OWNER) o el admin de la plataforma.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; file: string }> }
) {
  const { branchId, file } = await params;
  if (file !== "logo" && file !== "cover") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const session = await getSession();
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  const isOwner = session?.role === "SHOP_OWNER" && branch.accountId === session.id;
  const isSuper = session?.role === "PLATFORM_ADMIN";
  if (!isOwner && !isSuper) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const f = form?.get("file");
  if (!(f instanceof File) || !f.size) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!ALLOWED.includes(f.type)) {
    return NextResponse.json({ error: "Formato no permitido (usa PNG, JPG o WebP)" }, { status: 400 });
  }
  if (f.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera 4 MB" }, { status: 400 });
  }

  const path = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
  const bytes = Buffer.from(await f.arrayBuffer());

  // Guardar en la BD (fuente de verdad en producción).
  const dataField = file === "logo" ? "logoData" : "coverData";
  const mimeField = file === "logo" ? "logoMime" : "coverMime";
  await prisma.branch.update({
    where: { id: branchId },
    data: { [dataField]: bytes, [mimeField]: f.type },
  });

  // Copia en disco para dev/local (opcional, no se usa en producción).
  const dir = path.join(process.cwd(), "public", "branding", branchId);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${file}.${ext}`), bytes);
  } catch {
    // En producción el FS puede ser read-only; no es un error.
  }

  const publicUrl = `/api/public/branding/${branchId}/${file}`;
  await prisma.branch.update({
    where: { id: branchId },
    data: file === "logo" ? { logoUrl: publicUrl } : { coverUrl: publicUrl },
  });
  return NextResponse.json({ ok: true, url: publicUrl });
}
