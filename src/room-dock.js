import { DOCKS, PREVIEWS, INTERFACES, AVATARS, dockPosition, normalizePrefs } from "./config.js";
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
    position: { width: 720, height: 600 }
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
    const smaller = element("button", "−", { type: "button", "aria-label": "Diminuir zoom" });
    const larger = element("button", "+", { type: "button", "aria-label": "Aumentar zoom" });
    this._zoomReset = element("button", `${Math.round(this.prefs.zoom * 100)}%`, { type: "button", "aria-label": "Restaurar zoom para 100%" });
    const zoom = element("div", undefined, { class: "rpgup-zoom", role: "group", "aria-label": "Zoom do VDO.Ninja" });
    zoom.append(smaller, this._zoomReset, larger);
    toolbar.append(field("Dock", dock), field("Self-preview", preview), zoom, reconnect);
    if (game.user.isGM) {
      const config = element("button", "World / OBS", { type: "button" });
      config.addEventListener("click", () => this.onConfigure?.(), { signal: this._listeners.signal });
      toolbar.append(config);
    }
    const options = element("details", undefined, { class: "rpgup-options" });
    options.append(element("summary", "Opções de câmera, avatar e interface"));
    const settings = element("div", undefined, { class: "rpgup-toolbar rpgup-preferences" });
    const interfaceMode = select(INTERFACES, this.prefs.interface, "Interface VDO");
    const avatar = select(AVATARS, this.prefs.avatar, "Placeholder");
    const camera = element("input", undefined, { type: "text", maxlength: "256", placeholder: "Padrão do navegador", "aria-label": "Câmera padrão" });
    camera.value = this.prefs.camera;
    const avatarURL = element("input", undefined, { type: "url", maxlength: "2048", placeholder: "https://…/imagem.webp", "aria-label": "URL do placeholder" });
    avatarURL.value = this.prefs.avatarURL;
    avatarURL.disabled = this.prefs.avatar !== "custom";
    settings.append(field("Câmera padrão (nome)", camera), field("Placeholder", avatar), field("URL da imagem", avatarURL), field("Interface VDO", interfaceMode), field("Abrir ao entrar", auto), field("Tamanho na borda", size));
    options.append(settings, element("p", "Vazio usa a câmera padrão do navegador; informe o nome para preferir outra. O avatar Foundry acompanha seu usuário. Imagens devem ser acessíveis pelo VDO.Ninja. Móvel ajusta o funcionamento do VDO; o zoom ajusta o tamanho dos controles."));
    const remember = (control, key) => control.addEventListener("change", () => {
      this.prefs[key] = control.value.trim();
      avatarURL.disabled = this.prefs.avatar !== "custom";
      this._scheduleSave();
      this.configChanged();
    }, { signal: this._listeners.signal });
    remember(camera, "camera");
    remember(avatar, "avatar");
    remember(avatarURL, "avatarURL");
    remember(interfaceMode, "interface");
    const changeZoom = value => {
      this.prefs.zoom = Math.round(Math.max(0.5, Math.min(1.5, value)) * 100) / 100;
      this._zoomFrame();
      this._scheduleSave();
    };
    smaller.addEventListener("click", () => changeZoom(this.prefs.zoom - 0.1), { signal: this._listeners.signal });
    larger.addEventListener("click", () => changeZoom(this.prefs.zoom + 0.1), { signal: this._listeners.signal });
    this._zoomReset.addEventListener("click", () => changeZoom(1), { signal: this._listeners.signal });
    this._status = element("p", "Ative sua câmera usando os controles do VDO.Ninja.", { class: "rpgup-status", role: "status" });
    this._frameHost = element("div", undefined, { class: "rpgup-frame-host" });
    this._root.append(toolbar, options, this._status, this._frameHost);
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
    this._connect({ saveDraft: false });
    return this._root;
  }

  _replaceHTML(result, content) {
    // Do not remove/reinsert the browsing context on an ordinary Application rerender.
    if (!content.contains(result)) content.replaceChildren(result);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._layout();
    if (!this._observer) {
      this._observer = new ResizeObserver(() => this._zoomFrame());
      this._observer.observe(this._frameHost);
    }
    if (!this._resizeListener) {
      this._resizeListener = () => this._layout();
      window.addEventListener("resize", this._resizeListener, { signal: this._listeners.signal });
    }
  }

  async _connect({ saveDraft = true } = {}) {
    if (this._connecting) return;
    this._connecting = true;
    try {
      if (saveDraft && game.user.isGM && WorldConfig.instance?.dirty) await WorldConfig.instance.saveDraft();
      if (saveDraft) await this._persist();
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
      this._zoomFrame();
      this._status.textContent = "Abrindo a Room. Ative sua câmera na UI nativa do VDO.Ninja. Reconectar encerra a conexão anterior.";
    } catch (error) {
      this._status.textContent = error.message;
    } finally {
      this._connecting = false;
    }
  }

  configChanged() {
    if (!this._status) return;
    // A player waiting for an assignment has no active capture to interrupt.
    if (!this._iframe) {
      this._connect({ saveDraft: false });
      return;
    }
    this._pending = true;
    this._status.textContent = "Configuração alterada. Clique em Aplicar / reconectar para usá-la (a câmera será desconectada).";
  }

  _layout() {
    if (!this.element) return;
    this._layingOut = true;
    try {
      this.element.dataset.dock = this.prefs.dock;
      const position = dockPosition(this.prefs, { width: window.innerWidth, height: window.innerHeight });
      this.setPosition(position);
      this._reserveInterface(position);
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
    if (this._root && !this._layingOut) {
      this._reserveInterface(position);
      this._scheduleSave();
    }
  }

  _zoomFrame() {
    if (!this._iframe) return;
    const scale = this.prefs.zoom;
    this._iframe.style.width = `${100 / scale}%`;
    this._iframe.style.height = `${100 / scale}%`;
    this._iframe.style.transform = `scale(${scale})`;
    this._zoomReset.textContent = `${Math.round(scale * 100)}%`;
  }

  _reserveInterface(position) {
    // Scoped CSS reserves the main interface's margins, like the native AV dock.
    // Do not move Foundry nodes or replace CameraViews/AVClient.
    const docked = this.prefs.dock !== "floating";
    document.body.classList.toggle("rpgup-vdo-docked", docked);
    for (const side of ["left", "right", "top", "bottom"]) {
      const amount = docked && this.prefs.dock === side ? (["left", "right"].includes(side) ? position.width : position.height) + 16 : 0;
      document.body.style.setProperty(`--rpgup-vdo-${side}`, `${amount}px`);
    }
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
    this._observer?.disconnect();
    this._observer = null;
    document.body.classList.remove("rpgup-vdo-docked");
    for (const side of ["left", "right", "top", "bottom"]) document.body.style.removeProperty(`--rpgup-vdo-${side}`);
    // Removing the iframe closes its session/capture; reopening creates only one frame.
    this._iframe?.remove();
    this._iframe = this._root = this._status = this._resizeListener = null;
    this._activeURL = null;
  }
}
