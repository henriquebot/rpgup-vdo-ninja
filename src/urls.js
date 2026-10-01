import { VDO_BASE, QUALITY_PRESETS, parseExtraQuery, validateWorld, normalizePrefs } from "./config.js";

function configuredURL(world, users) {
  const config = validateWorld(world, users);
  const url = new URL(VDO_BASE);
  url.searchParams.set("room", config.roomId);
  return { config, url };
}

function addExtras(url, world, { viewer = false } = {}) {
  const params = new URLSearchParams(QUALITY_PRESETS[world.quality].params);
  // Explicit advanced values take precedence over the selected preset.
  for (const [key, value] of parseExtraQuery(world.extraQuery)) params.set(key, value);
  for (const [key, value] of params) {
    // OBS receives connection/password options, not the publisher's capture constraints.
    if (viewer && !["password", "codec", "videobitrate"].includes(key)) continue;
    url.searchParams.set(key, value);
  }
}

export function avatarSource(user, prefs = {}, baseURL = globalThis.location?.href) {
  prefs = normalizePrefs(prefs);
  if (prefs.avatar === "none") return null;
  const image = prefs.avatar === "custom" ? prefs.avatarURL : user.avatar;
  if (!image) {
    if (prefs.avatar === "custom") throw new Error("Informe a URL da imagem do placeholder nas configurações da dock.");
    return "default";
  }
  const avatar = new URL(image, baseURL);
  if (!["http:", "https:"].includes(avatar.protocol) || avatar.username || avatar.password) throw new Error("Placeholder: use uma imagem por URL HTTP/HTTPS ou o avatar do usuário Foundry.");
  if (new URL(baseURL ?? VDO_BASE).protocol === "https:" && avatar.protocol !== "https:") throw new Error("Placeholder: em Foundry HTTPS, use uma imagem HTTPS.");
  return avatar.href;
}

export function participantURL(world, user, prefs = {}, users = [user], baseURL = globalThis.location?.href, preparedAvatar) {
  prefs = normalizePrefs(prefs);
  const { config, url } = configuredURL(world, users);
  const streamId = Object.hasOwn(config.slots, user.id) ? config.slots[user.id] : null;
  if (!streamId) throw new Error("O GM ainda não associou um Stream ID ao seu usuário.");
  url.searchParams.set("push", streamId);
  url.searchParams.set("label", user.name);
  if (config.directorUserId === user.id && user.isGM) {
    url.searchParams.set("director", config.roomId);
    url.searchParams.set("showdirector", "1");
    url.searchParams.set("previewmode", "");
  }
  addExtras(url, config);
  const avatarUser = { ...user, avatar: config.avatars[user.id] || user.avatar };
  const avatar = preparedAvatar === undefined ? avatarSource(avatarUser, prefs, baseURL) : preparedAvatar;
  if (avatar) url.searchParams.set("avatar", avatar);
  if (config.audio === "discord") {
    url.searchParams.set("audiodevice", "0");
    url.searchParams.set("noaudio", "");
  }
  // Camera, mobile detection and self-preview are controlled only by the native VDO UI.
  return url.href;
}

export function soloURL(world, userId, users = []) {
  const { config, url } = configuredURL(world, users);
  const streamId = Object.hasOwn(config.slots, userId) ? config.slots[userId] : null;
  if (!streamId) throw new Error("Usuário sem Stream ID associado.");
  url.searchParams.set("view", streamId);
  url.searchParams.set("solo", "");
  url.searchParams.set("cleanoutput", "");
  addExtras(url, config, { viewer: true });
  if (config.audio === "discord") url.searchParams.set("noaudio", "");
  return url.href;
}

export function obsExport(world, users = []) {
  const config = validateWorld(world, users);
  return {
    format: "rpgup-vdo-ninja-obs-links", version: 1, roomId: config.roomId,
    sources: users.filter(user => Object.hasOwn(config.slots, user.id)).map(user => ({
      userId: user.id, name: user.name, streamId: config.slots[user.id],
      url: soloURL(config, user.id, users), width: 1280, height: 720
    }))
  };
}
