import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import sharp from "sharp";

test("install icons have their declared dimensions and opaque safe backgrounds", async () => {
  const manifest = JSON.parse(await readFile("client/public/manifest.json", "utf8"));
  for (const icon of manifest.icons) {
    const image = sharp(`client/public${icon.src}`);
    const metadata = await image.metadata();
    assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes);
    const stats = await image.stats();
    assert.ok(stats.isOpaque, `${icon.src} must have an opaque background`);
  }
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  assert.equal((await sharp("client/public/og-image.png").metadata()).width, 1200);
});

test("worker cleans only owned shell caches and bypasses TV, API, and external URLs", async () => {
  const handlers = {};
  const deleted = [];
  const source = await readFile("client/public/sw.js", "utf8");
  const context = {
    URL, Response,
    self: {
      location: { origin: "https://example.com" },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: { claim() {} },
      skipWaiting() {},
    },
    caches: {
      keys: async () => ["brightboard-v1", "brightboard-shell-old", "brightboard-shell-brand-v2", "brightboardtv-v1-assets", "unrelated"],
      delete: async (name) => { deleted.push(name); },
    },
  };
  vm.runInNewContext(source, context);
  let activation;
  handlers.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted.sort(), ["brightboard-shell-old", "brightboard-v1"]);
  for (const path of ["/tv", "/tv/", "/tv/icon-192.png", "/tv-assets/a", "/api/auth/me", "https://other.example/a"]) {
    let intercepted = false;
    handlers.fetch({
      request: { method: "GET", mode: "navigate", url: new URL(path, context.self.location.origin).href },
      respondWith: () => { intercepted = true; },
    });
    assert.equal(intercepted, false, path);
  }
});
