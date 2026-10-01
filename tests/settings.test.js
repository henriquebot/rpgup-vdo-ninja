import test from "node:test";
import assert from "node:assert/strict";
import { worldConfig, saveWorld, userPrefs } from "../src/settings.js";

test("rascunhos não alteram o cache do mundo e saves precisam de confirmação e permissão GM", async () => {
  let current = { roomId: "Room123", slots: { gm1: "gm123", p1: "player123" } };
  globalThis.game = {
    user: { isGM: true },
    settings: { get: () => current, set: async (scope, key, next) => { current = structuredClone(next); } }
  };
  const draft = worldConfig();
  draft.slots.p1 = "changed";
  assert.equal(current.slots.p1, "player123");
  await saveWorld(draft);
  assert.equal(current.slots.p1, "changed");
  game.user.isGM = false;
  await assert.rejects(saveWorld({ slots: {} }), /GM/);
  assert.equal(current.slots.p1, "changed");
  game.user.isGM = true;
  game.settings.set = async () => {}; // Server does not confirm the requested update.
  await assert.rejects(saveWorld({ slots: {} }), /não confirmou/);
});

test("preferências antigas migram uma vez para flutuante e preservam as demais escolhas", () => {
  globalThis.game = { user: { getFlag: () => ({ dock: "right", preview: "mini", autoOpen: false }) } };
  assert.equal(userPrefs().dock, "floating");
  assert.equal(userPrefs().preview, "mini");
  assert.equal(userPrefs().autoOpen, false);
  game.user.getFlag = () => ({ schemaVersion: 2, dock: "left", camera: "OBS", zoom: 0.8 });
  assert.equal(userPrefs().dock, "left");
  assert.equal(userPrefs().zoom, 0.8);
});
