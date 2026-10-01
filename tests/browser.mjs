import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Optional development-only dependency; never ships with the Foundry module.
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : "playwright");
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const mime = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".css": "text/css" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) throw new Error("Path outside fixture");
    response.setHeader("Content-Type", mime[path.extname(file)] ?? "text/plain");
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let navigations = 0;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  console.log(`Chromium ${browser.version()}; ApplicationV2 fixture; VDO iframe interceptado, sem câmera/rede de mídia.`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route("https://vdo.ninja/**", route => {
    navigations++;
    return route.fulfill({ contentType: "text/html", body: "<title>VDO fixture</title><p>Iframe controlado, sem mídia</p>" });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/tests/harness.html");
  await page.waitForFunction(() => globalThis.fixtureReady && document.querySelector("iframe"));
  await page.locator(".rpgup-status").filter({ hasText: "Documento do iframe" }).waitFor();
  assert.equal(await page.locator("iframe").count(), 1);
  const initial = navigations;
  const initialURL = await page.locator("iframe").getAttribute("src");
  assert.equal(new URL(initialURL).searchParams.get("push"), "slot_gm");
  assert.equal((await page.locator("iframe").getAttribute("allow")).includes("microphone"), false);
  assert.equal(await page.locator("iframe").getAttribute("sandbox"), null);
  for (const dock of ["left", "right", "top", "bottom", "floating"]) {
    await page.getByRole("combobox", { name: "Posição do dock", exact: true }).selectOption(dock);
    const geometry = await page.locator("#rpgup-vdo-room").boundingBox();
    assert.ok(geometry.width >= 320 && geometry.height >= 240);
    assert.ok(geometry.x >= 0 && geometry.y >= 0 && geometry.x + geometry.width <= 1440 && geometry.y + geometry.height <= 900);
  }
  await page.evaluate(async () => { await fixture.menu("openDock"); await fixture.menu("openDock"); });
  assert.equal(await page.locator("iframe").count(), 1);
  assert.equal(navigations, initial, "Dock/rerender não deve navegar ou recriar o iframe");
  await page.getByRole("combobox", { name: "Self-preview", exact: true }).selectOption("pip");
  assert.equal(await page.locator("iframe").getAttribute("src"), initialURL);
  await page.getByRole("button", { name: "Aplicar / reconectar", exact: true }).click();
  await page.waitForFunction(() => new URL(document.querySelector("iframe").src).searchParams.has("pipme"));
  await page.locator(".rpgup-status").filter({ hasText: "Documento do iframe" }).waitFor();
  assert.equal(new URL(await page.locator("iframe").getAttribute("src")).searchParams.has("view"), false);
  await page.getByRole("button", { name: "World / OBS", exact: true }).click();
  await page.locator(".rpgup-config-form").waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Solo link OBS", exact: false }).count(), 3);
  await page.getByRole("combobox", { name: "audio", exact: true }).selectOption("vdo");
  await page.getByRole("combobox", { name: "directorUserId", exact: true }).selectOption("gm1");
  await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
  await page.waitForFunction(() => fixture.config().audio === "vdo");
  assert.equal(await page.locator("iframe").getAttribute("src"), initialURL + "&pipme=");
  await page.evaluate(() => fixture.closeConfig());
  await page.getByRole("button", { name: "Aplicar / reconectar", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("iframe").allow.includes("microphone"));
  const director = new URL(await page.locator("iframe").getAttribute("src"));
  assert.equal(director.searchParams.get("director"), "FixtureRoom123");
  assert.equal(director.searchParams.get("push"), "slot_gm");
  await page.evaluate(async () => { await (await fixture.dock()).close(); await fixture.menu("openDock"); });
  assert.equal(await page.locator("iframe").count(), 1);
  await page.reload();
  await page.waitForFunction(() => globalThis.fixtureReady && document.querySelector("iframe"));
  assert.equal(await page.getByRole("combobox", { name: "Self-preview", exact: true }).inputValue(), "pip");
  assert.equal(await page.getByRole("combobox", { name: "Posição do dock", exact: true }).inputValue(), "floating");
  assert.deepEqual(errors, []);
  console.log("GM: singleton, cinco posições, iframe preservado, rejoin, persistência e painel OBS: OK.");

  const guest = await context.newPage();
  const guestErrors = [];
  guest.on("pageerror", error => guestErrors.push(error.message));
  await guest.goto(base + "/tests/harness.html?user=p1");
  await guest.waitForFunction(() => globalThis.fixtureReady && document.querySelector("iframe"));
  assert.equal(await guest.getByRole("button", { name: "World / OBS", exact: true }).count(), 0);
  assert.equal(new URL(await guest.locator("iframe").getAttribute("src")).searchParams.get("push"), "slot_a");
  assert.equal(await guest.getByRole("combobox", { name: "Self-preview", exact: true }).inputValue(), "native");
  const denied = await guest.evaluate(async () => {
    try { await fixture.menu("worldConfig"); return false; } catch (error) { return error.message.includes("GM"); }
  });
  assert.equal(denied, true);
  assert.deepEqual(guestErrors, []);
  console.log("Jogador: slot automático, preferências separadas e configuração GM negada: OK.");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
