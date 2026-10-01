import { avatarSource } from "./urls.js";

// VDO's avatar images use crossOrigin=Anonymous. Foundry assets often have no
// CORS headers. Read the static image as the Foundry client and give the official
// avatar parameter a small self-contained raster, without changing media tracks.
export async function prepareAvatar(user, prefs, { signal, baseURL = location.href } = {}) {
  const source = avatarSource(user, prefs, baseURL);
  if (!source || source === "default") return { value: source, source };
  const response = await fetch(source, { credentials: "same-origin", cache: "no-store", signal });
  if (!response.ok) throw new Error(`Avatar: não foi possível carregar a imagem (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Avatar: o endereço não devolveu uma imagem. Confira a imagem do usuário Foundry.");
  if (blob.size > 10 * 1024 * 1024) throw new Error("Avatar: use uma imagem menor que 10 MB.");
  const objectURL = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectURL;
    await image.decode();
    signal?.throwIfAborted();
    const canvas = document.createElement("canvas");
    // Keep the full URL below common request-line limits; URL-encoding counts too.
    for (const edge of [256, 192, 128, 96, 64, 32]) {
      const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.6, 0.4]) {
        const value = canvas.toDataURL("image/webp", quality);
        if (encodeURIComponent(value).length <= 6000) return { value, source };
      }
    }
    throw new Error("Avatar: não foi possível preparar uma miniatura da imagem.");
  } finally {
    URL.revokeObjectURL(objectURL);
  }
}
