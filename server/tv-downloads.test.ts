import test, { after, afterEach, before, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { pool } from "./db";
import { registerTVDownloadRoutes } from "./tv-downloads";

let directory: string;
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "tv-download-tests-"));
  await writeFile(path.join(directory, "BrightboardTV-source.zip"), "public-source-fixture");
});
after(async () => { await rm(directory, { recursive: true, force: true }); await pool.end(); });
afterEach(() => mock.restoreAll());

async function fixture() {
  const queries: { sql: string; params?: any[] }[] = [];
  mock.method(pool, "query", (async (sql: string, params?: any[]) => {
    queries.push({ sql, params });
    if (sql.startsWith("SELECT count")) return { rows: [{ requests: 1, served: 1, failed: 0, incomplete: 0, today: 1, source: 1, prebuilt: 0 }] };
    if (sql.startsWith("SELECT id")) return { rows: [] };
    return { rows: [] };
  }) as any);
  const app = express();
  registerTVDownloadRoutes(app, (req, res, next) => {
    if (req.get("X-Test-Role") !== "founder") { res.sendStatus(req.get("X-Test-Role") ? 403 : 401); return; }
    next();
  }, directory, async () => ({ available: true, total: 0, checkedAt: new Date().toISOString(), assets: [] }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  return { queries, base: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>(resolve => {
    server.close(() => resolve()); server.closeAllConnections();
  }) };
}

test("anonymous source download records a started and fully served response", async () => {
  const f = await fixture();
  try {
    const response = await fetch(`${f.base}/api/brightboardtv/download/source`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-disposition")!, /attachment.*BrightboardTV-source.zip/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(await response.text(), "public-source-fixture");
    await new Promise(resolve => setImmediate(resolve));
    const insert = f.queries.find(q => q.sql.startsWith("INSERT"));
    assert.equal(insert?.params?.[1], "source");
    assert.equal(f.queries.find(q => q.sql.startsWith("UPDATE"))?.params?.[1], "served");
    assert.equal(f.queries.some(q => /ip_address|user_agent|email/.test(q.sql)), false);
  } finally { await f.close(); }
});

test("HEAD probes do not count downloads", async () => {
  const f = await fixture();
  try {
    const response = await fetch(`${f.base}/api/brightboardtv/download/source`, { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.equal(f.queries.length, 0);
  } finally { await f.close(); }
});

test("unknown package and missing release return explicit errors without recording downloads", async () => {
  const f = await fixture();
  try {
    assert.equal((await fetch(`${f.base}/api/brightboardtv/download/private`)).status, 404);
    assert.equal((await fetch(`${f.base}/api/brightboardtv/download/prebuilt`)).status, 503);
    assert.equal(f.queries.length, 0);
  } finally { await f.close(); }
});

test("owner report applies its authorization middleware before querying records", async () => {
  const f = await fixture();
  try {
    assert.equal((await fetch(`${f.base}/api/owner/tv-downloads`)).status, 401);
    assert.equal((await fetch(`${f.base}/api/owner/tv-downloads`, { headers: { "X-Test-Role": "applicant" } })).status, 403);
    assert.equal(f.queries.length, 0);
    const response = await fetch(`${f.base}/api/owner/tv-downloads?page=2`, { headers: { "X-Test-Role": "founder" } });
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.totals.served, 1);
    assert.equal(report.page, 2);
    assert.deepEqual(f.queries.find(q => q.sql.startsWith("SELECT id"))?.params, [25, 25]);
  } finally { await f.close(); }
});

test("invalid pagination is rejected", async () => {
  const f = await fixture();
  try {
    const response = await fetch(`${f.base}/api/owner/tv-downloads?page=-1`, { headers: { "X-Test-Role": "founder" } });
    assert.equal(response.status, 400);
    assert.equal(f.queries.length, 0);
  } finally { await f.close(); }
});

test("download accounting failure does not return a ZIP and falsely claim it was tracked", async () => {
  const f = await fixture();
  mock.method(pool, "query", (async () => { throw new Error("test database unavailable"); }) as any);
  try {
    const response = await fetch(`${f.base}/api/brightboardtv/download/source`);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /temporarily unavailable/);
  } finally { await f.close(); }
});
