export function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export function select(options, value, name) {
  const node = element("select", undefined, { name, "aria-label": name });
  for (const [key, label] of Object.entries(options)) node.append(element("option", label, { value: key }));
  node.value = value;
  return node;
}

export function field(label, control) {
  const node = element("label", undefined, { class: "rpgup-field" });
  node.append(element("span", label), control);
  return node;
}

export function report(error) {
  ui.notifications.error(error.message ?? String(error));
}
