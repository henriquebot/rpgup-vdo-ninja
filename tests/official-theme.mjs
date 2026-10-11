import assert from "node:assert/strict";
import { themeCSS, encodeThemeCSS } from "../src/theme.js";

const { chromium } = await import("playwright");

// Probe the actual VDO renderer; only fake videos, never media permissions.
// Signalling is disabled. A change in upstream markup must block the release,
// rather than silently ship a theme that only works in our Foundry preview.
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 600 } });
  await context.routeWebSocket(/.*/, ws => ws.close());
  const page = await context.newPage();
  const theme = themeCSS({ theme: "scifi", slots: {} }, []);
  const target = new URL("https://vdo.ninja/");
  target.searchParams.set("room", "RPGUPVisualSmoke");
  target.searchParams.set("scene", "");
  target.searchParams.set("fakeguests", "2");
  target.searchParams.set("videodevice", "0");
  target.searchParams.set("audiodevice", "0");
  target.searchParams.set("noaudio", "");
  target.searchParams.set("meterstyle", "2");
  target.searchParams.set("base64css", encodeThemeCSS(theme));
  assert.ok(target.href.length <= 6900, "Real VDO URL must not risk nginx 414");
  const response = await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 40000 });
  assert.equal(response?.status(), 200);
  await page.waitForFunction(() => globalThis.session?.fakeFeeds?.length === 2 &&
    session.fakeFeeds.every(video => video.videoWidth > 0), undefined, { timeout: 45000 });
  const result = await page.evaluate(() => ({
    version: session.version,
    meterStyle: session.meterStyle,
    tileCount: document.querySelectorAll(".tile").length,
    computed: Array.from(document.querySelectorAll(".tile")).map(node => ({
      outline: getComputedStyle(node).outlineStyle,
      shadow: getComputedStyle(node).boxShadow
    })),
    fakeFeedParents: session.fakeFeeds.map(video => {
      const nodes = [];
      for (let n = video, i = 0; n && i < 5; n = n.parentElement, i++) {
        nodes.push({ tag: n.tagName, id: n.id, cls: typeof n.className === "string" ? n.className : "", shadow: getComputedStyle(n).boxShadow });
      }
      return nodes;
    })
  }));
  console.log("Official VDO DOM probe:", JSON.stringify(result));
  assert.ok(result.tileCount >= 2, "Official renderer must have tile wrappers for the themed cameras");
  assert.ok(result.computed.some(tile => tile.shadow !== "none"), "Sci-fi glow must reach real VDO camera wrappers");
  assert.ok(result.computed.some(tile => tile.outline !== "none"), "Border CSS must reach actual video tiles");
  assert.equal(String(result.meterStyle), "2", "Native VDO speaker meter setting must be recognized");
  console.log("VDO live smoke OK:", JSON.stringify(result));
} finally { await browser.close(); }
