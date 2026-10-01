import { VDO_BASE, parseExtraQuery, validateWorld, normalizePrefs } from "./config.js";

function configuredURL(world, users) {
  const config = validateWorld(world, users);
  const url = new URL(VDO_BASE);
  url.searchParams.set("room", config.roomId);
  return { config, url };
}

function addExtras(url, world, { viewer = false } = {}) {
  for (const [key, value] of parseExtraQuery(world.extraQuery)) {
    // OBS receives connection/password options, not the publisher's capture constraints.
    if (viewer && !["password", "codec", "videobitrate"].includes(key)) continue;
    url.searchParams.set(key, value);
  }
}

export function participantURL(world, user, prefs = {}, users = [user], baseURL = globalThis.location?.href) {
  prefs = normalizePrefs(prefs);
  const { config, url } = configuredURL(world, users);
  const streamId = Object.hasOwn(config.slots, user.id) ? config.slots[user.id] : null;
  if (!streamId) throw new Error("O GM ainda não associou um Stream ID ao seu usuário.");
  url.searchParams.set("push", streamId);
  url.searchParams.set("label", user.name);
  if (config.directorUserId === user.id && user.isGM) {
    url.searchParams.set("director", config.roomId);
    url.searchParams.set("showdirector", "1");
  }
  addExtras(url, config);
  // vdo selects a default camera while keeping VDO's native camera chooser available.
  url.searchParams.set("vdo", prefs.camera || "1");
  if (prefs.interface === "mobile") url.searchParams.set("mobile", "");
  if (prefs.interface === "desktop") url.searchParams.set("notmobile", "");
  if (prefs.avatar !== "none") {
    const image = prefs.avatar === "custom" ? prefs.avatarURL : user.avatar;
    if (image) {
      const avatar = new URL(image, baseURL);
      if (!["http:", "https:"].includes(avatar.protocol) || avatar.username || avatar.password) throw new Error("Placeholder: use uma imagem por URL HTTP/HTTPS ou o avatar do usuário Foundry.");
      if (new URL(baseURL ?? VDO_BASE).protocol === "https:" && avatar.protocol !== "https:") throw new Error("Placeholder: em Foundry HTTPS, use uma imagem HTTPS.");
      url.searchParams.set("avatar", avatar.href);
    } else if (prefs.avatar === "custom") throw new Error("Informe a URL da imagem do placeholder nas opções do dock.");
    else url.searchParams.set("avatar", "default");
  }
  if (config.audio === "discord") {
    url.searchParams.set("audiodevice", "0");
    url.searchParams.set("noaudio", "");
  }
  if (prefs.preview === "mini") url.searchParams.set("minipreview", "");
  if (prefs.preview === "pip") url.searchParams.set("pipme", "");
  // No autostart: pipme is incompatible and the native device/permission flow stays visible.
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
