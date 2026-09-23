// Runner mínimo para los scripts qa-*.mjs (exportan `run(page, ui)`).
// Uso: node qa-runner.mjs qa-phone-modal.mjs
import { chromium } from "playwright";
import { pathToFileURL } from "url";

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error("Uso: node qa-runner.mjs <script.mjs>");
  process.exit(1);
}

const mod = await import(pathToFileURL(scriptPath).href);
const browser = await chromium.launch();
const page = await browser.newPage();

const ui = { log: (...args) => console.log(...args) };

try {
  const run = typeof mod.default === "function" ? mod.default : mod.default.run;
  const result = await run(page, ui);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = 0;
} catch (err) {
  console.error("FALLO:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
