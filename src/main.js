import { MODULE_ID } from "./config.js";
import { registerSettings, userPrefs } from "./settings.js";
import { RoomDock } from "./room-dock.js";
import { WorldConfig } from "./world-config.js";
import { button, tooltip, report } from "./dom.js";

export async function openDock() {
  const dock = new RoomDock();
  await dock.render({ force: true });
  dock.bringToFront();
  syncDockButton();
  return dock;
}

// Toggle the existing local application. Closing ends this user's VDO iframe
// and media connection; opening creates the single room iframe again.
export async function toggleDock() {
  const dock = RoomDock.instance;
  if (dock?.rendered && dock.element?.isConnected) {
    await dock.close();
    syncDockButton();
    return null;
  }
  return openDock();
}

async function openDockOptions() {
  const dock = await openDock();
  dock._showSettings();
  return dock;
}

function syncDockButton() {
  const open = Boolean(RoomDock.instance?.rendered && RoomDock.instance.element?.isConnected);
  document.querySelectorAll(".rpgup-open-dock").forEach(button => {
    button.setAttribute("aria-pressed", String(open));
    button.title = open ? "Fechar câmeras VDO.Ninja" : "Abrir câmeras VDO.Ninja";
  });
}

Hooks.once("init", () => {
  registerSettings(RoomDock, WorldConfig, () => {
    WorldConfig.instance?.configChanged();
    RoomDock.instance?.configChanged();
  });
  game.modules.get(MODULE_ID).api = Object.freeze({ openDock, toggleDock });
});

Hooks.once("ready", () => {
  if (userPrefs().autoOpen) openDock().catch(report);
});

Hooks.on("updateUser", (user, changes) => {
  // User color is used on every peer's camera tile. A reconnection is required
  // for the viewer's VDO stylesheet to reflect another player's changed color.
  if (["name", "role", "avatar", "color"].some(key => changes[key] !== undefined)) {
    WorldConfig.instance?.refreshUsers();
    RoomDock.instance?.configChanged();
  }
});

Hooks.on("createUser", () => WorldConfig.instance?.refreshUsers());
Hooks.on("deleteUser", () => WorldConfig.instance?.refreshUsers());
Hooks.on("userConnected", () => WorldConfig.instance?.refreshUsers());

Hooks.on("renderSettings", (app, html) => {
  const root = html?.querySelector ? html : html?.[0];
  if (!root || root.querySelector(".rpgup-open-dock")) return;
  const open = tooltip(
    button("Câmeras VDO.Ninja", "fa-video", { class: "rpgup-open-dock", "aria-pressed": "false" }),
    "Um clique abre a dock; outro clique fecha as câmeras."
  );
  open.addEventListener("click", () => toggleDock().catch(report));

  const options = tooltip(
    button("Opções VDO.Ninja", "fa-gear", { class: "rpgup-open-dock-options" }),
    "Abrir as configurações da dock VDO.Ninja, sem reconectar uma chamada ativa."
  );
  options.addEventListener("click", () => openDockOptions().catch(report));

  (root.querySelector("section.settings") ?? root).append(open, options);
  syncDockButton();
});
