import { MODULE_ID, DEFAULT_WORLD, normalizePrefs } from "./config.js";

export function worldConfig() {
  return game.settings.get(MODULE_ID, "world");
}

export function userPrefs() {
  return normalizePrefs(game.user.getFlag(MODULE_ID, "preferences"));
}

export function savePrefs(prefs) {
  return game.user.setFlag(MODULE_ID, "preferences", normalizePrefs(prefs));
}

export function registerSettings(RoomDock, WorldConfig, onChange) {
  game.settings.register(MODULE_ID, "world", {
    name: "Room VDO.Ninja", scope: "world", config: false,
    type: Object, default: structuredClone(DEFAULT_WORLD), onChange
  });
  game.settings.registerMenu(MODULE_ID, "worldConfig", {
    name: "RPGUP VDO.Ninja — World e fontes OBS", label: "Configurar Room / slots / OBS",
    hint: "Configuração mínima do protótipo. Somente o GM altera Room e Stream IDs.",
    icon: "fas fa-video", type: WorldConfig, restricted: true
  });
  game.settings.registerMenu(MODULE_ID, "openDock", {
    name: "RPGUP VDO.Ninja — Câmeras", label: "Abrir dock de câmeras",
    hint: "Posição, tamanho e self-preview são preferências do seu usuário.",
    icon: "fas fa-video", type: RoomDock, restricted: false
  });
}
