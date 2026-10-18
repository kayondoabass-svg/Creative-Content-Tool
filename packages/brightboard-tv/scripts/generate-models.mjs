import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/tv-assets/models");
await mkdir(out, { recursive: true });
const positions = [], normals = [], indices = [];
const lat = 16, lon = 24;
for (let i = 0; i <= lat; i++) for (let j = 0; j <= lon; j++) {
  const phi = Math.PI * i / lat, theta = Math.PI * 2 * j / lon;
  const v = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
  positions.push(...v); normals.push(...v);
}
for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
  const a = i * (lon + 1) + j, b = a + lon + 1;
  indices.push(a, a + 1, b, b, a + 1, b + 1);
}
const arrays = [new Float32Array(positions), new Float32Array(normals), new Uint16Array(indices)];
const binary = Buffer.concat(arrays.map(a => Buffer.from(a.buffer)));
const offset = [0, arrays[0].byteLength, arrays[0].byteLength + arrays[1].byteLength];
const colors = {
  red: [0.91, .15, .19, 1], white: [.94, .97, 1, 1], blue: [.15, .4, .94, 1],
  green: [.12, .6, .25, 1], gold: [.98, .7, .1, 1], purple: [.55, .23, .83, 1],
  shell: [.2, .8, .4, .18], cyan: [.1, .8, .9, .5], orange: [1, .4, .08, .3],
  ocean: [.15, .4, .9, .16], mantle: [.94, .4, .15, .3], core: [.98, .7, .15, .55],
  brown: [.53, .3, .15, 1], gray: [.6, .62, .65, 1], pale: [.62, .77, .9, 1],
};
function ball(name, translation, scale, color) { return { name, translation, scale, color }; }
const models = {
  "water-molecule": [ball("Oxygen", [0, 0, 0], [.7, .7, .7], "red"),
    ball("Hydrogen", [.79, .61, 0], [.4, .4, .4], "white"),
    ball("Hydrogen", [-.79, .61, 0], [.4, .4, .4], "white")],
  atom: [ball("Proton", [-.2, .1, 0], [.35, .35, .35], "red"), ball("Neutron", [.2, -.1, 0], [.35, .35, .35], "blue"),
    ball("Proton", [0, 0, .3], [.3, .3, .3], "red"), ball("Neutron", [0, .35, -.2], [.3, .3, .3], "blue"),
    ...Array.from({ length: 3 }, (_, i) => ball("Electron", [2 * Math.cos(i * Math.PI * 2 / 3), 1.1 * Math.sin(i * Math.PI * 2 / 3), .4 * Math.sin(i)], [.13, .13, .13], "gold"))],
  "plant-cell": [ball("Cell wall", [0, 0, 0], [2.6, 1.6, 1], "shell"),
    ball("Nucleus", [-1, .5, 0], [.55, .55, .55], "purple"),
    ball("Central vacuole", [.5, 0, 0], [1.1, .9, .65], "cyan"),
    ...[[-1.6, -.7, 0], [1.6, .65, 0], [1.5, -.7, 0], [-.6, -1, 0]].map(p => ball("Chloroplast", p, [.4, .22, .25], "green"))],
  "earth-layers": [ball("Crust", [0, 0, 0], [2.1, 2.1, 2.1], "ocean"), ball("Mantle", [0, 0, 0], [1.95, 1.95, 1.95], "mantle"),
    ball("Outer core", [0, 0, 0], [1.05, 1.05, 1.05], "core"), ball("Inner core", [0, 0, 0], [.55, .55, .55], "gold")],
  "solar-system": [ball("Sun", [-5, 0, 0], [.95, .95, .95], "gold"),
    ...[["Mercury", -3.7, .16, "gray"], ["Venus", -2.8, .3, "gold"], ["Earth", -1.7, .34, "blue"],
      ["Mars", -.6, .25, "red"], ["Jupiter", 1, .7, "brown"], ["Saturn", 2.7, .58, "gold"],
      ["Uranus", 4.1, .43, "cyan"], ["Neptune", 5.4, .4, "blue"]].map(([name, x, s, color]) => ball(name, [x, 0, 0], [s, s, s], color))],
};
for (const [id, parts] of Object.entries(models)) {
  const mats = Object.entries(colors);
  const gltf = {
    asset: { version: "2.0", generator: "BrightboardTV original schematic generator", copyright: "CC0-1.0" }, scene: 0,
    scenes: [{ nodes: parts.map((_, i) => i) }],
    nodes: parts.map(({ name, translation, scale, color }) => ({ name, translation, scale, mesh: mats.findIndex(([k]) => k === color) })),
    meshes: mats.map((_, material) => ({ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material }] })),
    materials: mats.map(([name, color]) => ({
      name, pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0, roughnessFactor: .7 },
      ...(color[3] < 1 ? { alphaMode: "BLEND" } : {}), doubleSided: true,
    })),
    buffers: [{ byteLength: binary.length }],
    bufferViews: arrays.map((a, i) => ({ buffer: 0, byteOffset: offset[i], byteLength: a.byteLength, target: i < 2 ? 34962 : 34963 })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: indices.length, type: "SCALAR" },
    ],
  };
  const raw = Buffer.from(JSON.stringify(gltf)), json = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)]);
  const bin = Buffer.concat([binary, Buffer.alloc((4 - binary.length % 4) % 4)]);
  const header = Buffer.alloc(12); header.write("glTF"); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942, 4);
  await writeFile(path.join(out, `${id}.glb`), Buffer.concat([header, jh, json, bh, bin]));
}
console.log(`Generated ${Object.keys(models).length} original CC0 schematic models.`);
