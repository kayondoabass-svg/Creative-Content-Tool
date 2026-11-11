import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const root = "client/public/fonts";
const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8"));

test("all 26 font families have local assets and redistribution licences", () => {
  assert.equal(manifest.families.length, 26);
  for (const family of manifest.families) {
    const slug = family.toLowerCase().replace(/[^a-z0-9]/g, "");
    assert.ok(existsSync(`${root}/licenses/${slug}.txt`), family);
  }
  for (const file of manifest.files) {
    const bytes = readFileSync(`${root}/${file.filename}`);
    assert.equal(bytes.length, file.bytes);
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
    assert.ok(file.filename.startsWith(createHash("sha256").update(bytes).digest("hex").slice(0, 24)));
  }
});

test("local font CSS retains subset rules and resolves every file without a CDN", () => {
  for (const [folder, names] of [
    [root, ["interface", "editor"]],
    ["dist/public/fonts", ["interface", "editor"]],
  ] as const) {
    for (const name of names) {
      const css = readFileSync(`${folder}/${name}.css`, "utf8");
      assert.doesNotMatch(css, /https?:\/\//);
      assert.match(css, /font-display:\s*swap/);
      assert.match(css, /unicode-range:/);
      for (const match of css.matchAll(/url\('\/fonts\/([^']+)'\)/g)) {
        assert.ok(existsSync(`${folder}/${match[1]}`), match[1]);
      }
    }
  }
});

test("main entry points neither load nor preconnect to Google Fonts", () => {
  for (const name of ["client/index.html", "client/src/index.css", "dist/public/index.html"]) {
    assert.doesNotMatch(readFileSync(name, "utf8"), /fonts\.googleapis\.com|fonts\.gstatic\.com/, name);
  }
});
