import { element, tooltip } from "./dom.js";

/**
 * Compact dock action entry next to Foundry canvas controls.
 * Only visible while docked: a floating window retains its native
 * ApplicationV2 title bar for drag, close, and window-level actions.
 */
export function createDockQuickControls({ settings, reload, undock, close }) {
  const controller = new AbortController();
  const root = element("div", undefined, {
    class: "rpgup-vdo-quick-controls",
    role: "group",
    "aria-label": "Controles do RPGUP VDO.Ninja",
    hidden: ""
  });
  const trigger = tooltip(element("button", undefined, {
    type: "button", class: "rpgup-vdo-quick-trigger",
    "aria-label": "Opções do RPGUP VDO.Ninja",
    "aria-haspopup": "menu", "aria-expanded": "false"
  }), "Configurações, reconectar, desacoplar e fechar o RPGUP VDO.Ninja");
  trigger.append(element("i", undefined, { class: "fa-solid fa-gear", "aria-hidden": "true" }));
  const menu = element("div", undefined, {
    class: "rpgup-vdo-quick-menu", role: "menu", hidden: ""
  });

  function collapse() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  const items = [
    ["Configurações da dock", "fa-sliders", settings],
    ["Recarregar sala VDO", "fa-rotate-right", reload],
    ["Desacoplar janela", "fa-up-right-from-square", undock],
    ["Fechar câmeras", "fa-xmark", close]
  ];
  const actionButtons = new Map();
  for (const [label, icon, callback] of items) {
    const item = element("button", undefined, {
      type: "button", role: "menuitem", "aria-label": label
    });
    item.append(
      element("i", undefined, { class: "fa-solid " + icon, "aria-hidden": "true" }),
      element("span", label)
    );
    item.addEventListener("click", () => {
      collapse();
      callback();
    }, { signal: controller.signal });
    actionButtons.set(label, item);
    menu.append(item);
  }

  trigger.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    trigger.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden) actionButtons.get("Configurações da dock")?.focus();
  }, { signal: controller.signal });
  document.addEventListener("pointerdown", event => {
    if (!root.contains(event.target)) collapse();
  }, { signal: controller.signal });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !menu.hidden) {
      collapse();
      trigger.focus();
    }
  }, { signal: controller.signal });

  root.append(trigger, menu);
  document.body.append(root);

  return {
    element: root,
    collapse,
    update(bounds, dock) {
      if (dock === "floating" || !bounds) {
        root.hidden = true;
        collapse();
        return;
      }
      root.hidden = false;
      const inset = 8;
      let x, y;
      if (dock === "left") {
        // The first two Foundry controls sit immediately next to the panel.
        // One additional gear is placed alongside them, not over the video.
        x = bounds.right + 80;
        y = bounds.top + 7;
      } else if (dock === "right") {
        x = bounds.left - 42;
        y = bounds.top + 7;
      } else if (dock === "top") {
        x = bounds.right - 44;
        y = bounds.bottom + 8;
      } else {
        x = bounds.right - 44;
        y = bounds.top - 42;
      }
      root.style.left = Math.max(inset, Math.min(window.innerWidth - 44, Math.round(x))) + "px";
      root.style.top = Math.max(inset, Math.min(window.innerHeight - 44, Math.round(y))) + "px";
    },
    setAttention(value) {
      trigger.classList.toggle("rpgup-attention", Boolean(value));
    },
    setReloadDisabled(value) {
      actionButtons.get("Recarregar sala VDO").disabled = Boolean(value);
    },
    destroy() {
      controller.abort();
      root.remove();
    }
  };
}
