// E2E: login super admin → abrir modal "Nueva barbería" → verificar que el campo
// Teléfono es visible y usable en pantalla (issue: no aparecía el input de teléfono).
export default async function run(page, ui) {
  const out = { steps: [] };

  // 1. Login como admin de plataforma
  await page.goto("http://localhost:3000/login");
  await page.locator('input[type="email"]').fill("admin@barberia.cl");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/super", { timeout: 15000 });
  out.steps.push("login admin@barberia.cl -> OK, redirigió a /super");

  // 2. Abrir el modal "Nueva barbería"
  await page.getByRole("button", { name: /nueva barbería/i }).click();
  await page.waitForTimeout(500);

  // 3. El campo Teléfono debe existir Y ser visible en pantalla
  const phoneInput = page.locator('input[placeholder="+56 9 1234 5678"]');
  out.phoneExists = (await phoneInput.count()) > 0;
  out.phoneVisible = out.phoneExists ? await phoneInput.isVisible() : false;
  out.steps.push(`campo teléfono -> existe=${out.phoneExists} visible=${out.phoneVisible}`);

  // 4. Intentar crear SIN teléfono → debe mostrar el error sin recargar
  await page.locator('input').filter({ hasNot: page.locator('[type="password"]') }).first().fill("Barbería QA Sin Teléfono");
  await page.getByRole("button", { name: /^crear barbería$/i }).click();
  await page.waitForTimeout(600);
  const modalText = await page.locator("body").innerText();
  out.showsPhoneError = modalText.includes("El teléfono es obligatorio");
  out.steps.push(`error sin teléfono visible=${out.showsPhoneError}`);

  // 5. Rellenar el teléfono y crear de verdad
  await phoneInput.fill("+56911112222");
  await page.getByRole("button", { name: /^crear barbería$/i }).click();
  await page.waitForTimeout(1500);
  const after = await page.locator("body").innerText();
  out.modalClosed = !(await page.getByRole("button", { name: /^crear barbería$/i }).isVisible().catch(() => false));
  out.createdListed = after.includes("Barbería QA Sin Teléfono");
  out.steps.push(`creación -> modal cerrado=${out.modalClosed} aparece en la tabla=${out.createdListed}`);

  return out;
}
