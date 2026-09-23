// E2E: login super admin → crear sucursal → crear cuenta barbería → login dueño → ver agenda
export default async function run(page, ui) {
  const out = { steps: [] };

  // 1. Login como admin de plataforma
  await page.goto("http://localhost:3000/login");
  await page.getByLabel(/email/i).or(page.locator('input[type="email"]')).first().fill("admin@barberia.cl");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/super", { timeout: 15000 });
  out.steps.push("login admin@barberia.cl -> OK, redirigió a /super");

  // 2. Crear sucursal nueva
  const stamp = Date.now();
  const branchName = `Barbería QA ${stamp}`;
  const r1 = await page.request.post("http://localhost:3000/api/super/branches", {
    data: { name: branchName, address: "Calle Falsa 123", phone: "+56900000" },
  });
  const b1 = await r1.json();
  out.steps.push(`crear sucursal -> ${r1.status()} id=${b1.branch?.id ?? b1.id ?? "?"}`);
  const branchId = b1.branch?.id ?? b1.id;

  // 3. Crear cuenta dueño para esa sucursal
  const ownerEmail = `qa${stamp}@barberia.cl`;
  const r2 = await page.request.post("http://localhost:3000/api/super/accounts", {
    data: { name: branchName, email: ownerEmail, password: "qa123456", role: "SHOP_OWNER", branchIds: [branchId] },
  });
  const a2 = await r2.json();
  out.steps.push(`crear cuenta dueño -> ${r2.status()} ${ownerEmail}`);
  if (!r2.ok()) { out.error = a2; return out; }

  // 4. Cerrar sesión y entrar como dueño de la barbería nueva
  await page.request.post("http://localhost:3000/api/auth/logout");
  await page.goto("http://localhost:3000/login");
  await page.locator('input[type="email"]').fill(ownerEmail);
  await page.locator('input[type="password"]').fill("qa123456");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/admin", { timeout: 15000 });
  out.steps.push(`login dueño ${ownerEmail} -> OK, redirigió a /admin`);

  // 5. Verificar que la agenda carga sin el error "barbers is undefined"
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  out.agendaHasError = body.includes("barbers is undefined") || body.includes("Application error");
  out.agendaShowsBranch = body.includes(branchName);
  out.steps.push(`agenda carga -> error=${out.agendaHasError} muestra sucursal=${out.agendaShowsBranch}`);

  // 6. Ver la sucursal de vuelta en /super
  const r3 = await page.request.get("http://localhost:3000/api/super/accounts");
  out.superAccountsStatus = r3.status();

  return out;
}
