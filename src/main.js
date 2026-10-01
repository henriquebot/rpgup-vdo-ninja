import { MODULE_ID } from "./config.js";
import { registerSettings, userPrefs } from "./settings.js";
import { RoomDock } from "./room-dock.js";
import { WorldConfig } from "./world-config.js";
import { button, tooltip, report } from "./dom.js";

export async function openDock() {
  const dock = new RoomDock();
  await dock.render({ force: true });
  dock.bringToFront();
  return dock;
}

Hooks.once("init", () => {
  registerSettings(RoomDock, WorldConfig, () => {
    WorldConfig.instance?.configChanged();
    RoomDock.instance?.configChanged();
  });
  game.modules.get(MODULE_ID).api = Object.freeze({ openDock });
});

Hooks.once("ready", () => {
  if (userPrefs().autoOpen) openDock().catch(report);
});

Hooks.on("updateUser", (user, changes) => {
  if (["name", "role", "avatar"].some(key => changes[key] !== undefined)) WorldConfig.instance?.refreshUsers();
  if (user.id === game.user.id && ["name", "role", "avatar"].some(key => changes[key] !== undefined)) {
    RoomDock.instance?.configChanged();
  }
});

Hooks.on("createUser", () => WorldConfig.instance?.refreshUsers());
Hooks.on("deleteUser", () => WorldConfig.instance?.refreshUsers());
Hooks.on("userConnected", () => WorldConfig.instance?.refreshUsers());

Hooks.on("renderSettings", (app, html) => {
  const root = html?.querySelector ? html : html?.[0];
  if (!root || root.querySelector(".rpgup-open-dock")) return;
  const open = tooltip(button("Câmeras VDO.Ninja", "fa-video", { class: "rpgup-open-dock" }), "Abrir ou trazer para frente sua dock de câmeras. Fechou a janela? Reabra por aqui.");
  open.addEventListener("click", () => openDock().catch(report));
  (root.querySelector("section.settings") ?? root).append(open);
});
