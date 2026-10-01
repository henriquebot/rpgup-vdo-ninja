import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import { participantURL } from "../src/urls.js";

// Opt-in upstream probe, not a real Foundry/media test. Native fakeguests only;
// no injected video tiles/CSS, capture permissions or peer signalling.
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const results = [];
const directory = new URL("../test-results/official-layout/", import.meta.url);
await mkdir(directory, { recursive: true });
try {
  const context = await browser.newContext();
  await context.routeWebSocket(/.*/, socket => socket.close());
  const page = await context.newPage();
  for (const viewport of [{ width: 360, height: 760 }, { width: 1200, height: 300 }]) {
    await page.setViewportSize(viewport);
    for (let count = 1; count <= 4; count++) {
      for (const flags of ["", "structure&cover", "cover", "structure&cover&rows=1,2,3,4"]) {
        const url = `https://vdo.ninja/?scene&room=RPGUPLayoutProbe&fakeguests=${count}&videodevice=0&audiodevice=0&noaudio&${flags}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        assert.equal(response.status(), 200);
        await page.waitForFunction(n => globalThis.session?.fakeFeeds?.length === n && session.fakeFeeds.every(v => v.videoWidth && v.getBoundingClientRect().height), count);
        const state = await page.evaluate(() => ({
          version: session.version, structure: session.structure, cover: session.cover, rows: session.rows,
          feeds: session.fakeFeeds.map(video => ({
            source: [video.videoWidth, video.videoHeight], fit: getComputedStyle(video).objectFit,
            video: video.getBoundingClientRect().toJSON(), holder: video.parentElement.getBoundingClientRect().toJSON(),
            area: video.parentElement.parentElement.getBoundingClientRect().toJSON()
          }))
        }));
        assert.equal(state.structure, flags.includes("structure"));
        assert.equal(state.cover, flags.includes("cover"));
        assert.ok(state.feeds.every(feed => feed.source[0] / feed.source[1] === 16 / 9));
        if (flags === "cover") assert.ok(state.feeds.every(feed => Math.abs(feed.holder.width - feed.area.width) < 2 && Math.abs(feed.holder.height - feed.area.height) < 2 && feed.fit === "cover"));
        results.push({ viewport, count, flags, ...state });
        if (count === 2 && viewport.width === 360 && !flags.includes("rows")) await page.screenshot({ path: fileURLToPath(new URL(`${flags.replaceAll("&", "-") || "native"}.png`, directory)) });
      }
    }
    console.log(`Renderizador oficial: 1–4 fakeguests, ${viewport.width}×${viewport.height}, padrão / structure&cover / cover / rows: OK.`);
  }
  const user = { id: "gm", name: "Layout Probe", isGM: true };
  const base = { roomId: "RPGUPLayoutProbe", slots: { gm: "layout_probe" }, audio: "discord", directorUserId: "" };
  // Diagnostic preview flags are applied ONLY in this upstream probe. They are
  // not added to the module's whitelist or generated participant URLs.
  for (const extraQuery of ["cover", "structure&cover"]) {
    for (const mode of ["room", "minipreview", "pipme", "director"]) {
      const url = new URL(participantURL({ ...base, extraQuery, directorUserId: mode === "director" ? "gm" : "" }, user, { avatar: "none" }, [user]));
      url.searchParams.set("videodevice", "0");
      if (["pipme", "minipreview"].includes(mode)) url.searchParams.set(mode, "");
      await page.goto(url.href, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => globalThis.session?.cover);
      const state = await page.evaluate(() => ({ structure: session.structure, cover: session.cover, mini: session.minipreview, pip: session.pip3, directorPreview: session.switchMode, selfPreviewFit: getComputedStyle(document.documentElement).getPropertyValue("--fit-style").trim() }));
      assert.equal(state.structure, extraQuery.includes("structure"));
      if (mode === "minipreview") assert.equal(state.mini, 1);
      if (mode === "pipme") assert.equal(state.pip, true);
      if (mode === "director") {
        assert.equal(state.directorPreview, true);
        await page.locator("#togglePreviewMode").click();
        await page.waitForFunction(() => session.switchMode === false);
        await page.locator("#togglePreviewMode").click();
        await page.waitForFunction(() => session.switchMode === true);
      }
      assert.equal(state.selfPreviewFit, "cover");
      results.push({ mode, flags: extraQuery, ...state });
    }
  }
  await writeFile(new URL("results.json", directory), JSON.stringify({ browser: browser.version(), signalling: "blocked", results }, null, 2));
  console.log("Room, parser minipreview/pipme e toggle Director: OK. PiP/preview com câmera real e Foundry continuam pendentes.");
} finally { await browser.close(); }
