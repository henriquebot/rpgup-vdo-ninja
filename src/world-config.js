import { MODULE_ID, fillMissingSlots, validateWorld, normalizePrefs, QUALITY_PRESETS, ROOM_LAYOUTS } from "./config.js";
import { worldConfig, saveWorld } from "./settings.js";
import { participantURL, soloURL, obsExport } from "./urls.js";
import { prepareAvatar } from "./avatar.js";
import { element, select, field, tooltip, panel, button, downloadJSON, report } from "./dom.js";

export class WorldConfig extends foundry.applications.api.ApplicationV2 {
  static instance;
  static DEFAULT_OPTIONS = {
    id: "rpgup-vdo-world-config", classes: ["rpgup-vdo", "rpgup-world-config"],
    window: { title: "RPGUP VDO.Ninja — World / OBS", icon: "fas fa-video", resizable: true },
    position: { width: 1120, height: 740 }
  };

  constructor(options = {}) {
    super(options);
    if (WorldConfig.instance) return WorldConfig.instance;
    WorldConfig.instance = this;
  }

  _canRender(options) {
    super._canRender(options);
    if (!game.user.isGM) throw new Error("Somente o GM pode configurar a Room e os slots.");
  }

  async _renderHTML() {
    const users = Array.from(game.users);
    const signature = JSON.stringify(users.map(user => [user.id, user.name, user.isGM, user.avatar, user.active]));
    if (this._form && this._userSignature === signature) return this._form;
    const draft = this._form ? this._readDraft() : null;
    // Stop background avatar preparation whenever the panel is rebuilt.
    this._linksAbort?.abort();
    const linksAbort = new AbortController();
    this._linksAbort = linksAbort;
    const pendingJoinLinks = [];
    const savedConfig = worldConfig();
    const config = draft ?? savedConfig;
    if (!draft) this._baseConfig = structuredClone(config);
    this._userSignature = signature;
    const form = element("form", undefined, { class: "rpgup-config-form" });
    this._form = form;
    const room = element("input", undefined, { name: "roomId", required: "", maxlength: "49", pattern: "[A-Za-z0-9]+" });
    room.value = config.roomId;
    const extra = element("input", undefined, { name: "extraQuery", placeholder: "password=Senha123&roombitrate=500" });
    extra.value = config.extraQuery;
    const audio = select({ discord: "Discord (VDO sem microfone/reprodução)", vdo: "Áudio e controles nativos VDO.Ninja" }, config.audio, "audio");
    const directors = { "": "GM entra como participante comum" };
    for (const user of users.filter(user => user.isGM)) directors[user.id] = user.name;
    const director = select(directors, config.directorUserId, "directorUserId");
    const quality = select(Object.fromEntries(Object.entries(QUALITY_PRESETS).map(([key, value]) => [key, value.label])), config.quality ?? "native", "quality");
    const roomLayout = select(ROOM_LAYOUTS, config.roomLayout ?? "native", "roomLayout");
    const qualityHelp = element("p", QUALITY_PRESETS[quality.value].help, { class: "rpgup-help", role: "status" });
    quality.addEventListener("change", () => { qualityHelp.textContent = QUALITY_PRESETS[quality.value].help; });
    const intro = element("div", undefined, { class: "rpgup-intro" });
    intro.append(element("h2", "Sala da mesa"), element("span", `${users.length} usuários · ${users.filter(user => savedConfig.slots?.[user.id]).length} slots salvos`, { class: "rpgup-badge" }));
    const roomFields = element("div", undefined, { class: "rpgup-grid" });
    roomFields.append(
      field("Room ID compartilhada", room, "Nome da sala VDO usada por todos os participantes deste World. Use 1–49 letras ou números; maiúsculas fazem diferença. Mudar a Room exige reconectar e atualizar os links OBS."),
      field("Áudio", audio, "Discord desativa microfone e reprodução de áudio do VDO. Áudio VDO permite seus controles nativos. Todos precisam reconectar após mudar; evite ouvir a mesma voz pelos dois serviços."),
      field("GM como Director", director, "Escolha um GM para usar o painel de direção no mesmo iframe. Ele começa em Scene Preview; Toggle Director Vision alterna cena/painel. A opção vazia mantém todos como participantes comuns."),
      field("Qualidade dos vídeos", quality, "Escolha um limite para os vídeos da mesa. Automático mantém o VDO adaptativo. As opções avançadas têm prioridade sobre o preset. Todos precisam aplicar/reconectar após mudar."),
      field("Layout das câmeras", roomLayout, "Compacto usa cover nativo para preencher as áreas das câmeras, podendo recortar a imagem e o self-preview. Padrão não adiciona layout. Só afeta a Room, inclusive o preview do Director; links OBS não mudam. Salve e aplique/reconecte. Resultado visual depende da Room; parâmetros avançados continuam ativos.")
    );
    const advanced = element("details", undefined, { class: "rpgup-advanced" });
    advanced.append(element("summary", "Parâmetros avançados"),
      field("Parâmetros adicionais", extra, "Opções oficiais permitidas, como password=Senha123. Deixe vazio para usar o preset. Não informe uma URL completa; esses valores são compartilhados com os usuários do World."),
      element("p", "Permitidos: password, roombitrate, totalroombitrate, videobitrate, codec, width, height, fps, maxframerate, structure e cover. Layout: structure&cover sem valores; cover=2 limita o recorte ao eixo horizontal. Valores aqui têm prioridade sobre as opções acima e layout nunca entra nos links OBS.", { class: "rpgup-help" })
    );
    form.append(
      intro, panel("Conexão e qualidade", "Compartilhado com os participantes deste World. Depois de salvar, quem já está conectado aplica as mudanças pela engrenagem da dock.", roomFields, qualityHelp, advanced)
    );
    const table = element("table");
    const head = element("tr");
    const columns = ["Usuário / label Foundry", "Stream ID estável", "Avatar da mesa", "Solo link OBS", "Entrar pelo navegador"];
    for (const label of columns) head.append(element("th", label, { scope: "col" }));
    const thead = element("thead");
    thead.append(head);
    const body = element("tbody");
    this._inputs = new Map();
    this._avatarInputs = new Map();
    for (const user of users) {
      const row = element("tr");
      const name = element("td", `${user.name}${user.isGM ? " (GM)" : ""}`);
      name.append(element("small", user.id));
      const role = element("span", user.active ? "No Foundry" : "Offline", { class: "rpgup-badge rpgup-presence" });
      tooltip(role, "Presença no Foundry. Não indica se a câmera está ligada ou se o VDO está conectado.");
      name.append(role);
      const slot = element("input", undefined, { maxlength: "64", pattern: "[A-Za-z0-9_]+", "aria-label": `Stream ID de ${user.name}` });
      tooltip(slot, "ID de publicação estável deste usuário: 1–64 letras, números ou underscore. Não deve se repetir. Gere os faltantes ou informe um ID; deixe vazio para desassociar. Salve para aplicar.");
      slot.value = config.slots[user.id] ?? "";
      this._inputs.set(user.id, slot);
      const slotCell = element("td");
      slotCell.append(slot);
      const avatar = element("input", undefined, { "aria-label": `Avatar da mesa de ${user.name}`, maxlength: "2048", placeholder: "Usar avatar Foundry" });
      avatar.value = config.avatars?.[user.id] ?? "";
      tooltip(avatar, "Imagem opcional definida pelo GM para esta mesa. Use caminho Foundry ou URL HTTPS; vazio usa a imagem do usuário Foundry. O jogador precisa aplicar/reconectar. A URL personalizada individual ainda tem prioridade.");
      this._avatarInputs.set(user.id, avatar);
      const avatarCell = element("td");
      avatarCell.append(avatar);
      const obsCell = element("td");
      try {
        const url = soloURL(savedConfig, user.id, users);
        const link = element("input", undefined, { readonly: "", "aria-label": `Solo link OBS de ${user.name}` });
        tooltip(link, "URL individual baseada na configuração salva. Cole numa Browser Source do OBS. Clique para selecionar; alterações não salvas ainda não aparecem neste link.");
        link.value = url;
        link.addEventListener("click", () => link.select());
        const copy = button("Copiar", "fa-copy", { "aria-label": `Copiar link OBS de ${user.name}` });
        tooltip(copy, "Copiar o solo link salvo deste usuário para usar no OBS.");
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(url);
            ui.notifications.info(`Solo link de ${user.name} copiado.`);
          } catch {
            link.focus();
            link.select();
            ui.notifications.warn("Clipboard indisponível. Use Ctrl+C no link selecionado.");
          }
        });
        const obsField = element("div", undefined, { class: "rpgup-copy-link" });
        obsField.append(link, copy);
        obsCell.append(obsField);
      } catch {
        obsCell.textContent = "Configure a Room e salve o slot para gerar o link.";
      }
      const joinCell = element("td");
      try {
        // This is a publisher link, NOT the viewer-only solo link for OBS.
        // It must use the saved configuration so the same Stream ID is never silently changed.
        participantURL(savedConfig, user, {}, users, location.href, null);
        const joinField = element("div", undefined, { class: "rpgup-copy-link" });
        const joinLink = element("input", undefined, {
          readonly: "", "aria-label": `Link de entrada no navegador de ${user.name}`,
          placeholder: "Preparando link…"
        });
        joinLink.addEventListener("click", () => joinLink.select());
        const joinCopy = button("Copiar", "fa-copy", { "aria-label": `Copiar link de entrada de ${user.name}` });
        joinCopy.disabled = true;
        joinField.append(joinLink, joinCopy);
        joinCell.append(joinField);
        pendingJoinLinks.push(async () => {
          // Respect this user's placeholder preference, then the GM's table avatar,
          // then the Foundry avatar. Embed a small raster so VDO works without Foundry login/CORS.
          const prefs = normalizePrefs(user.getFlag?.(MODULE_ID, "preferences") ?? {});
          let preparedAvatar = "default";
          let avatarError = "";
          try {
            const avatarUser = { avatar: savedConfig.avatars?.[user.id] || user.avatar };
            preparedAvatar = (await prepareAvatar(avatarUser, prefs, { signal: linksAbort.signal, baseURL: location.href })).value;
          } catch (error) {
            if (linksAbort.signal.aborted) return;
            avatarError = error.message;
          }
          if (linksAbort.signal.aborted || this._form !== form) return;
          const url = participantURL(savedConfig, user, prefs, users, location.href, preparedAvatar);
          joinLink.value = url;
          joinCopy.disabled = false;
          tooltip(joinLink, "Entrada externa com nome, Stream ID e Room salvos. Compartilhe apenas com este jogador e feche a dock embutida para não publicar duas vezes.");
          tooltip(joinCopy, "Copiar link de entrada externa. Contém o acesso à sala; envie somente ao jogador correspondente.");
          joinCopy.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(url);
              ui.notifications.info(`Link de entrada de ${user.name} copiado.`);
            } catch {
              joinLink.focus();
              joinLink.select();
              ui.notifications.warn("Clipboard indisponível. Use Ctrl+C no link selecionado.");
            }
          }, { signal: linksAbort.signal });
          if (avatarError) {
            joinCell.append(element("small", "Avatar não carregado: link usa o avatar padrão VDO.", { class: "rpgup-link-warning" }));
            tooltip(joinCell.lastElementChild, avatarError);
          }
        });
      } catch {
        joinCell.textContent = "Configure a Room e salve o slot para gerar o link.";
      }
      [name, slotCell, avatarCell, obsCell, joinCell].forEach((cell, index) => { cell.dataset.label = columns[index]; });
      row.append(name, slotCell, avatarCell, obsCell, joinCell);
      body.append(row);
    }
    table.append(thead, body);
    // Never block the GM panel while avatars are prepared for external browser links.
    void Promise.allSettled(pendingJoinLinks.map(start => start()));
    const generate = button("Gerar e salvar slots faltantes", "fa-wand-magic-sparkles");
    tooltip(generate, "Criar IDs somente para usuários que ainda não têm slot e salvar a Room e as associações no World. IDs existentes são preservados.");
    generate.addEventListener("click", async () => {
      if (this._saving) return;
      // A player may have been created after this panel opened.
      await this.render({ force: true });
      const slots = { ...config.slots };
      for (const [userId, input] of this._inputs) slots[userId] = input.value.trim();
      const filled = fillMissingSlots(slots, Array.from(game.users));
      for (const [userId, input] of this._inputs) input.value = filled[userId];
      this._notice.textContent = "Salvando os slots no mundo…";
      try { await this.saveDraft(); } catch (error) { this._notice.textContent = `Não salvo: ${error.message}`; report(error); }
    });
    const save = button("Salvar configuração", "fa-check", { type: "submit", class: "rpgup-primary" });
    tooltip(save, "Salvar Room, áudio, Director e IDs no World. Usuários aguardando um ID entram na sala; quem já está conectado precisa aplicar/reconectar.");
    const obsNotice = element("p", "Links OBS e links externos usam os valores salvos. Após salvar mudanças de Room, senha ou Stream ID, copie novamente os links.", { role: "status", class: "rpgup-save-status" });
    this._notice = obsNotice;
    form.addEventListener("input", () => {
      obsNotice.textContent = "Há alterações não salvas. Os links OBS e de entrada externa acima ainda correspondem à configuração anterior; salve para atualizar.";
    });
    const exportLinks = tooltip(button("Baixar links OBS", "fa-download"), "Baixar JSON organizado com nome, ID e solo link de cada usuário associado na configuração salva. É uma lista de URLs para Browser Sources, não uma coleção de cenas OBS.");
    exportLinks.addEventListener("click", () => {
      try {
        const value = obsExport(worldConfig(), Array.from(game.users));
        if (!value.sources.length) throw new Error("Salve ao menos um slot para exportar os links OBS.");
        downloadJSON(value, `rpgup-obs-${value.roomId}.json`);
      } catch (error) { report(error); }
    });
    const participantActions = element("div", undefined, { class: "rpgup-actions" });
    participantActions.append(generate, exportLinks);
    const tableWrap = element("div", undefined, { class: "rpgup-table-wrap" });
    tableWrap.append(table);
    const footer = element("footer", undefined, { class: "rpgup-config-footer" });
    footer.append(obsNotice, save);
    form.append(panel("Participantes e fontes OBS", "Gerar cria apenas IDs faltantes e já salva. Entrada externa usa a mesma Room, nome, ID e avatar: envie o link só ao jogador e peça para fechar a dock antes de abrir no navegador. Links podem conter senha; ao alterar configurações, salve antes de copiar.", participantActions, tableWrap), footer);
    this._readDraft = () => {
      const slots = { ...config.slots };
      for (const [userId, input] of this._inputs) {
        const value = input.value.trim();
        if (value) slots[userId] = value;
        else delete slots[userId];
      }
      const avatars = { ...(config.avatars ?? {}) };
      for (const [userId, input] of this._avatarInputs) {
        const value = input.value.trim();
        if (value) avatars[userId] = value;
        else delete avatars[userId];
      }
      return { roomId: room.value.trim(), extraQuery: extra.value.trim(), audio: audio.value, directorUserId: director.value, slots, quality: quality.value, avatars, roomLayout: roomLayout.value };
    };
    this._saveDraft = async () => {
      if (JSON.stringify(worldConfig()) !== JSON.stringify(this._baseConfig)) throw new Error("Outro GM alterou a configuração. Feche e reabra o painel antes de salvar.");
      const next = validateWorld(this._readDraft(), Array.from(game.users));
      this._saving = true;
      save.disabled = generate.disabled = true;
      try {
        this._baseConfig = await saveWorld(next);
        this._form = null;
        ui.notifications.info("Room e slots confirmados no mundo. Jogadores sem sala entram automaticamente; participantes conectados podem reconectar.");
        await this.render({ force: true });
      } finally {
        this._saving = false;
        save.disabled = generate.disabled = false;
      }
    };
    form.addEventListener("submit", async event => {
      event.preventDefault();
      try { await this.saveDraft(); } catch (error) { obsNotice.textContent = `Não salvo: ${error.message}`; report(error); }
    });
    return form;
  }

  _replaceHTML(result, content) {
    if (!content.contains(result)) content.replaceChildren(result);
  }

  get dirty() {
    if (!this._form) return false;
    const base = { ...this._baseConfig, quality: this._baseConfig.quality ?? "native", avatars: this._baseConfig.avatars ?? {}, roomLayout: this._baseConfig.roomLayout ?? "native" };
    return JSON.stringify(this._readDraft()) !== JSON.stringify(base);
  }

  async saveDraft() {
    if (!game.user.isGM) throw new Error("Somente o GM pode salvar configurações.");
    if (this._savePromise) return this._savePromise;
    this._savePromise = this._saveDraft();
    try { await this._savePromise; } finally { this._savePromise = null; }
  }

  configChanged() {
    if (!this._form || this._saving) return;
    if (this.dirty) {
      this._notice.textContent = "A configuração salva mudou. Seu rascunho foi preservado; feche e reabra para usar os dados atuais.";
      return;
    }
    this._form = null;
    this.render({ force: true }).catch(report);
  }

  refreshUsers() {
    if (this._form) this.render({ force: true }).catch(report);
  }

  _onClose(options) {
    super._onClose(options);
    this._linksAbort?.abort();
    this._linksAbort = null;
    this._form = this._readDraft = this._saveDraft = null;
  }
}
