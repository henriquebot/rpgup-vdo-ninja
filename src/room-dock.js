import { DOCKS, AVATARS, dockPosition, normalizePrefs } from "./config.js";
import { participantURL, avatarURLBudget } from "./urls.js";
import { prepareAvatar } from "./avatar.js";
import { worldConfig, userPrefs, savePrefs } from "./settings.js";
import { element, select, field, tooltip, panel, button, report } from "./dom.js";
import { WorldConfig } from "./world-config.js";
import { createIconTabs } from "./tabs.js";
import { createDockQuickControls } from "./dock-quick-controls.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;

export class RoomDock extends ApplicationV2 {
  static instance;
  static DEFAULT_OPTIONS = {
    id: "rpgup-vdo-room", classes: ["rpgup-vdo", "rpgup-room-dock"],
    window: { title: "RPGUP VDO.Ninja", icon: "fas fa-video", resizable: true, minimizable: false },
    actions: { toggleModuleSettings: this.prototype._toggleSettings, undock: this.prototype._undock, reloadRoom: this.prototype._reloadRoom },
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

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const header = frame.querySelector(".window-header");
    this._reloadButton = tooltip(element("button", undefined, {
      type: "button", class: "header-control icon fa-solid fa-rotate-right", "data-action": "reloadRoom",
      "aria-label": "Recarregar sala VDO"
    }), "Recarregar somente sua sala VDO para atualizar mudanças do Director. Reinicia sua conexão e câmera; mantém o Foundry aberto e não salva rascunhos do GM. Para aplicar opções do módulo, use Aplicar / reconectar.");
    this._settingsButton = tooltip(element("button", undefined, {
      type: "button", class: "header-control icon fa-solid fa-gear", "data-action": "toggleModuleSettings",
      "aria-label": "Configurações da dock", "aria-expanded": "false", "aria-controls": "rpgup-vdo-settings"
    }), "Mostrar as guias de configuração, janela, imagem e ajuda. Câmera e PiP ficam no VDO.Ninja.");
    this._undockButton = tooltip(element("button", undefined, {
      type: "button", class: "header-control icon fa-solid fa-up-right-from-square", "data-action": "undock",
      "aria-label": "Desacoplar janela"
    }), "Transformar o dock de borda em janela flutuante dentro do Foundry, sem reconectar a chamada.");
    const close = header.querySelector('[data-action="close"]');
    header.insertBefore(this._reloadButton, close);
    header.insertBefore(this._settingsButton, close);
    header.insertBefore(this._undockButton, close);
    return frame;
  }

  _reloadRoom() {
    if (this._connecting) return;
    if (!this._iframe || !this._activeURL) return this._connect({ saveDraft: false });
    this._status.textContent = this._pending
      ? "Recarregando a sala atual. Há opções do módulo pendentes; use Aplicar / reconectar para aplicá-las."
      : "Recarregando somente a sala VDO. Ative sua câmera novamente na UI nativa.";
    this._iframe.src = this._activeURL;
  }

  _toggleSettings() {
    if (!this._settings) return;
    this._settings.hidden = !this._settings.hidden;
    this._settingsButton.setAttribute("aria-expanded", String(!this._settings.hidden));
  }

  _ensureQuickControls() {
    if (this._quickControls) return;
    this._quickControls = createDockQuickControls({
      settings: () => this._toggleSettings(),
      reload: () => this._reloadRoom(),
      undock: () => this._undock(),
      close: () => { void this.close().catch(report); }
    });
  }

  _undock() {
    this.prefs.dock = "floating";
    this._dockControl.value = "floating";
    this._layout();
    this._scheduleSave();
  }

  async _renderHTML() {
    if (this._root) return this._root;
    this._listeners = new AbortController();
    this._root = element("section", undefined, { class: "rpgup-room-body" });
    this._settings = element("section", undefined, { id: "rpgup-vdo-settings", class: "rpgup-settings", hidden: "", "aria-label": "Opções da dock" });
    const toolbar = element("div", undefined, { class: "rpgup-toolbar" });
    const dock = select(DOCKS, this.prefs.dock, "Posição do dock");
    this._dockControl = dock;
    const auto = element("input", undefined, { type: "checkbox" });
    auto.checked = this.prefs.autoOpen;
    const size = element("input", undefined, { type: "range", min: "320", max: "1200", step: "10", "aria-label": "Tamanho do dock" });
    this._size = size;
    const reconnect = button("Aplicar / reconectar", "fa-check", { class: "rpgup-primary" });
    const smaller = tooltip(element("button", "−", { type: "button", "aria-label": "Diminuir zoom" }), "Diminuir os controles e vídeos do VDO, mostrando mais conteúdo. Não reconecta.");
    const larger = tooltip(element("button", "+", { type: "button", "aria-label": "Aumentar zoom" }), "Aumentar os controles e vídeos do VDO. Não reconecta.");
    this._zoomReset = element("button", `${Math.round(this.prefs.zoom * 100)}%`, { type: "button", "aria-label": "Restaurar zoom para 100%" });
    const zoom = element("div", undefined, { class: "rpgup-zoom", role: "group", "aria-label": "Zoom do VDO.Ninja" });
    zoom.append(smaller, this._zoomReset, larger);
    tooltip(this._zoomReset, "Voltar o zoom para 100%, sem reconectar a chamada.");
    tooltip(reconnect, "Salvar suas preferências e reabrir a sala. Isso interrompe e reinicia sua câmera. No GM, salva também o rascunho aberto de World / OBS.");
    toolbar.append(field("Posição da janela", dock, "Flutuante pode ser movida e redimensionada. As bordas reservam espaço da UI do Foundry. Mudar posição não reconecta."), field("Zoom da sala", zoom));
    const actions = element("div", undefined, { class: "rpgup-actions" });
    let configButton = null;
    if (game.user.isGM) {
      configButton = button("Configurar mesa", "fa-users-gear");
      configButton.addEventListener("click", () => this.onConfigure?.(), { signal: this._listeners.signal });
      tooltip(configButton, "Configurar a sala da mesa, participantes, links OBS e entradas externas. Somente o GM pode editar.");
      actions.append(configButton);
    }
    actions.append(reconnect);
    const settings = element("div", undefined, { class: "rpgup-toolbar rpgup-preferences" });
    const avatar = select(AVATARS, this.prefs.avatar, "Placeholder");
    const avatarURL = element("input", undefined, { type: "url", maxlength: "2048", placeholder: "https://…/imagem.webp", "aria-label": "URL do placeholder" });
    avatarURL.value = this.prefs.avatarURL;
    avatarURL.disabled = this.prefs.avatar !== "custom";
    settings.append(
      field("Imagem quando a câmera está desligada", avatar, "Avatar Foundry / da mesa usa a imagem definida pelo GM, ou a do seu usuário Foundry, e a reaplica em cada sessão. Imagem por URL usa o endereço salvo abaixo. Sem placeholder deixa o comportamento padrão do vídeo desligado. Clique em Aplicar após mudar."),
      field("URL da imagem", avatarURL, "Endereço da imagem personalizada. Imagens do próprio Foundry são lidas com sua sessão; imagens de outros sites precisam permitir leitura pelo navegador. A URL é lembrada por usuário.")
    );
    const autoField = field("Abrir esta janela ao entrar no mundo", auto, "Marcada: abre a dock ao entrar no World. Desmarcada: abra pelo botão Câmeras VDO.Ninja na aba Configurações ou pelo menu do módulo. Esta opção não liga sua câmera automaticamente.");
    autoField.classList.add("rpgup-toggle");
    toolbar.append(field("Largura / altura na borda", size, "Ajusta a largura nas bordas laterais ou a altura no topo/embaixo. Em modo flutuante, use a alça de redimensionamento da janela."), autoField);
    this._avatarPreview = element("img", undefined, { class: "rpgup-avatar-preview", alt: "Imagem preparada para o placeholder", hidden: "" });
    this._avatarStatus = element("p", "", { class: "rpgup-avatar-status", role: "status" });
    this._directorHelp = element("p", "Director inicia em Scene Preview. Use 🪟 Toggle Director Vision no VDO para alternar entre a cena e o painel de direção.", { hidden: "", class: "rpgup-director-help" });
    const avatarSummary = element("div", undefined, { class: "rpgup-avatar-summary" });
    avatarSummary.append(this._avatarPreview, this._avatarStatus);
    this._status = element("p", "Ative sua câmera usando os controles do VDO.Ninja.", { class: "rpgup-status", role: "status" });
    const connectPane = element("div", undefined, { class: "rpgup-tab-section" });
    connectPane.append(
      element("p", game.user.isGM
        ? "Primeiro configure a mesa e os jogadores. Depois clique em Aplicar / reconectar."
        : "Entre na sala configurada pelo mestre. Após mudanças, use Aplicar / reconectar.", { class: "rpgup-help" }),
      actions, this._status
    );
    const windowPane = element("div", undefined, { class: "rpgup-tab-section" });
    windowPane.append(toolbar);
    const avatarPane = element("div", undefined, { class: "rpgup-tab-section" });
    avatarPane.append(settings, avatarSummary);
    const helpPane = element("div", undefined, { class: "rpgup-tab-section" });
    helpPane.append(
      element("p", "Câmera e microfone: engrenagem do VDO. Preview e PiP: menu do próprio vídeo. Ctrl+Alt+P alterna PiP (Cmd+Alt+P no Mac), com foco no VDO.", { class: "rpgup-help" }),
      this._directorHelp
    );
    const tourSteps = [
      ...(configButton ? [{ tab: "connect", target: () => configButton, text: "Mestre: clique em Configurar mesa para definir a sala e os IDs dos jogadores." }] : []),
      { tab: "connect", target: () => reconnect, text: "Aplicar / reconectar salva suas preferências e reinicia a sala e a câmera." },
      { tab: "window", target: () => dock, text: "A dock começa à esquerda. Escolha outra posição se preferir: ela será lembrada." },
      { tab: "window", target: () => zoom, text: "O zoom altera o tamanho visual sem reconectar." },
      { tab: "avatar", target: () => avatar, text: "Escolha a imagem que aparece enquanto a câmera estiver desligada." },
      { tab: "help", target: () => helpPane, text: "Os controles de câmera, microfone e PiP ficam no VDO.Ninja." }
    ];
    this._settings.append(createIconTabs({
      id: "rpgup-dock", label: "Guias da chamada",
      initial: "connect", tourSteps,
      tabs: [
        { key: "connect", title: game.user.isGM ? "Configuração da mesa" : "Conexão da sala", icon: "fa-users-gear", children: [connectPane] },
        { key: "window", title: "Posição e tamanho da janela", icon: "fa-window-maximize", children: [windowPane] },
        { key: "avatar", title: "Imagem com câmera desligada", icon: "fa-image", children: [avatarPane] },
        { key: "help", title: "Ajuda e controles da chamada", icon: "fa-circle-question", children: [helpPane] }
      ]
    }).root);
    const remember = (control, key) => control.addEventListener("change", () => {
      this.prefs[key] = control.value.trim();
      avatarURL.disabled = this.prefs.avatar !== "custom";
      this._scheduleSave();
      this.configChanged();
    }, { signal: this._listeners.signal });
    remember(avatar, "avatar");
    remember(avatarURL, "avatarURL");
    const changeZoom = value => {
      this.prefs.zoom = Math.round(Math.max(0.5, Math.min(1.5, value)) * 100) / 100;
      this._zoomFrame();
      this._scheduleSave();
    };
    smaller.addEventListener("click", () => changeZoom(this.prefs.zoom - 0.1), { signal: this._listeners.signal });
    larger.addEventListener("click", () => changeZoom(this.prefs.zoom + 0.1), { signal: this._listeners.signal });
    this._zoomReset.addEventListener("click", () => changeZoom(1), { signal: this._listeners.signal });
    this._frameHost = element("div", undefined, { class: "rpgup-frame-host" });
    this._alert = element("p", "", { class: "rpgup-connection-alert", role: "status", hidden: "" });
    // Connection errors stay in normal layout, never cover settings or dropdowns.
    this._root.append(this._settings, this._alert, this._frameHost);
    dock.addEventListener("change", () => {
      this.prefs.dock = dock.value;
      this._layout();
      this._scheduleSave();
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
    this._ensureQuickControls();
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
    this._reloadButton.disabled = true;
    this._quickControls?.setReloadDisabled(true);
    const signal = this._listeners.signal;
    try {
      if (saveDraft && game.user.isGM && WorldConfig.instance?.dirty) await WorldConfig.instance.saveDraft();
      if (saveDraft) await this._persist();
      if (signal.aborted) return;
      if (!window.isSecureContext) throw new Error("Abra o Foundry por HTTPS (ou localhost) para permitir a câmera no iframe.");
      let world = worldConfig();
      if (!world.roomId?.trim()) throw new Error("Room não configurada. GM: abra World / OBS e salve a sala.");
      // Validate room/assignment before fetching an image for a waiting player.
      participantURL(world, game.user, this.prefs, Array.from(game.users), location.href, null);
      let avatar;
      try {
        const avatarUser = { avatar: world.avatars?.[game.user.id] || game.user.avatar };
        const budget = avatarURLBudget(world, game.user, this.prefs, Array.from(game.users), location.href);
        const prepared = await prepareAvatar(avatarUser, this.prefs, { signal, maxEncodedLength: budget });
        avatar = prepared.value;
        this._avatarPreview.hidden = !avatar || avatar === "default";
        if (!this._avatarPreview.hidden) this._avatarPreview.src = avatar;
        this._avatarStatus.textContent = avatar ? "Placeholder preparado e aplicado à entrada da sala. Ele aparece quando a câmera está desligada." : "Placeholder desativado.";
      } catch (error) {
        if (signal.aborted) return;
        avatar = "default";
        this._avatarPreview.hidden = true;
        this._avatarStatus.textContent = `Placeholder personalizado não aplicado: ${error.message}`;
        ui.notifications.warn(this._avatarStatus.textContent);
      }
      if (signal.aborted) return;
      // Settings may have arrived while a static image was being fetched.
      world = worldConfig();
      const url = participantURL(world, game.user, this.prefs, Array.from(game.users), location.href, avatar);
      const director = new URL(url).searchParams.has("director");
      this._directorHelp.hidden = !director;
      if (director && !this._directorNoticeShown) {
        ui.notifications.info(this._directorHelp.textContent);
        this._directorNoticeShown = true;
      }
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
      this._settingsButton.classList.remove("rpgup-attention");
      this._quickControls?.setAttention(false);
      tooltip(this._settingsButton, "Mostrar as guias de configuração, janela, imagem e ajuda. Câmera e PiP ficam no VDO.Ninja.");
      this._alert.hidden = true;
      this._activeURL = url;
      this._iframe.src = url;
      this._zoomFrame();
      this._status.textContent = "Abrindo a Room. Ative sua câmera na UI nativa do VDO.Ninja. Reconectar encerra a conexão anterior.";
    } catch (error) {
      if (!signal.aborted) {
        this._status.textContent = error.message;
        this._settingsButton?.classList.add("rpgup-attention");
        this._quickControls?.setAttention(true);
        if (this._settingsButton) tooltip(this._settingsButton, error.message + " Abra as configurações para conferir.");
        this._alert.textContent = error.message;
        this._alert.hidden = Boolean(this._iframe);
      }
    } finally {
      // An aborted avatar fetch may finish after this dock was reopened.
      if (this._listeners.signal === signal) {
        this._connecting = false;
        this._reloadButton.disabled = false;
        this._quickControls?.setReloadDisabled(false);
      }
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
    this._settingsButton?.classList.add("rpgup-attention");
    this._quickControls?.setAttention(true);
    this._status.textContent = "Configuração alterada. Abra a engrenagem e clique em Aplicar / reconectar para usá-la (a câmera será desconectada).";
    if (this._settingsButton) tooltip(this._settingsButton, this._status.textContent);
  }

  _layout() {
    if (!this.element) return;
    this._layingOut = true;
    try {
      this.element.dataset.dock = this.prefs.dock;
      const position = dockPosition(this.prefs, { width: window.innerWidth, height: window.innerHeight });
      this.setPosition(position);
      this._reserveInterface(position);
      this._quickControls?.update(this.element.getBoundingClientRect(), this.prefs.dock);
      const side = ["left", "right"].includes(this.prefs.dock);
      this._size.disabled = this.prefs.dock === "floating";
      this._size.min = side ? "320" : "240";
      this._size.value = String(side ? this.prefs.sideWidth : this.prefs.barHeight);
      this._undockButton.disabled = this.prefs.dock === "floating";
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
      this._quickControls?.update(this.element.getBoundingClientRect(), this.prefs.dock);
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
    this._connecting = false;
    this._observer?.disconnect();
    this._observer = null;
    this._quickControls?.destroy();
    this._quickControls = null;
    document.body.classList.remove("rpgup-vdo-docked");
    for (const side of ["left", "right", "top", "bottom"]) document.body.style.removeProperty(`--rpgup-vdo-${side}`);
    // Removing the iframe closes its session/capture; reopening creates only one frame.
    this._iframe?.remove();
    this._iframe = this._root = this._status = this._resizeListener = null;
    this._settings = this._alert = null;
    this._activeURL = null;
  }
}
