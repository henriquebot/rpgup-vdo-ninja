import test from "node:test";
import assert from "node:assert/strict";
import { fillMissingSlots, validateWorld, parseExtraQuery, normalizePrefs, dockPosition } from "../src/config.js";
import { participantURL, soloURL, obsExport } from "../src/urls.js";

const users = [
  { id: "gm1", name: "Henrique", isGM: true },
  { id: "p1", name: "Ana & João + ç", isGM: false },
  { id: "p2", name: "Bia", isGM: false }
];
const world = {
  roomId: "RPGUPPrototype123", extraQuery: "password=Private123&roombitrate=500&width=1280&fps=30",
  audio: "discord", directorUserId: "", slots: { gm1: "slot_a81k2", p1: "slot_92md4", p2: "slot_c3" }
};

test("1 GM e 2 jogadores entram na mesma Room com labels e push do Foundry", () => {
  for (const user of users) {
    const url = new URL(participantURL(world, user, {}, users));
    assert.equal(url.origin, "https://vdo.ninja");
    assert.equal(url.searchParams.get("room"), world.roomId);
    assert.equal(url.searchParams.get("push"), world.slots[user.id]);
    assert.equal(url.searchParams.get("label"), user.name);
    for (const key of ["autostart", "cleanoutput", "view", "scene", "director"]) assert.equal(url.searchParams.has(key), false);
  }
});

test("reconexões preservam slots e ignoram overrides antigos de câmera/interface/preview", () => {
  const before = structuredClone(world);
  for (const preview of ["native", "mini", "pip"]) {
    const url = new URL(participantURL(world, users[1], { preview, camera: "OBS", interface: "mobile" }, users));
    assert.equal(url.searchParams.get("push"), world.slots.p1);
    for (const key of ["pipme", "minipreview", "vdo", "mobile", "notmobile"]) assert.equal(url.searchParams.has(key), false);
    assert.equal(url.searchParams.has("view"), false);
    assert.equal(url.searchParams.has("autostart"), false);
  }
  assert.deepEqual(world, before);
});

test("gerar slots preserva usuários existentes, removidos e evita colisões", () => {
  let n = 0;
  const random = size => new Uint8Array(size).fill(++n);
  const original = { gm1: "slot_a81k2", removed: "slot_" + "01".repeat(10) };
  const filled = fillMissingSlots(original, users, random);
  assert.equal(filled.gm1, original.gm1);
  assert.equal(filled.removed, original.removed);
  assert.equal(new Set(Object.values(filled)).size, 4);
  assert.deepEqual(fillMissingSlots(filled, users, () => { throw new Error("não regenerar"); }), filled);
  assert.deepEqual(original, { gm1: "slot_a81k2", removed: "slot_" + "01".repeat(10) });
});

test("IDs inválidos, slots duplicados e Director jogador são rejeitados", () => {
  assert.throws(() => validateWorld({ ...world, roomId: "wrong room" }, users));
  assert.throws(() => validateWorld({ ...world, slots: { gm1: "a", p1: "a" } }, users), /duplicado/);
  assert.throws(() => validateWorld({ ...world, slots: { p1: "x&push=evil" } }, users));
  assert.throws(() => validateWorld({ ...world, directorUserId: "p1" }, users), /GM/);
  assert.throws(() => participantURL({ ...world, slots: {} }, users[1], {}, users), /GM/);
});

test("parâmetros extras não podem trocar identidade, papel, transporte ou UI", () => {
  for (const extraQuery of ["push=x", "id=x", "room=other", "r=other", "view=x", "director=x", "dir=x", "label=x", "whipout=x", "whep=x", "meshcast=x", "avatar=x", "autostart", "cleanoutput", "password=a#push=bad", "password=a&password=b", "Password=a", "roombitrate=0"]) {
    assert.throws(() => parseExtraQuery(extraQuery), extraQuery);
  }
  assert.equal(parseExtraQuery("password=Private123&fps=30").get("password"), "Private123");
});

test("áudio é isolado e configurável, VDO nativo não recebe overrides de áudio", () => {
  const muted = new URL(participantURL(world, users[0], {}, users));
  assert.equal(muted.searchParams.get("audiodevice"), "0");
  assert.equal(muted.searchParams.has("noaudio"), true);
  const native = new URL(participantURL({ ...world, audio: "vdo" }, users[0], {}, users));
  assert.equal(native.searchParams.has("audiodevice"), false);
  assert.equal(native.searchParams.has("noaudio"), false);
});

test("Director designado usa o mesmo stream; demais usuários seguem como guests", () => {
  const directorWorld = { ...world, directorUserId: "gm1" };
  const gm = new URL(participantURL(directorWorld, users[0], {}, users));
  assert.equal(gm.searchParams.get("director"), world.roomId);
  assert.equal(gm.searchParams.get("push"), world.slots.gm1);
  assert.equal(gm.searchParams.get("showdirector"), "1");
  assert.equal(gm.searchParams.has("previewmode"), true);
  const guest = new URL(participantURL(directorWorld, users[1], {}, users));
  assert.equal(guest.searchParams.has("director"), false);
  assert.equal(guest.searchParams.has("previewmode"), false);
});

test("OBS gera solo/view do slot certo, com Room/senha e sem publicar nem capturar", () => {
  for (const user of users) {
    const obs = new URL(soloURL(world, user.id, users));
    assert.equal(obs.searchParams.get("room"), world.roomId);
    assert.equal(obs.searchParams.get("view"), world.slots[user.id]);
    assert.equal(obs.searchParams.get("password"), "Private123");
    assert.equal(obs.searchParams.has("solo"), true);
    assert.equal(obs.searchParams.has("cleanoutput"), true);
    for (const key of ["push", "director", "width", "fps", "audiodevice", "pipme"]) assert.equal(obs.searchParams.has(key), false);
  }
});

test("preferências e geometria são normalizadas sem escapar da viewport", () => {
  assert.equal(normalizePrefs({ dock: "invalid", preview: "network", sideWidth: NaN }).dock, "floating");
  for (const dock of ["left", "right", "top", "bottom", "floating"]) {
    for (const [width, height] of [[1920, 1080], [360, 640], [250, 200]]) {
      const pos = dockPosition({ dock, floating: { width: 2400, height: 1800, left: 9999, top: 9999 } }, { width, height });
      assert.ok(pos.width > 0 && pos.height > 0);
      assert.ok(pos.left >= 0 && pos.top >= 0);
      assert.ok(pos.left + pos.width <= width);
      assert.ok(pos.top + pos.height <= height);
    }
  }
});

test("avatar Foundry/customizado é validado e a miniatura preparada usa o parâmetro oficial", () => {
  const gm = { ...users[0], avatar: "users/henrique.webp" };
  const defaultURL = new URL(participantURL(world, gm, {}, users, "https://foundry.example/game"));
  assert.equal(defaultURL.searchParams.get("avatar"), "https://foundry.example/users/henrique.webp");
  const custom = new URL(participantURL(world, gm, {
    camera: "OBS Virtual Camera", interface: "mobile", avatar: "custom", avatarURL: "https://images.example/a.webp?x=1&y=2"
  }, users));
  assert.equal(custom.searchParams.get("avatar"), "https://images.example/a.webp?x=1&y=2");
  assert.equal(custom.searchParams.has("mobile"), false);
  assert.equal(custom.searchParams.has("notmobile"), false);
  const desktop = new URL(participantURL(world, gm, { interface: "desktop", avatar: "none" }, users));
  assert.equal(desktop.searchParams.has("notmobile"), false);
  assert.equal(desktop.searchParams.has("avatar"), false);
  assert.equal(custom.searchParams.get("push"), world.slots.gm1);
  const prepared = new URL(participantURL(world, gm, {}, users, "https://foundry.example/game", "data:image/webp;base64,AA=="));
  assert.equal(prepared.searchParams.get("avatar"), "data:image/webp;base64,AA==");
  const obs = new URL(soloURL(world, gm.id, users));
  for (const key of ["avatar", "vdo", "mobile", "notmobile", "previewmode"]) assert.equal(obs.searchParams.has(key), false);
  for (const image of ["javascript:alert(1)", "blob:https://foundry.example/id", "https://user:password@example.com/a.webp", "http://example.com/a.webp"]) {
    assert.throws(() => participantURL(world, gm, { avatar: "custom", avatarURL: image }, users, "https://foundry.example/game"), /Placeholder/);
  }
});

test("presets mantêm captura adaptativa, parâmetros avançados prevalecem e OBS não herda limites da mesa", () => {
  const config = { ...world, quality: "economy", extraQuery: "password=Private123&roombitrate=450" };
  const url = new URL(participantURL(config, users[1], {}, users));
  assert.equal(url.searchParams.get("roombitrate"), "450");
  assert.equal(url.searchParams.get("maxframerate"), "20");
  assert.equal(url.searchParams.has("fps"), false);
  const obs = new URL(soloURL(config, users[1].id, users));
  for (const name of ["roombitrate", "maxframerate", "width", "height"]) assert.equal(obs.searchParams.has(name), false);
  assert.equal(obs.searchParams.get("password"), "Private123");
  assert.equal(validateWorld(world, users).quality, "native", "Configuração antiga mantém os padrões e os parâmetros existentes");
  assert.throws(() => validateWorld({ ...world, quality: "unknown" }, users), /Preset/);
});

test("avatar definido pelo GM usa o parâmetro nativo; preferência pessoal pode escolher outra imagem", () => {
  const config = { ...world, avatars: { p1: "users/mesa.webp" } };
  const url = new URL(participantURL(config, users[1], {}, users, "https://foundry.example/game"));
  assert.equal(url.searchParams.get("avatar"), "https://foundry.example/users/mesa.webp");
  const custom = new URL(participantURL(config, users[1], { avatar: "custom", avatarURL: "https://images.example/personal.webp" }, users));
  assert.equal(custom.searchParams.get("avatar"), "https://images.example/personal.webp");
  const none = new URL(participantURL(config, users[1], { avatar: "none" }, users));
  assert.equal(none.searchParams.has("avatar"), false);
  for (const image of ["javascript:alert(1)", "data:image/svg+xml,test", "https://user:secret@example.com/a.webp"]) {
    assert.throws(() => validateWorld({ ...world, avatars: { p1: image } }, users), /Avatar/);
  }
});

test("seis participantes conservam IDs e exportam somente usuários associados, com nome e link solo", () => {
  const group = [...users, ...[3, 4, 5].map(n => ({ id: `p${n}`, name: `Jogador ${n}`, isGM: false }))];
  const config = { ...world, slots: fillMissingSlots(world.slots, group) };
  assert.equal(Object.keys(config.slots).length, 6);
  assert.equal(config.slots.p1, world.slots.p1);
  const data = obsExport(config, group);
  assert.equal(data.sources.length, 6);
  for (const source of data.sources) {
    assert.equal(new URL(source.url).searchParams.get("view"), config.slots[source.userId]);
    assert.equal(source.streamId, config.slots[source.userId]);
    assert.ok(source.name);
  }
  assert.equal(obsExport(config, [...group, { id: "no_slot", name: "Sem slot" }]).sources.length, 6);
  assert.deepEqual(config.slots, fillMissingSlots(config.slots, group));
});
