import { CAMERA_THEMES } from "./config.js";

// Data is set by Foundry users and must be validated before entering a CSS
// selector. Never interpolate arbitrary input into the VDO iframe stylesheet.
export function foundryUserColor(user) {
  const raw = String(user?.color?.css ?? user?.color ?? "").trim();
  if (/^#[\da-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[\da-fA-F]{3}$/.test(raw)) return "#" + [...raw.slice(1)].map(c => c + c).join("");
  return "#a5a5b2";
}

const STYLES = Object.freeze({
  scifi: { radius: 4, width: 2, shadow: "inset 0 0 0 1px #8fdbff50", label: "#111d29" },
  modern: { radius: 10, width: 2, shadow: "none", label: "#191b21" },
  neon: { radius: 8, width: 2, shadow: "0 0 8px var(--rpgup-color)", label: "#101221" },
  rustic: { radius: 4, width: 3, shadow: "inset 0 0 0 1px #5d3c26", label: "#30251b" },
  fantasy: { radius: 9, width: 2, shadow: "inset 0 0 0 1px #d6b36f99", label: "#2a2018" }
});

export function themeCSS(world, users = []) {
  const theme = world?.theme ?? "modern";
  if (!Object.hasOwn(CAMERA_THEMES, theme)) throw new Error("Tema visual inválido.");
  if (theme === "none") return "";
  const style = STYLES[theme];
  const lines = [
    // .tile is the official VDO video wrapper (see VDO.Ninja showlabels docs).
    `.tile{--rpgup-color:#a5a5b2;box-sizing:border-box!important;border:${style.width}px solid var(--rpgup-color)!important;border-radius:${style.radius}px!important;box-shadow:${style.shadow}!important;transition:border-width .12s,box-shadow .12s}`,
    `.tile video{border-radius:${Math.max(0,style.radius-2)}px!important}`,
    `.tile .video-label{border-radius:5px!important;background:${style.label}!important;color:#f9f8f5!important}`
  ];
  // Reuse existing stable Stream IDs for a color on *each tile*, rather than
  // incorrectly painting all the remote participants in the viewer's color.
  for (const user of users) {
    const id = world?.slots?.[user.id];
    if (typeof id !== "string" || !/^[A-Za-z0-9_]{1,64}$/.test(id)) continue;
    const selector = [
      `.tile[data-stream-id="${id}"]`,
      `.tile[data-streamid="${id}"]`,
      `.tile:has(video[data-stream-id="${id}"])`,
      `.tile:has(video[data-streamid="${id}"])`,
      `.tile:has(video[id="${id}"])`
    ].join(",");
    lines.push(`${selector}{--rpgup-color:${foundryUserColor(user)}}`);
  }
  // VDO only produces data-speaking for streams with audio to analyse.
  // CSS alone cannot detect activity in a separate Discord call.
  if (world?.audio === "vdo") {
    lines.push('.tile:has(video[data-speaking="1"]){border-width:3px!important}');
    lines.push('.tile:has(video[data-speaking="2"]){border-width:4px!important;box-shadow:0 0 9px var(--rpgup-color)!important}');
  }
  return lines.join("");
}

export function encodeThemeCSS(css) {
  if (!css) return "";
  // Official VDO.Ninja base64css format is btoa(encodeURIComponent(css)).
  return btoa(encodeURIComponent(css));
}
