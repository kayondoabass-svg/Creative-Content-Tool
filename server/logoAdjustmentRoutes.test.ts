import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import sharp from "sharp";
import type { GeneratedContent } from "../shared/schema";
import { registerLogoAdjustmentRoutes } from "./logoAdjustmentRoutes";

test("logo API authenticates, validates, preserves metadata, and persists exact response bytes", async () => {
  const b64 = (await sharp({ create: { width: 50, height: 50, channels: 4, background: "#ffffff" } }).png().toBuffer()).toString("base64");
  let record: GeneratedContent = { id: 1, userId: "teacher", type: "image", prompt: "test", title: "Test", createdAt: new Date(), content: JSON.stringify({ b64_json: b64, options: { logoMode: "exact" }, watermark: "brightboardapp.com" }) };
  let available = true;
  let writes = 0;
  const app = express();
  app.use(express.json());
  // Synthetic test-only session; production uses its existing session middleware.
  app.use((req: any, _res, next) => { req.session = { userId: req.headers["x-test-owner"] }; next(); });
  registerLogoAdjustmentRoutes(app, {
    async getContent() { return record; },
    async getLogoSources() { return available ? { backgrounds: [b64], logo: `data:image/png;base64,${b64}` } : undefined; },
    async updateLogoComposition(_id, _owner, content) { writes++; record = { ...record, content }; return record; },
  }, (_req, _res, next) => next());
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const post = (owner?: string, body: unknown = { logoPosition: "bottom-left", logoWidthPercent: 10, logoMarginPercent: 0 }) =>
    fetch(`http://127.0.0.1:${address.port}/api/content/1/logo`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(owner ? { "x-test-owner": owner } : {}) }, body: JSON.stringify(body),
    });
  try {
    assert.equal((await post()).status, 401);
    assert.equal((await post("another")).status, 404);
    assert.equal((await post("teacher", { logoWidthPercent: 500 })).status, 400);
    assert.equal(writes, 0);
    const response = await post("teacher");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const result = await response.json() as GeneratedContent;
    assert.equal(result.content, record.content);
    const data = JSON.parse(result.content);
    assert.equal(data.options.logoPosition, "bottom-left");
    assert.equal(data.watermark, "brightboardapp.com");
    assert.equal(data.logoSources, undefined);
    assert.equal(writes, 1);
    available = false;
    assert.equal((await post("teacher")).status, 409);
    assert.equal(writes, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
