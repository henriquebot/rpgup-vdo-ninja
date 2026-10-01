import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Opt-in check of the currently served official VDO UI. No Foundry login, camera,
// microphone or peer session: WebSocket signalling is blocked in this context.
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : "playwright");
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/avatar.svg") {
    response.setHeader("Content-Type", "image/svg+xml");
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#285b8a"/><circle cx="128" cy="128" r="80" fill="#e9b35a"/></svg>');
  } else if (["/src/avatar.js", "/src/urls.js", "/src/config.js"].includes(path)) {
    response.setHeader("Content-Type", "text/javascript");
    response.end(await readFile(new URL(".." + path, import.meta.url)));
  } else {
    response.setHeader("Content-Type", "text/html");
    response.end('<script type="module">import { prepareAvatar } from "/src/avatar.js"; globalThis.prepared = await prepareAvatar({avatar:"/avatar.svg"}, {avatar:"foundry"});</script>');
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext();
  await context.routeWebSocket(/.*/, socket => socket.close());
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => globalThis.prepared);
  const avatar = await page.evaluate(() => prepared.value);
  const url = new URL("https://vdo.ninja/");
  url.searchParams.set("avatar", avatar);
  url.searchParams.set("director", "RPGUPUIProbe" + Date.now());
  url.searchParams.set("previewmode", "");
  url.searchParams.set("videodevice", "0");
  url.searchParams.set("audiodevice", "0");
  url.searchParams.set("noaudio", "");
  const vdo = await context.newPage();
  const response = await vdo.goto(url.href, { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  await vdo.waitForFunction(() => globalThis.session?.avatar?.ready && session.switchMode === true, undefined, { timeout: 45000 });
  const state = await vdo.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(session.avatar, 0, 0, 256, 256);
    return { version: session.version, image: session.avatar.src.startsWith("data:image/"), width: session.avatar.naturalWidth, pixel: Array.from(ctx.getImageData(128, 128, 1, 1).data), exportable: canvas.toDataURL().startsWith("data:image/png") };
  });
  assert.ok(state.image && state.width > 0 && state.exportable);
  assert.ok(Math.abs(state.pixel[0] - 233) < 12 && Math.abs(state.pixel[1] - 179) < 12 && Math.abs(state.pixel[2] - 90) < 12);
  await vdo.locator("#togglePreviewMode").click();
  await vdo.waitForFunction(() => session.switchMode === false);
  await vdo.locator("#togglePreviewMode").click();
  await vdo.waitForFunction(() => session.switchMode === true);
  console.log(JSON.stringify({ browser: browser.version(), url: "https://vdo.ninja/", ...state, directorPreview: "default and native toggle passed", signalling: "WebSockets blocked; no media test" }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
