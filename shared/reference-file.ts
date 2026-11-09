/** Browser File.type can be empty/octet-stream. Inspect bytes, never extensions. */
export function referenceMime(header: Uint8Array) {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => header[i] === b)) return "image/png";
  if (header[0] === 255 && header[1] === 216 && header[2] === 255) return "image/jpeg";
  if (String.fromCharCode(...Array.from(header.slice(0, 4))) === "RIFF" && String.fromCharCode(...Array.from(header.slice(8, 12))) === "WEBP") return "image/webp";
  throw new Error("Please attach a valid PNG, JPG, or WebP image.");
}
