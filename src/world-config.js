import { MODULE_ID, fillMissingSlots, validateWorld } from "./config.js";
import { worldConfig } from "./settings.js";
import { soloURL } from "./urls.js";
import { element, select, field, report } from "./dom.js";

export class WorldConfig extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "rpgup-vdo-world-config", classes: ["rpgup-vdo", "rpgup-world-config"],
    window: { title: "RPGUP VDO.Ninja — World / OBS", icon: "fas fa-video", resizable: true },
    position: { width: 780, height: 680 }
  };

  _canRender(options) {
    super._canRender(options);
    if (!game.user.isGM) throw new Error("Somente o GM pode configurar a Room e os slots.");
  }

  async _renderHTML() {
    const config = worldConfig();
    this._baseConfig = structuredClone(config);
    const users = Array.from(game.users);
    const form = element("form", undefined, { class: "rpgup-config-form" });
    const room = element("input", undefined, { name: "roomId", required: "", maxlength: "49", pattern: "[A-Za-z0-9]+" });
    room.value = config.roomId;
    const extra = element("input", undefined, { name: "extraQuery", placeholder: "password=Senha123&roombitrate=500" });
    extra.value = config.extraQuery;
    const audio = select({ discord: "Discord (VDO sem microfone/reprodução)", vdo: "Áudio e controles nativos VDO.Ninja" }, config.audio, "audio");
    const directors = { "": "GM entra como participante comum" };
    for (const user of users.filter(user => user.isGM)) directors[user.id] = user.name;
    const director = select(directors, config.directorUserId, "directorUserId");
    form.append(
      element("p", "Protótipo: 1 GM e 2 jogadores. As alterações entram em vigor quando cada cliente reconectar."),
      field("Room ID compartilhada", room), field("Parâmetros adicionais", extra),
      element("p", "Permitidos: password, roombitrate, totalroombitrate, videobitrate, codec, width, height e fps. Room/Stream IDs e labels são definidos pelo Foundry."),
      field("Áudio", audio), field("GM como Director (teste opcional)", director),
      element("p", "Director usa o mesmo iframe, com push estável e showdirector. Os poderes VDO são nativos; ser GM Foundry não autentica o Director no VDO.Ninja.")
    );
    const table = element("table");
    const head = element("tr");
    for (const label of ["Usuário / label Foundry", "Stream ID estável", "Solo link OBS (configuração salva)"]) head.append(element("th", label));
    const thead = element("thead");
    thead.append(head);
    const body = element("tbody");
    this._inputs = new Map();
    for (const user of users) {
      const row = element("tr");
      const name = element("td", `${user.name}${user.isGM ? " (GM)" : ""}`);
      name.append(element("small", user.id));
      const slot = element("input", undefined, { maxlength: "64", pattern: "[A-Za-z0-9_]+", "aria-label": `Stream ID de ${user.name}` });
      slot.value = config.slots[user.id] ?? "";
      this._inputs.set(user.id, slot);
      const slotCell = element("td");
      slotCell.append(slot);
      const obsCell = element("td");
      try {
        const url = soloURL(config, user.id, users);
        const link = element("input", undefined, { readonly: "", "aria-label": `Solo link OBS de ${user.name}` });
        link.value = url;
        link.addEventListener("click", () => link.select());
        const copy = element("button", "Copiar", { type: "button" });
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
        obsCell.append(link, copy);
      } catch {
        obsCell.textContent = "Configure a Room e salve o slot para gerar o link.";
      }
      row.append(name, slotCell, obsCell);
      body.append(row);
    }
    table.append(thead, body);
    const generate = element("button", "Gerar slots faltantes", { type: "button" });
    generate.addEventListener("click", () => {
      const slots = { ...config.slots };
      for (const [userId, input] of this._inputs) slots[userId] = input.value.trim();
      const filled = fillMissingSlots(slots, users);
      for (const [userId, input] of this._inputs) input.value = filled[userId];
    });
    const save = element("button", "Salvar configuração", { type: "submit" });
    const obsNotice = element("p", "Links OBS refletem os valores já salvos. Mudanças de Room, senha ou Stream ID exigem atualizar a fonte OBS. Não compartilhe links de uma Room privada.", { role: "status" });
    form.addEventListener("input", () => {
      obsNotice.textContent = "Há alterações não salvas. Os links OBS acima ainda correspondem à configuração anterior; salve para atualizar.";
    });
    generate.addEventListener("click", () => { obsNotice.textContent = "Slots gerados, ainda não salvos. Salve para gerar os links OBS."; });
    form.append(generate, table, obsNotice, element("p", "Slots de usuários removidos são preservados para evitar reutilização acidental. Deixe vazio para não associar um usuário atual. Label acompanha o nome Foundry. Avatar e presets ficam após o gate."), save);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      save.disabled = true;
      try {
        if (!game.user.isGM) throw new Error("Somente o GM pode salvar configurações.");
        // Avoid silently overwriting another GM's edit while this panel was open.
        if (JSON.stringify(worldConfig()) !== JSON.stringify(this._baseConfig)) throw new Error("Outro GM alterou a configuração. Feche e reabra o painel antes de salvar.");
        const slots = { ...config.slots };
        for (const [userId, input] of this._inputs) {
          const value = input.value.trim();
          if (value) slots[userId] = value;
          else delete slots[userId];
        }
        const next = validateWorld({ roomId: room.value, extraQuery: extra.value, audio: audio.value, directorUserId: director.value, slots }, Array.from(game.users));
        await game.settings.set(MODULE_ID, "world", next);
        ui.notifications.info("Room e slots salvos. Cada cliente pode aplicar / reconectar no dock.");
        await this.render({ force: true });
      } catch (error) {
        report(error);
        save.disabled = false;
      }
    });
    return form;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }
}
