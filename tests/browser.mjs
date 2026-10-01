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
    const iface = await page.locator("#interface").boundingBox();
    if (dock === "left") assert.ok(iface.x >= geometry.x + geometry.width);
    if (dock === "right") assert.ok(iface.x + iface.width <= geometry.x);
    if (dock === "top") assert.ok(iface.y >= geometry.y + geometry.height);
    if (dock === "bottom") assert.ok(iface.y + iface.height <= geometry.y);
    if (dock === "floating") assert.equal(iface.width, 1440);
  }
  await page.evaluate(async () => { await fixture.menu("openDock"); await fixture.menu("openDock"); });
  assert.equal(await page.locator("iframe").count(), 1);
  assert.equal(navigations, initial, "Dock/rerender não deve navegar ou recriar o iframe");
  await page.getByRole("button", { name: "Diminuir zoom", exact: true }).click();
  await page.getByRole("button", { name: "Diminuir zoom", exact: true }).click();
  assert.equal(await page.locator("iframe").evaluate(node => node.style.transform), "scale(0.8)");
  assert.equal(navigations, initial, "Zoom não deve recarregar a sala");
  await page.locator("summary").click();
  await page.getByRole("textbox", { name: "Câmera padrão", exact: true }).fill("OBS Virtual Camera");
  await page.getByRole("combobox", { name: "Placeholder", exact: true }).selectOption("custom");
  await page.getByRole("textbox", { name: "URL do placeholder", exact: true }).fill("https://images.example/avatar.webp");
  await page.getByRole("combobox", { name: "Interface VDO", exact: true }).selectOption("mobile");
  await page.locator("summary").click();
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
  const appliedURL = await page.locator("iframe").getAttribute("src");
  assert.equal(new URL(appliedURL).searchParams.get("vdo"), "OBS Virtual Camera");
  assert.equal(new URL(appliedURL).searchParams.get("avatar"), "https://images.example/avatar.webp");
  assert.ok(new URL(appliedURL).searchParams.has("mobile"));
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
  assert.equal(await page.locator("iframe").evaluate(node => node.style.transform), "scale(0.8)");
  assert.equal(new URL(await page.locator("iframe").getAttribute("src")).searchParams.get("avatar"), "https://images.example/avatar.webp");
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

  // Connected clients receive world Setting changes. A player without an assigned
  // stream waits; the GM generates and saves, and the player opens automatically.
  await page.evaluate(() => fixture.setConfig({ ...fixture.config(), slots: { gm1: "slot_gm" } }));
  await guest.reload();
  await guest.waitForFunction(() => globalThis.fixtureReady);
  assert.equal(await guest.locator("iframe").count(), 0);
  assert.match(await guest.locator(".rpgup-status").innerText(), /GM ainda não associou/);
  await page.evaluate(() => fixture.menu("worldConfig"));
  await page.getByRole("button", { name: "Gerar e salvar slots faltantes", exact: true }).click();
  await page.waitForFunction(() => fixture.config().slots.p1 && fixture.config().slots.p2);
  const generated = await page.evaluate(() => fixture.config().slots);
  await guest.waitForFunction(() => document.querySelector("iframe"));
  assert.equal(new URL(await guest.locator("iframe").getAttribute("src")).searchParams.get("push"), generated.p1);
  await page.getByRole("button", { name: "Gerar e salvar slots faltantes", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => fixture.config().slots), generated);
  await page.getByRole("textbox", { name: "Stream ID de Jogador A", exact: true }).fill("player_custom");
  await page.evaluate(() => fixture.menu("worldConfig"));
  assert.equal(await page.getByRole("textbox", { name: "Stream ID de Jogador A", exact: true }).inputValue(), "player_custom", "Rerender/reabrir o mesmo menu conserva o rascunho");
  assert.equal(await page.locator(".rpgup-config-form").count(), 1);
  // Click the dock behind the config frame to reproduce apply while editing.
  await page.evaluate(() => Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Aplicar / reconectar").click());
  await page.waitForFunction(() => fixture.config().slots.p1 === "player_custom");
  await page.evaluate(() => fixture.closeConfig());
  await page.getByRole("button", { name: "Aplicar / reconectar", exact: true }).click();
  assert.equal((await page.evaluate(() => fixture.config().slots)).p2, generated.p2, "Reconnect nunca recria slots");
  await guest.getByRole("button", { name: "Aplicar / reconectar", exact: true }).click();
  await guest.waitForFunction(() => new URL(document.querySelector("iframe").src).searchParams.get("push") === "player_custom");
  await guest.reload();
  await guest.waitForFunction(() => globalThis.fixtureReady && document.querySelector("iframe"));
  assert.equal(new URL(await guest.locator("iframe").getAttribute("src")).searchParams.get("push"), "player_custom");
  console.log("Regressão: gerar/salvar sincroniza GM e jogador; rascunho sobrevive; reconectar/recarregar preserva IDs: OK.");

  await page.evaluate(() => fixture.menu("worldConfig"));
  await page.getByRole("textbox", { name: "Stream ID de Jogador B", exact: true }).fill("unsaved_b");
  await page.evaluate(() => fixture.setConfig({ ...fixture.config(), roomId: "OtherGMRoom" }));
  await page.getByRole("button", { name: "Salvar configuração", exact: true }).click();
  await page.waitForFunction(() => notices.some(notice => notice.value.includes("Outro GM")));
  assert.equal((await page.evaluate(() => fixture.config().slots)).p2, generated.p2);
  assert.equal(await page.getByRole("textbox", { name: "Stream ID de Jogador B", exact: true }).inputValue(), "unsaved_b");
  await page.evaluate(() => fixture.closeConfig());
  await page.evaluate(() => fixture.menu("worldConfig"));
  await page.getByRole("textbox", { name: "Stream ID de Jogador B", exact: true }).fill("");
  await page.evaluate(() => { fixture.failSave = true; });
  await page.getByRole("button", { name: "Gerar e salvar slots faltantes", exact: true }).click();
  await page.waitForFunction(() => notices.some(notice => notice.value.includes("gravação recusada")));
  assert.equal((await page.evaluate(() => fixture.config().slots)).p2, generated.p2);
  assert.match(await page.locator(".rpgup-config-form [role=status]").innerText(), /Não salvo/);
  await page.evaluate(() => { fixture.failSave = false; return fixture.closeConfig(); });
  console.log("Conflito entre GMs e gravação recusada: sem falso sucesso nem perda do rascunho: OK.");

  await page.evaluate(() => fixture.menu("worldConfig"));
  await page.getByRole("textbox", { name: "Stream ID de Jogador B", exact: true }).fill("membership_draft");
  await page.evaluate(() => {
    const user = { id: "replacement", name: "Jogador criado depois", isGM: false };
    game.users.push(user);
    Hooks.callAll("createUser", user);
  });
  await page.getByRole("textbox", { name: "Stream ID de Jogador criado depois", exact: true }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "Stream ID de Jogador B", exact: true }).inputValue(), "membership_draft");
  await page.getByRole("button", { name: "Gerar e salvar slots faltantes", exact: true }).click();
  await page.waitForFunction(() => fixture.config().slots.replacement && fixture.config().slots.p2 === "membership_draft");
  await page.evaluate(() => fixture.closeConfig());
  console.log("Usuário criado com painel aberto: lista atualizada, rascunho preservado e slot salvo: OK.");

  for (const viewport of [{ width: 900, height: 650 }, { width: 390, height: 640 }, { width: 360, height: 280 }]) {
    await page.setViewportSize(viewport);
    const host = await page.locator(".rpgup-frame-host").boundingBox();
    const frame = await page.locator("iframe").boundingBox();
    assert.ok(host.height > 50 && host.width > 0, "A sala continua visível em janela pequena");
    assert.ok(Math.abs(host.width - frame.width) <= 1 && Math.abs(host.height - frame.height) <= 1, "Zoom preenche o espaço disponível após resize");
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(guestErrors, []);
  await page.evaluate(async () => { await (await fixture.dock()).close(); });
  assert.equal(await page.locator("body").evaluate(node => node.classList.contains("rpgup-vdo-docked")), false);
  assert.equal(await page.locator("body").evaluate(node => node.style.getPropertyValue("--rpgup-vdo-left")), "");
  console.log("Zoom, preferências de câmera/avatar/modo, reserva da UI e resize pequeno: OK.");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
