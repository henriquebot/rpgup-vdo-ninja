export const MODULE_ID = "rpgup-vdo-ninja";
export const VDO_BASE = "https://vdo.ninja/";
export const DOCKS = { left: "Esquerda", right: "Direita", top: "Topo", bottom: "Embaixo", floating: "Flutuante" };
export const PREVIEWS = { native: "Preview nativo", mini: "Mini preview", pip: "PiP da própria câmera" };
export const DEFAULT_WORLD = { roomId: "", extraQuery: "", audio: "discord", directorUserId: "", slots: {} };
export const DEFAULT_PREFS = {
  dock: "right", preview: "native", autoOpen: true,
  sideWidth: 440, barHeight: 360,
  floating: { width: 720, height: 600, left: 120, top: 80 }
};

// Deliberately small: extra parameters cannot change identity, transport, UI or role.
const EXTRA_PARAMS = new Set(["password", "roombitrate", "totalroombitrate", "videobitrate", "codec", "width", "height", "fps"]);
const NUMERIC_PARAMS = new Set(["roombitrate", "totalroombitrate", "videobitrate", "width", "height", "fps"]);

export function parseExtraQuery(input = "") {
  if (typeof input !== "string" || input.includes("#") || input.includes("?")) {
    throw new Error("Use parâmetros como password=Senha123&roombitrate=500, sem URL, ? ou #.");
  }
  const params = new URLSearchParams(input.trim().replace(/^&/, ""));
  const seen = new Set();
  for (const [key, value] of params) {
    if (!EXTRA_PARAMS.has(key) || seen.has(key)) throw new Error(`Parâmetro não permitido ou repetido: ${key}.`);
    seen.add(key);
    if (key === "password" && !/^[A-Za-z0-9]{1,49}$/.test(value)) throw new Error("Senha VDO: use 1–49 letras ou números.");
    if (NUMERIC_PARAMS.has(key) && !/^[1-9]\d{0,5}$/.test(value)) throw new Error(`${key} precisa ser um inteiro positivo (até 6 dígitos).`);
    if (key === "codec" && !["h264", "vp8", "vp9", "av1"].includes(value.toLowerCase())) throw new Error("Codec permitido: h264, vp8, vp9 ou av1.");
  }
  return params;
}

export function validateWorld(input, users = []) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Configuração do World inválida.");
  const roomId = String(input.roomId ?? "").trim();
  if (!/^[A-Za-z0-9]{1,49}$/.test(roomId)) throw new Error("Room ID: use 1–49 letras ou números, respeitando maiúsculas.");
  parseExtraQuery(input.extraQuery);
  if (!["discord", "vdo"].includes(input.audio)) throw new Error("Modo de áudio inválido.");
  const directorUserId = String(input.directorUserId ?? "");
  if (directorUserId && !users.some(user => user.id === directorUserId && user.isGM)) throw new Error("O Director precisa ser um GM deste World.");
  if (!input.slots || typeof input.slots !== "object" || Array.isArray(input.slots)) throw new Error("Associação de slots inválida.");
  const slots = {};
  const used = new Set();
  for (const [userId, streamId] of Object.entries(input.slots)) {
    if (["__proto__", "constructor", "prototype"].includes(userId)) throw new Error("userId inválido.");
    if (typeof streamId !== "string" || !/^[A-Za-z0-9_]{1,64}$/.test(streamId)) throw new Error(`Stream ID inválido para ${userId}: use 1–64 letras, números ou _ .`);
    if (used.has(streamId)) throw new Error(`Stream ID duplicado: ${streamId}.`);
    used.add(streamId);
    slots[userId] = streamId;
  }
  return { roomId, extraQuery: input.extraQuery.trim(), audio: input.audio, directorUserId, slots };
}

export function fillMissingSlots(slots, users, randomBytes = size => crypto.getRandomValues(new Uint8Array(size))) {
  const result = { ...slots };
  const used = new Set(Object.values(result));
  for (const user of users) {
    if (Object.hasOwn(result, user.id) && result[user.id]) continue;
    let id;
    let attempts = 0;
    do {
      if (++attempts > 100) throw new Error("Não foi possível gerar um slot único.");
      id = "slot_" + Array.from(randomBytes(10), byte => byte.toString(16).padStart(2, "0")).join("");
    } while (used.has(id));
    result[user.id] = id;
    used.add(id);
  }
  return result;
}

const bounded = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function normalizePrefs(input = {}) {
  return {
    dock: Object.hasOwn(DOCKS, input?.dock) ? input.dock : DEFAULT_PREFS.dock,
    preview: Object.hasOwn(PREVIEWS, input?.preview) ? input.preview : "native",
    autoOpen: typeof input?.autoOpen === "boolean" ? input.autoOpen : true,
    sideWidth: bounded(input?.sideWidth, 440, 320, 2400),
    barHeight: bounded(input?.barHeight, 360, 240, 1800),
    floating: {
      width: bounded(input?.floating?.width, 720, 320, 2400),
      height: bounded(input?.floating?.height, 600, 240, 1800),
      left: bounded(input?.floating?.left, 120, 0, 10000),
      top: bounded(input?.floating?.top, 80, 0, 10000)
    }
  };
}

export function dockPosition(prefs, viewport) {
  const p = normalizePrefs(prefs);
  const gap = 8;
  const maxWidth = Math.max(1, viewport.width - gap * 2);
  const maxHeight = Math.max(1, viewport.height - gap * 2);
  if (["left", "right"].includes(p.dock)) {
    const width = Math.min(p.sideWidth, maxWidth);
    return { width, height: maxHeight, left: p.dock === "left" ? gap : viewport.width - gap - width, top: gap };
  }
  if (["top", "bottom"].includes(p.dock)) {
    const height = Math.min(p.barHeight, maxHeight);
    return { width: maxWidth, height, left: gap, top: p.dock === "top" ? gap : viewport.height - gap - height };
  }
  const width = Math.min(p.floating.width, maxWidth);
  const height = Math.min(p.floating.height, maxHeight);
  return {
    width, height,
    left: Math.min(p.floating.left, viewport.width - gap - width),
    top: Math.min(p.floating.top, viewport.height - gap - height)
  };
}
