import { test } from "node:test";
import assert from "node:assert/strict";
import { MODES, newProject, validateProject, renderSVG, encodeWAV, audioSamples } from "./engine";

test("all six procedural scenes are deterministic and valid at requested dimensions", () => {
  for (const mode of MODES) {
    const p = { ...newProject(), mode };
    const svg = renderSVG(p, 1, 3840, 2160);
    assert.equal(svg, renderSVG(p, 1, 3840, 2160));
    assert.match(svg, /width="3840" height="2160"/);
    assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|Infinity|(?:href|src)=["']https?:|<script/);
    assert.notEqual(svg, renderSVG(p, 2, 3840, 2160));
  }
});
test("project validation round-trips without private data and escapes text", () => {
  const p = newProject(); p.layers[0].text = '<script>alert("x")</script>&';
  const clean = validateProject({ ...p, secret: "never-copy-me" });
  assert.equal((clean as any).secret, undefined);
  assert.match(renderSVG(clean), /&lt;script&gt;/);
  assert.doesNotMatch(renderSVG(clean), /<script>/);
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(clean))), clean);
});
test("invalid versions, excessive allocation and injectable colours are rejected", () => {
  for (const invalid of [{ version: 2 }, { width: 9000 }, { width: 7680, height: 7680 }, { background: 'red"/><script>' }, { duration: 1000 }, { seed: NaN }]) {
    assert.throws(() => validateProject({ ...newProject(), ...invalid }));
  }
  const p = newProject(); p.layers.push({ ...p.layers[0] }); assert.throws(() => validateProject(p));
});
test("WAV is true mono PCM with bounded nonzero samples and accurate duration", () => {
  const p = newProject(), bytes = encodeWAV(p.audio, 2), view = new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WAVE");
  assert.equal(view.getUint32(24, true), 24000);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(bytes.length, 44 + 24000 * 2 * 2);
  const samples = audioSamples(p.audio, 2);
  assert.ok(samples.some(x => x !== 0)); assert.ok(samples.every(x => Math.abs(x) <= .5));
  assert.throws(() => encodeWAV(p.audio, 121));
});
