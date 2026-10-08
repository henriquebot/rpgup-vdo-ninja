import { element, tooltip } from "./dom.js";

/**
 * Shared compact tabs and an optional, inline guided tour. No overlays:
 * guidance lives above the selected panel so it never blocks Foundry controls.
 */
export function createIconTabs({ id, label, tabs, initial, onChange, tourSteps = [] }) {
  const root = element("div", undefined, { class: "rpgup-tabs" });
  const bar = element("div", undefined, { class: "rpgup-tab-bar", role: "tablist", "aria-label": label });
  const content = element("div", undefined, { class: "rpgup-tab-content" });
  const buttons = new Map();
  const panes = new Map();
  let active = null;
  let tourIndex = -1;
  let marked = null;

  function clearMarked() {
    marked?.classList.remove("rpgup-tour-target");
    marked = null;
  }

  function activate(key, { focus = false, fromTour = false } = {}) {
    if (!panes.has(key)) return;
    if (!fromTour && tourIndex >= 0) stopTour();
    active = key;
    for (const [tabKey, button] of buttons) {
      const selected = key === tabKey;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      panes.get(tabKey).hidden = !selected;
    }
    if (focus) buttons.get(key).focus();
    onChange?.(key);
  }

  for (const tab of tabs) {
    const trigger = element("button", undefined, {
      type: "button", class: "rpgup-tab-button", role: "tab",
      id: `${id}-tab-${tab.key}`, "aria-controls": `${id}-pane-${tab.key}`,
      "aria-label": tab.title, "aria-selected": "false"
    });
    trigger.append(element("i", undefined, { class: `fa-solid ${tab.icon}`, "aria-hidden": "true" }));
    tooltip(trigger, tab.title);
    const pane = element("section", undefined, {
      id: `${id}-pane-${tab.key}`, role: "tabpanel", class: "rpgup-tab-pane",
      "aria-labelledby": trigger.id, hidden: ""
    });
    pane.append(...tab.children);
    trigger.addEventListener("click", () => activate(tab.key));
    bar.append(trigger);
    content.append(pane);
    buttons.set(tab.key, trigger);
    panes.set(tab.key, pane);
  }

  const keys = Array.from(buttons.keys());
  bar.addEventListener("keydown", event => {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || !bar.contains(tab)) return;
    let index = keys.findIndex(key => buttons.get(key) === tab);
    if (event.key === "ArrowRight") index = (index + 1) % keys.length;
    else if (event.key === "ArrowLeft") index = (index + keys.length - 1) % keys.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = keys.length - 1;
    else return;
    event.preventDefault();
    activate(keys[index], { focus: true });
  });

  const tour = element("div", undefined, { class: "rpgup-tour", role: "region", "aria-label": "Tour guiado", hidden: "" });
  const counter = element("span", "", { class: "rpgup-tour-counter" });
  const message = element("p", "", { role: "status", "aria-live": "polite" });
  const prev = element("button", "Anterior", { type: "button", class: "rpgup-tour-prev" });
  const next = element("button", "Próximo", { type: "button", class: "rpgup-tour-next" });
  const close = element("button", "Fechar", { type: "button", class: "rpgup-tour-close" });
  const tourControls = element("div", undefined, { class: "rpgup-tour-controls" });
  tourControls.append(prev, next, close);
  tour.append(counter, message, tourControls);

  function stopTour() {
    clearMarked();
    tourIndex = -1;
    tour.hidden = true;
  }

  function showStep(index) {
    if (index >= tourSteps.length) { stopTour(); return; }
    tourIndex = Math.max(0, index);
    const step = tourSteps[tourIndex];
    activate(step.tab, { fromTour: true });
    clearMarked();
    const target = typeof step.target === "function" ? step.target() : step.target;
    if (target?.isConnected) {
      marked = target;
      marked.classList.add("rpgup-tour-target");
      target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
    counter.textContent = `${tourIndex + 1} / ${tourSteps.length}`;
    message.textContent = step.text;
    prev.disabled = tourIndex === 0;
    next.textContent = tourIndex === tourSteps.length - 1 ? "Concluir" : "Próximo";
    tour.hidden = false;
  }

  if (tourSteps.length) {
    const start = element("button", undefined, {
      type: "button", class: "rpgup-tab-button rpgup-tour-start",
      "aria-label": "Iniciar tour guiado"
    });
    start.append(element("i", undefined, { class: "fa-solid fa-compass", "aria-hidden": "true" }));
    tooltip(start, "Tour: veja como configurar a mesa passo a passo");
    start.addEventListener("click", () => showStep(0));
    bar.append(start);
  }
  prev.addEventListener("click", () => showStep(tourIndex - 1));
  next.addEventListener("click", () => showStep(tourIndex + 1));
  close.addEventListener("click", stopTour);
  root.append(bar, tour, content);
  activate(panes.has(initial) ? initial : keys[0]);

  return { root, activate, stopTour, get active() { return active; } };
}
