import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { prepareExactLogo } from "./exactLogoService";
import { registerOrganizationSettingsRoutes, PrivateOrganizationSettings, type OrganizationSettingsStore } from "./organizationSettings";
import { generateEducationalImage } from "./educationalImageService";
import type { OrganizationSettings } from "../shared/schema";
import type { Pool } from "pg";

test("settings require sign-in, isolate teachers, validate logos, and explicitly remove saved logos", async () => {
  const rows = new Map<string, OrganizationSettings>();
  const store: OrganizationSettingsStore = {
    async get(id) { return rows.get(id) ?? {}; },
    async update(id, settings) {
      const updated = { ...rows.get(id), ...settings };
      rows.set(id, updated);
      return updated;
    },
  };
  const app = express();
  app.use(express.json({ limit: "16mb" }));
  app.use((req, _res, next) => {
    // Fixture-only identity; production uses the authenticated session.
    (req as any).session = { userId: req.header("x-fixture-user") };
    next();
  });
  registerOrganizationSettingsRoutes(app, store);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const port = (server.address() as { port: number }).port;
  const request = (user?: string, body?: object) => fetch(`http://127.0.0.1:${port}/api/settings`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(user ? { "x-fixture-user": user } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  try {
    assert.equal((await request()).status, 401);
    assert.equal((await request(undefined, { logo: null })).status, 401);
    for (const logo of ["https://example.com/logo.png", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/gif;base64,R0lGODlh", "data:image/png;base64,YmFk"]) {
      assert.equal((await request("teacher-a", { logo })).status, 400);
    }
    const original = await sharp({ create: { width: 40, height: 20, channels: 4, background: { r: 250, g: 10, b: 20, alpha: 0.5 } } }).png().toBuffer();
    for (const format of ["png", "jpeg", "webp"] as const) {
      const image = await sharp(original).toFormat(format).toBuffer();
      const response = await request("teacher-a", { name: "My school", logo: `data:image/${format};base64,${image.toString("base64")}` });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      const saved = await response.json() as OrganizationSettings;
      assert.equal(saved.logo, `data:image/${format};base64,${image.toString("base64")}`);
      const meta = await sharp(Buffer.from(saved.logo!.split(",")[1], "base64")).metadata();
      assert.equal(meta.width, 40);
      assert.equal(meta.height, 20);
      if (format === "png") {
        const { data } = await sharp(Buffer.from(saved.logo!.split(",")[1], "base64")).raw().toBuffer({ resolveWithObject: true });
        assert.equal(data[3], 128);
      }
    }
    assert.deepEqual(await (await request("teacher-b")).json(), {});
    await request("teacher-b", { name: "Other school" });
    assert.equal((await (await request("teacher-a")).json()).name, "My school");
    // The selected saved bytes use the exact same compositor as local uploads.
    const { logo } = await (await request("teacher-a")).json() as OrganizationSettings;
    const base = (await sharp({ create: { width: 200, height: 100, channels: 3, background: "white" } }).png().toBuffer()).toString("base64");
    const exact = await generateEducationalImage("School poster", "", "Poster", { logoMode: "exact" }, logo!, async (_prompt, reference) => {
      assert.equal(reference, undefined);
      return { data: [{ b64_json: base }] };
    });
    assert.notEqual(exact.b64_json, base);
    const unbranded = await generateEducationalImage("No logo requested", "", "Poster", {}, undefined, async (_prompt, reference) => {
      assert.equal(reference, undefined);
      return { data: [{ b64_json: base }] };
    });
    assert.equal(unbranded.b64_json, base);
    // A valid, compressed JPEG may expand beyond upload limits as a PNG.
    const noisy = await sharp(randomBytes(3200 * 3200 * 3), { raw: { width: 3200, height: 3200, channels: 3 } }).jpeg({ quality: 70 }).toBuffer();
    assert.ok(noisy.length < 10 * 1024 * 1024);
    const largeLogo = `data:image/jpeg;base64,${noisy.toString("base64")}`;
    const decoded = await prepareExactLogo(largeLogo);
    assert.ok(decoded.length > 15 * 1024 * 1024);
    const largeResponse = await request("teacher-a", { logo: largeLogo });
    assert.equal(largeResponse.status, 200);
    const largeSaved = await largeResponse.json() as OrganizationSettings;
    assert.equal(largeSaved.logo, largeLogo);
    assert.ok(largeSaved.logo!.length < 15 * 1024 * 1024);
    assert.equal((await request("teacher-a", { logo: null })).status, 200);
    assert.deepEqual(await (await request("teacher-a")).json(), { name: "My school", logo: null });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("database settings persist across store instances with owner-scoped queries", async () => {
  const rows = new Map<string, OrganizationSettings>();
  const pool = { async query(sql: string, params?: string[]) {
    if (sql.startsWith("CREATE TABLE")) return { rows: [] };
    assert.ok(params?.[0]);
    const id = params![0];
    if (sql.startsWith("INSERT")) {
      assert.match(sql, /ON CONFLICT\(user_id\)/);
      rows.set(id, { ...rows.get(id), ...JSON.parse(params![1]) });
      return { rows: [{ settings: rows.get(id) }] };
    }
    assert.match(sql, /WHERE user_id=\$1/);
    return { rows: rows.has(id) ? [{ settings: rows.get(id) }] : [] };
  } } as unknown as Pool;
  const first = new PrivateOrganizationSettings(pool);
  await first.update("teacher-a", { name: "School", logo: "fixture" });
  const afterRestart = new PrivateOrganizationSettings(pool);
  assert.equal((await afterRestart.get("teacher-a")).logo, "fixture");
  assert.deepEqual(await afterRestart.get("teacher-b"), {});
  await afterRestart.update("teacher-a", { logo: null });
  assert.deepEqual(await first.get("teacher-a"), { name: "School", logo: null });
  await assert.rejects(first.get(""), /owner/);
});
