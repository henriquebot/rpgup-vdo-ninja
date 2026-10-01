import { MODULE_ID } from "./config.js";
import { registerSettings, userPrefs } from "./settings.js";
import { RoomDock } from "./room-dock.js";
import { WorldConfig } from "./world-config.js";
import { report } from "./dom.js";

export function openDock() {
  const dock = new RoomDock();
  return dock.render({ force: true });
}

Hooks.once("init", () => {
  registerSettings(RoomDock, WorldConfig, () => RoomDock.instance?.configChanged());
  game.modules.get(MODULE_ID).api = Object.freeze({ openDock });
});

Hooks.once("ready", () => {
  if (userPrefs().autoOpen) openDock().catch(report);
});

Hooks.on("updateUser", (user, changes) => {
  if (user.id === game.user.id && (changes.name !== undefined || changes.role !== undefined)) {
    RoomDock.instance?.configChanged();
  }
});
