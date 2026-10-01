import { DOCKS, PREVIEWS, dockPosition, normalizePrefs } from "./config.js";
import { participantURL } from "./urls.js";
import { worldConfig, userPrefs, savePrefs } from "./settings.js";
import { element, select, field, report } from "./dom.js";
import { WorldConfig } from "./world-config.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

export class RoomDock extends ApplicationV2 {
  static instance;
  static DEFAULT_OPTIONS = {
    id: "rpgup-vdo-room", classes: ["rpgup-vdo", "rpgup-room-dock"],
    window: { title: "RPGUP VDO.Ninja", icon: "fas fa-video", resizable: true, minimizable: false },
    position: { width: 440, height: 600 }
  };

  constructor(options = {}) {
    super(options);
    // Foundry settings menus construct their type each time. Return the same local room.
    if (RoomDock.instance) return RoomDock.instance;
    RoomDock.instance = this;
    this.prefs = userPrefs();
    this._saveQueue = Promise.resolve();
    this.onConfigure = () => new WorldConfig().render({ force: true }).catch(report);
  }

  async _renderHTML() {
    if (this._root) return this._root;
    this._listeners = new AbortController();
    this._root = element("section", undefined, { class: "rpgup-room-body" });
    const toolbar = element("div", undefined, { class: "rpgup-toolbar" });
    const dock = select(DOCKS, this.prefs.dock, "Posição do dock");
    const preview = select(PREVIEWS, this.prefs.preview, "Self-preview");
    const auto = element("input", undefined, { type: "checkbox" });
    auto.checked = this.prefs.autoOpen;
    const size = element("input", undefined, { type: "range", min: "320", max: "1200", step: "10", "aria-label": "Tamanho do dock" });
    this._size = size;
    const reconnect = element("button", "Aplicar / reconectar", { type: "button" });
    toolbar.append(field("Dock", dock), field("Self-preview", preview), field("Abrir ao entrar", auto), field("Tamanho", size), reconnect);
    if (game.user.isGM) {
      const config = element("button", "World / OBS", { type: "button" });
      config.addEventListener("click", () => this.onConfigure?.(), { signal: this._listeners.signal });
      toolbar.append(config);
    }
    this._status = element("p", "Ative sua câmera usando os controles do VDO.Ninja.", { class: "rpgup-status", role: "status" });
    this._frameHost = element("div", undefined, { class: "rpgup-frame-host" });
    this._root.append(toolbar, this._status, this._frameHost);
    dock.addEventListener("change", () => {
      this.prefs.dock = dock.value;
      this._layout();
      this._scheduleSave();
    }, { signal: this._listeners.signal });
    preview.addEventListener("change", () => {
      this.prefs.preview = preview.value;
      this._scheduleSave();
      this.configChanged();
    }, { signal: this._listeners.signal });
    auto.addEventListener("change", () => {
      this.prefs.autoOpen = auto.checked;
      this._scheduleSave();
    }, { signal: this._listeners.signal });
    size.addEventListener("input", () => {
      if (["left", "right"].includes(this.prefs.dock)) this.prefs.sideWidth = Number(size.value);
      else this.prefs.barHeight = Number(size.value);
      this._layout();
      this._scheduleSave();
    }, { signal: this._listeners.signal });
    reconnect.addEventListener("click", () => this._connect(), { signal: this._listeners.signal });
    this._connect();
    return this._root;
  }

  _replaceHTML(result, content) {
    // Do not remove/reinsert the browsing context on an ordinary Application rerender.
    if (!content.contains(result)) content.replaceChildren(result);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._layout();
    if (!this._resizeListener) {
      this._resizeListener = () => this._layout();
      window.addEventListener("resize", this._resizeListener, { signal: this._listeners.signal });
    }
  }

  _connect() {
    try {
      if (!window.isSecureContext) throw new Error("Abra o Foundry por HTTPS (ou localhost) para permitir a câmera no iframe.");
      const world = worldConfig();
      const url = participantURL(world, game.user, this.prefs, Array.from(game.users));
      if (!this._iframe) {
        this._iframe = element("iframe", undefined, {
          title: "Room oficial do VDO.Ninja", referrerpolicy: "no-referrer", allowfullscreen: ""
        });
        this._iframe.addEventListener("load", () => {
          if (this._pending) return;
          this._status.textContent = "Documento do iframe carregado. Câmera e conexão: confira na UI VDO.Ninja. PiP: clique na UI nativa ou Ctrl+Alt+P com foco no iframe.";
        }, { signal: this._listeners.signal });
        this._frameHost.replaceChildren(this._iframe);
      }
      this._iframe.allow = "camera; autoplay; fullscreen; display-capture; picture-in-picture" + (world.audio === "vdo" ? "; microphone" : "");
      this._pending = false;
      this._activeURL = url;
      this._iframe.src = url;
      this._status.textContent = "Abrindo a Room. Ative sua câmera na UI nativa do VDO.Ninja. Reconectar encerra a conexão anterior.";
    } catch (error) {
      this._status.textContent = error.message;
    }
  }

  configChanged() {
    if (!this._status) return;
    this._pending = true;
    this._status.textContent = "Configuração alterada. Clique em Aplicar / reconectar para usá-la (a câmera será desconectada).";
  }

  _layout() {
    if (!this.element) return;
    this._layingOut = true;
    try {
      this.element.dataset.dock = this.prefs.dock;
      this.setPosition(dockPosition(this.prefs, { width: window.innerWidth, height: window.innerHeight }));
      const side = ["left", "right"].includes(this.prefs.dock);
      this._size.disabled = this.prefs.dock === "floating";
      this._size.min = side ? "320" : "240";
      this._size.value = String(side ? this.prefs.sideWidth : this.prefs.barHeight);
    } finally {
      this._layingOut = false;
    }
  }

  _prePosition(position) {
    super._prePosition(position);
    if (!this.prefs || this._layingOut) return;
    const next = { ...this.position, ...position };
    if (["left", "right"].includes(this.prefs.dock)) this.prefs.sideWidth = next.width;
    else if (["top", "bottom"].includes(this.prefs.dock)) this.prefs.barHeight = next.height;
    else this.prefs.floating = { width: next.width, height: next.height, left: next.left, top: next.top };
    this.prefs = normalizePrefs(this.prefs);
    Object.assign(position, dockPosition(this.prefs, { width: window.innerWidth, height: window.innerHeight }));
  }

  _onPosition(position) {
    super._onPosition(position);
    if (this._root && !this._layingOut) this._scheduleSave();
  }

  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._persist(), 400);
  }

  _persist() {
    clearTimeout(this._saveTimer);
    const snapshot = structuredClone(this.prefs);
    this._saveQueue = this._saveQueue.then(() => savePrefs(snapshot)).catch(report);
    return this._saveQueue;
  }

  async _preClose(options) {
    await this._persist();
    await super._preClose(options);
  }

  _onClose(options) {
    super._onClose(options);
    this._listeners?.abort();
    // Removing the iframe closes its session/capture; reopening creates only one frame.
    this._iframe?.remove();
    this._iframe = this._root = this._status = this._resizeListener = null;
    this._activeURL = null;
  }
}
