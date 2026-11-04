/** BrightBoard Editor — independent procedural engine (MIT).
 * No network, DOM, credentials or private BrightBoard dependencies.
 */
export const MODES = ["flow", "tree", "waves", "pattern", "mark", "sculpture"] as const;
export type Mode = typeof MODES[number];
export type Layer = {
  id: string; type: "text" | "rect" | "ellipse"; text: string;
  x: number; y: number; width: number; height: number; rotation: number;
  fill: string; opacity: number; fontSize: number; visible: boolean;
  motion: "none" | "float" | "pulse" | "slide"; amount: number;
};
export type AudioSettings = {
  enabled: boolean; waveform: "sine" | "square" | "triangle" | "sawtooth" | "noise";
  frequency: number; volume: number; bpm: number; rhythm: boolean; sequence: string;
};
export type Project = {
  format: "brightboard-media"; version: 1; title: string;
  width: number; height: number; mode: Mode; seed: number; density: number;
  background: string; primary: string; accent: string; speed: number;
  duration: number; camera: number; layers: Layer[]; audio: AudioSettings;
};
export const SAMPLE_RATE = 24000;
export function newProject(): Project {
  return {
    format: "brightboard-media", version: 1, title: "Untitled composition",
    width: 1920, height: 1080, mode: "flow", seed: 42, density: 40,
    background: "#f3f7f5", primary: "#125c60", accent: "#ffbf47",
    speed: 1, duration: 5, camera: 0.5,
    layers: [{ id: "headline", type: "text", text: "Make something bright.",
      x: 180, y: 430, width: 1500, height: 150, fontSize: 100,
      fill: "#125c60", opacity: 1, rotation: 0, visible: true, motion: "none", amount: 30 }],
    audio: { enabled: false, waveform: "sine", frequency: 220, volume: 0.15, bpm: 100, rhythm: true, sequence: "10101010" },
  };
}
function number(value: unknown, min: number, max: number, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}: expected ${min}–${max}.`);
  return value;
}
function text(value: unknown, max: number, name: string) {
  if (typeof value !== "string" || value.length > max) throw new Error(`Invalid ${name}.`);
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[], name: string): T {
  if (!choices.includes(value as T)) throw new Error(`Invalid ${name}.`);
  return value as T;
}
function color(v: unknown) {
  if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error("Colours must use six-digit hex values.");
  return v;
}
export function validateProject(input: unknown): Project {
  const v = input as Project;
  if (!v || v.format !== "brightboard-media" || v.version !== 1) throw new Error("Not a supported BrightBoard Media project.");
  const width = number(v.width, 64, 7680, "width"), height = number(v.height, 64, 7680, "height");
  if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > 34_000_000) throw new Error("Use integer dimensions up to 34 megapixels.");
  if (!Array.isArray(v.layers) || v.layers.length > 40) throw new Error("A project supports up to 40 layers.");
  const ids = new Set<string>();
  const layers = v.layers.map(l => {
    if (!l) throw new Error("Invalid layer.");
    const id = text(l.id, 80, "layer ID");
    if (!id || ids.has(id)) throw new Error("Layer IDs must be unique."); ids.add(id);
    if (typeof l.visible !== "boolean") throw new Error("Invalid layer visibility.");
    return { id, type: choice(l.type, ["text", "rect", "ellipse"], "layer type"),
      text: text(l.text, 500, "layer text"), x: number(l.x, -15360, 15360, "layer x"), y: number(l.y, -15360, 15360, "layer y"),
      width: number(l.width, 1, 15360, "layer width"), height: number(l.height, 1, 15360, "layer height"),
      rotation: number(l.rotation, -360, 360, "rotation"), fill: color(l.fill), opacity: number(l.opacity, 0, 1, "opacity"),
      fontSize: number(l.fontSize, 8, 500, "font size"), visible: l.visible,
      motion: choice(l.motion, ["none", "float", "pulse", "slide"], "layer motion"), amount: number(l.amount, 0, 1000, "motion amount") };
  });
  const a = v.audio;
  if (!a || typeof a.enabled !== "boolean" || typeof a.rhythm !== "boolean" || !/^[01]{1,16}$/.test(a.sequence)) throw new Error("Invalid audio settings.");
  return { format: "brightboard-media", version: 1, title: text(v.title, 160, "title"),
    width, height, mode: choice(v.mode, MODES, "mode"), seed: number(v.seed, 0, 2147483647, "seed"),
    density: number(v.density, 5, 100, "density"), background: color(v.background), primary: color(v.primary), accent: color(v.accent),
    speed: number(v.speed, 0.1, 4, "speed"), duration: number(v.duration, 1, 120, "duration"), camera: number(v.camera, -3.14, 3.14, "camera"),
    layers, audio: { enabled: a.enabled, waveform: choice(a.waveform, ["sine", "square", "triangle", "sawtooth", "noise"], "waveform"),
      frequency: number(a.frequency, 30, 2000, "frequency"), volume: number(a.volume, 0, 0.5, "volume"),
      bpm: number(a.bpm, 30, 240, "tempo"), rhythm: a.rhythm, sequence: a.sequence } };
}
export function random(seed: number) {
  let a = seed | 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function escapeXML(s: string) { return s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!)); }
const f = (n: number) => Number(n.toFixed(2));
/** Scene evaluation is deterministic in seed/time, so exports rerender geometry. */
export function renderSVG(p: Project, time = 0, width = p.width, height = p.height): string {
  const rng = random(p.seed), w = p.width, h = p.height, t = time * p.speed, s = Math.min(w, h);
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${p.background}"/><g fill="none" stroke="${p.primary}" stroke-width="${f(s / 600)}">`];
  if (p.mode === "flow") {
    for (let j = 0; j < p.density * 2; j++) {
      let x = rng() * w, y = rng() * h, d = `M${f(x)} ${f(y)}`;
      const phase = rng() * 6.28;
      for (let k = 0; k < 38; k++) {
        const angle = Math.sin(x / s * 3 + t * 0.2 + phase) * 2 + Math.cos(y / s * 4 - t * 0.13);
        x += Math.cos(angle) * s / 100; y += Math.sin(angle) * s / 100;
        d += `L${f(x)} ${f(y)}`;
      }
      out.push(`<path d="${d}" opacity="${f(0.12 + rng() * 0.35)}" stroke="${j % 5 === 0 ? p.accent : p.primary}"/>`);
    }
  } else if (p.mode === "tree") {
    const branch = (x: number, y: number, length: number, a: number, depth: number) => {
      const xx = x + Math.sin(a) * length, yy = y - Math.cos(a) * length;
      out.push(`<path d="M${f(x)} ${f(y)}L${f(xx)} ${f(yy)}" stroke-width="${f(depth * s / 1600)}" ${depth < 3 ? `stroke="${p.accent}"` : ""}/>`);
      if (depth > 0) { const sway = Math.sin(t * 0.7 + depth) * 0.06; branch(xx, yy, length * 0.71, a + 0.43 + sway, depth - 1); branch(xx, yy, length * 0.71, a - 0.43 + sway, depth - 1); }
    };
    branch(w / 2, h * 0.94, s * 0.24, 0, 7);
  } else if (p.mode === "waves") {
    for (let row = 0; row < p.density; row++) {
      let d = "";
      for (let i = 0; i <= 100; i++) {
        const x = i * w / 100, envelope = Math.exp(-Math.pow((x - w / 2) / w * 4, 2));
        const y = h * 0.13 + row * h * 0.75 / p.density - envelope * (Math.sin(x / s * 17 + row * 0.4 + t) + Math.cos(x / s * 7 - t * 0.6)) * s * 0.035;
        d += `${i ? "L" : "M"}${f(x)} ${f(y)}`;
      }
      out.push(`<path d="${d}" opacity=".65"/>`);
    }
  } else if (p.mode === "pattern") {
    const step = s / (4 + p.density / 10);
    for (let x = -step; x < w + step; x += step) for (let y = -step; y < h + step; y += step) {
      const n = step * (0.65 + Math.sin(t + x / s + y / s) * 0.1);
      out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(n)}" height="${f(n)}" transform="rotate(45 ${f(x + n / 2)} ${f(y + n / 2)})" stroke="${rng() > 0.7 ? p.accent : p.primary}" opacity=".3"/>`);
    }
  } else if (p.mode === "mark") {
    out.push(`<g transform="translate(${w / 2} ${h / 2}) rotate(${f(Math.sin(t * 0.3) * 12)})">`);
    for (let i = 0; i < 7; i++) out.push(`<rect x="${-s * 0.17}" y="${-s * 0.17}" width="${s * 0.34}" height="${s * 0.34}" rx="${s * 0.08}" transform="rotate(${i * 51.43})" stroke="${i % 2 ? p.accent : p.primary}" stroke-width="${s * 0.013}" opacity=".7"/>`);
    out.push("</g>");
  } else {
    // Actual perspective projection of a rotating 3D cube; depth-sort faces.
    const angle = p.camera + t * 0.3;
    const vertices = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => {
      const xx = x * Math.cos(angle) + z * Math.sin(angle), zz = z * Math.cos(angle) - x * Math.sin(angle);
      const yy = y * Math.cos(0.5) - zz * Math.sin(0.5), depth = y * Math.sin(0.5) + zz * Math.cos(0.5);
      const k = s * 0.75 / (4 + depth);
      return { x: w / 2 + xx * k, y: h / 2 + yy * k, z: depth };
    })));
    const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    faces.sort((a, b) => b.reduce((n, i) => n + vertices[i].z, 0) - a.reduce((n, i) => n + vertices[i].z, 0));
    faces.forEach((face, i) => out.push(`<polygon points="${face.map(j => `${f(vertices[j].x)},${f(vertices[j].y)}`).join(" ")}" fill="${i % 2 ? p.primary : p.accent}" fill-opacity="${0.2 + i * 0.1}" stroke="${p.primary}"/>`));
  }
  out.push("</g>");
  for (const l of p.layers.filter(l => l.visible)) {
    const phase = 2 * Math.PI * time / p.duration;
    const dx = l.motion === "slide" ? Math.sin(phase) * l.amount : 0;
    const dy = l.motion === "float" ? Math.sin(phase) * l.amount : 0;
    const scale = l.motion === "pulse" ? 1 + Math.sin(phase) * l.amount / 1000 : 1;
    out.push(`<g opacity="${l.opacity}" transform="translate(${f(l.x + dx)} ${f(l.y + dy)}) rotate(${l.rotation} ${l.width / 2} ${l.height / 2}) translate(${l.width / 2} ${l.height / 2}) scale(${f(scale)}) translate(${-l.width / 2} ${-l.height / 2})" fill="${l.fill}">`);
    if (l.type === "text") out.push(`<text x="0" y="${l.fontSize}" font-family="Arial,Helvetica,sans-serif" font-size="${l.fontSize}" font-weight="700">${escapeXML(l.text)}</text>`);
    else if (l.type === "rect") out.push(`<rect width="${l.width}" height="${l.height}" rx="${s * 0.015}"/>`);
    else out.push(`<ellipse cx="${l.width / 2}" cy="${l.height / 2}" rx="${l.width / 2}" ry="${l.height / 2}"/>`);
    out.push("</g>");
  }
  return out.join("") + "</svg>";
}
export function audioSamples(settings: AudioSettings, duration: number, sampleRate = SAMPLE_RATE): Float32Array {
  if (!Number.isFinite(duration) || duration < 0 || duration > 120 || sampleRate !== SAMPLE_RATE) throw new Error("Unsupported audio duration or sample rate.");
  const data = new Float32Array(Math.round(duration * sampleRate)), noise = random(93);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate, phase = (t * settings.frequency) % 1;
    let sample = settings.waveform === "noise" ? noise() * 2 - 1
      : settings.waveform === "square" ? (phase < 0.5 ? 1 : -1)
      : settings.waveform === "triangle" ? 1 - 4 * Math.abs(phase - 0.5)
      : settings.waveform === "sawtooth" ? 2 * phase - 1 : Math.sin(phase * 2 * Math.PI);
    let envelope = Math.min(1, t / 0.015, (duration - t) / 0.04);
    if (settings.rhythm) {
      const beat = t * settings.bpm / 60 * 2, step = Math.floor(beat) % settings.sequence.length;
      envelope *= settings.sequence[step] === "1" ? Math.min(1, (beat % 1) / 0.05) * Math.exp(-(beat % 1) * 5) : 0;
    }
    data[i] = sample * settings.volume * Math.max(0, envelope);
  }
  return data;
}
export function encodeWAV(settings: AudioSettings, duration: number): Uint8Array {
  const samples = audioSamples(settings, duration), bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
  const word = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  word(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); word(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, v)) * 32767), true));
  return bytes;
}
