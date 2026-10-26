import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Preserve the approved vector paths exactly; do not redraw or regenerate them.
const source = await readFile("attached_assets/generated_images/brightboard-logo-option-1.svg", "utf8");
const paths = [...source.matchAll(/<(?:path|circle)\b[^>]*\/>/g)].map(([path]) => path);
if (paths.length !== 18) throw new Error("Unexpected approved-logo structure.");
const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const symbol = svg("22 14 40 34", paths.slice(0, 6).join(""));
const logo = svg("2 14 76 50", '<rect x="2" y="14" width="76" height="50" fill="#ffffff"/>' + paths.join(""));
await writeFile("client/public/brand-symbol.svg", symbol);
await writeFile("client/public/brand-logo.svg", logo);
await sharp(Buffer.from(logo)).resize(760).png().toFile("client/public/brand-logo.png");

for (const [name, size, padding, background] of [
  ["logo.png", 256, 12, "#ffffff00"],
  ["favicon.png", 64, 2, "#ffffff"],
  ["icon-192.png", 192, 20, "#ffffff"],
  ["icon-512.png", 512, 52, "#ffffff"],
  ["apple-touch-icon.png", 180, 18, "#ffffff"],
  ["icon-maskable-192.png", 192, 31, "#ffffff"],
  ["icon-maskable-512.png", 512, 82, "#ffffff"],
]) {
  let image = sharp(Buffer.from(symbol))
    .resize(size - padding * 2, size - padding * 2, { fit: "contain", background })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background });
  if (name !== "logo.png") image = image.flatten({ background: "#ffffff" });
  await image.png().toFile(`client/public/${name}`);
}

const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f0f7f5"/>
  <rect x="32" y="32" width="1136" height="566" rx="32" fill="white"/>
  <svg x="220" y="60" width="760" height="470" viewBox="2 14 76 50">${paths.join("")}</svg>
  <text x="600" y="556" text-anchor="middle" fill="#125c60" font-family="sans-serif" font-size="25">brightboardapp.com</text>
</svg>`;
await sharp(Buffer.from(social)).png().toFile("client/public/og-image.png");
console.log("Prepared approved BrightBoard assets; BrightboardTV assets unchanged.");
