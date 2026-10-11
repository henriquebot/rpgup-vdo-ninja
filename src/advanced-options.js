import { parseExtraQuery } from "./config.js";
import { element, select, field, tooltip, button } from "./dom.js";

// Deliberately restricted to parameters already supported in the module.
// The VDO website has hundreds of additional controls; its native gear
// remains available without exposing dangerous parameters in a shared Room.
export const VDO_OPTIONS = Object.freeze({
  password: { label: "Sala · Senha", help: "Senha da sala compartilhada. 1–49 letras ou números. Alterar exige novos links e reconexão.", sample: "Senha123" },
  roombitrate: { label: "Vídeo · Taxa por câmera na sala", help: "Limite, em kbps, de cada vídeo recebido dentro da sala. Aumentar consome mais banda.", sample: "500" },
  totalroombitrate: { label: "Vídeo · Banda total na sala", help: "Orçamento total, em kbps, dos vídeos da sala. Pode reduzir a qualidade quando há muitos jogadores.", sample: "1500" },
  videobitrate: { label: "OBS · Taxa de recepção", help: "Taxa desejada, em kbps, para fontes de visualização, como OBS. Depende da conexão e do navegador.", sample: "2500" },
  codec: { label: "Vídeo · Codec", help: "Preferência de codec de vídeo (H.264, VP8, VP9 ou AV1). Nem todos os navegadores oferecem todos.", sample: "h264", choices: { h264: "H.264", vp8: "VP8", vp9: "VP9", av1: "AV1" } },
  width: { label: "Câmera · Largura", help: "Largura de captura solicitada, em pixels. A câmera pode ignorar resoluções não suportadas.", sample: "1280" },
  height: { label: "Câmera · Altura", help: "Altura de captura solicitada, em pixels. Combina com largura e depende do dispositivo.", sample: "720" },
  fps: { label: "Câmera · FPS de captura", help: "Taxa de quadros solicitada para a câmera. Valores mais altos usam mais processamento.", sample: "30" },
  maxframerate: { label: "Vídeo · FPS máximo", help: "Limita os quadros por segundo para economizar CPU e banda, mesmo em câmeras rápidas.", sample: "30" },
  structure: { label: "Layout · Estrutura", help: "Organiza os vídeos em proporções previsíveis. Use sem valor; pode criar espaços vazios.", sample: "", flag: true },
  cover: { label: "Layout · Preencher vídeo", help: "Preenche os quadros com recorte. Sem valor: recorte padrão; valor 2: recorte horizontal.", sample: "", choices: { "": "Padrão", "2": "Horizontal (2)" } }
});

export function createVDOOptionsEditor(rawInput) {
  const root = element("div", undefined, { class: "rpgup-option-editor" });
  const selector = select(Object.fromEntries(Object.entries(VDO_OPTIONS).map(([key, value]) => [key, value.label])), "roombitrate", "vdoOption");
  const textValue = element("input", undefined, { type: "text", maxlength: "49", "aria-label": "Valor VDO" });
  const choiceValue = select({}, "", "vdoOptionChoice");
  const info = element("p", "", { class: "rpgup-help", role: "status", "aria-live": "polite" });
  const add = button("Adicionar / atualizar", "fa-plus", { "aria-label": "Adicionar parâmetro VDO" });
  const entries = element("div", undefined, { class: "rpgup-option-entries", "aria-label": "Parâmetros VDO aplicados" });
  const preview = element("div", undefined, { class: "rpgup-option-controls" });

  function setSelected() {
    const option = VDO_OPTIONS[selector.value];
    info.textContent = option.help;
    tooltip(selector, option.help);
    textValue.hidden = !!option.choices || !!option.flag;
    choiceValue.hidden = !option.choices;
    if (option.choices) {
      choiceValue.replaceChildren(...Object.entries(option.choices).map(([value, name]) => element("option", name, { value })));
      choiceValue.value = option.sample;
    }
    textValue.value = option.sample;
  }

  function renderApplied() {
    entries.replaceChildren();
    try {
      const params = parseExtraQuery(rawInput.value);
      for (const [key, value] of params) {
        const item = element("div", undefined, { class: "rpgup-option-entry" });
        item.append(element("code", value ? `${key}=${key === "password" ? "••••" : value}` : key));
        const remove = button("Remover", "fa-xmark", { "aria-label": `Remover parâmetro ${key}` });
        tooltip(remove, `Remover ${key} (a alteração só será aplicada após salvar)`);
        remove.addEventListener("click", () => {
          const next = new URLSearchParams(rawInput.value);
          next.delete(key);
          rawInput.value = next.toString();
          rawInput.dispatchEvent(new Event("input", { bubbles: true }));
        });
        item.append(remove);
        entries.append(item);
      }
      add.disabled = false;
    } catch {
      entries.textContent = "Campo manual inválido. Corrija os parâmetros antes de usar o assistente.";
      add.disabled = true;
    }
  }
  selector.addEventListener("change", setSelected);
  rawInput.addEventListener("input", renderApplied);
  add.addEventListener("click", () => {
    const key = selector.value;
    const option = VDO_OPTIONS[key];
    const value = option.flag ? "" : option.choices ? choiceValue.value : textValue.value.trim();
    try {
      const params = parseExtraQuery(rawInput.value);
      params.set(key, value);
      parseExtraQuery(params.toString());
      rawInput.value = params.toString();
      rawInput.dispatchEvent(new Event("input", { bubbles: true }));
      info.textContent = `${key} preparado no campo abaixo. Clique em Salvar configuração para aplicar.`;
    } catch (error) {
      info.textContent = error.message;
    }
  });
  preview.append(field("Opção oficial do VDO.Ninja", selector, "Escolha um parâmetro e veja sua explicação nesta tela ou passando o mouse."), field("Valor", textValue, "Informe apenas o valor; não inclua & ou =."), field("Valor", choiceValue, "Escolha um valor compatível."), add);
  root.append(preview, info, entries);
  setSelected();
  renderApplied();
  return root;
}
