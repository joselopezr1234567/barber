// E2E: crear barbería nueva + trabajador → verificar exclusividad de trabajadores
export default async function run(page, ui) {
  const out = { steps: [] };
  const stamp = Date.now();

  // 1. Login como admin de plataforma
  await page.goto("http://localhost:3000/login");
  await page.locator('input[type="email"]').fill("admin@barberia.cl");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/super", { timeout: 15000 });
  out.steps.push("login super -> OK");

  // 2. Crear sucursal nueva
  const branchName = `Barbería Exclusiva ${stamp}`;
  const r1 = await page.request.post("http://localhost:3000/api/super/branches", {
    data: { name: branchName, address: "Av Siempre Viva 742", phone: "+56911111" },
  });
  const b1 = await r1.json();
  const branchId = b1.branch?.id ?? b1.id;
  out.steps.push(`sucursal creada -> ${r1.status()} id=${branchId}`);

  // 3. Crear cuenta dueño SOLO para esa sucursal
  const ownerEmail = `excl${stamp}@barberia.cl`;
  const r2 = await page.request.post("http://localhost:3000/api/super/accounts", {
    data: { name: branchName, email: ownerEmail, password: "excl1234", role: "SHOP_OWNER", branchIds: [branchId] },
  });
  out.steps.push(`cuenta dueño -> ${r2.status()} ${ownerEmail}`);
  if (!r2.ok()) { out.error = await r2.json(); return out; }

  // 4. Entrar como dueño
  await page.request.post("http://localhost:3000/api/auth/logout");
  await page.goto("http://localhost:3000/login");
  await page.locator('input[type="email"]').fill(ownerEmail);
  await page.locator('input[type="password"]').fill("excl1234");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/admin", { timeout: 15000 });

  // 5. Crear un trabajador en esa barbería
  const r3 = await page.request.post("http://localhost:3000/api/admin/barbers", {
    data: { name: `Jose Lopez ${stamp}`, branchId },
  });
  out.steps.push(`crear trabajador -> ${r3.status()}`);

  // 6. Verificar lista de barberos: solo debe estar el creado, NO los de otras barberías
  const r4 = await page.request.get("http://localhost:3000/api/admin/barbers");
  const b4 = await r4.json();
  const names = (b4.barbers ?? []).map((b) => b.name);
  out.barberNames = names;
  out.onlyOwnBarbers = names.length === 1 && names[0].includes("Jose Lopez");
  out.noCarlosMendoza = !names.some((n) => n.includes("Carlos Mendoza"));
  out.steps.push(`barberos visibles -> ${JSON.stringify(names)}`);

  // 7. UI: ver la página de trabajadores en el navegador
  await page.goto("http://localhost:3000/admin/trabajadores");
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  out.uiShowsJose = body.includes("Jose Lopez");
  out.uiNoCarlos = !body.includes("Carlos Mendoza");

  // 8. UI: la agenda no debe error
  await page.goto("http://localhost:3000/admin");
  await page.waitForTimeout(2000);
  const agendaBody = await page.locator("body").innerText();
  out.agendaNoError = !agendaBody.includes("Application error");

  return out;
}
