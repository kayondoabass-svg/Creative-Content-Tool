import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createTvRelay } from "./relay";
import { initialState, blankPage } from "../src/types";

test("pairing, controller approval, note privacy, commands and revocation", async () => {
  const service = createTvRelay(), app = express();
  app.use(express.json({ limit: "13mb" }));
  app.use("/api/tv", service.router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/tv`;
  async function request(path: string, method = "GET", body?: any, key?: string, expected = 200) {
    const response = await fetch(base + path, {
      method, headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
  }
  try {
    const state = initialState();
    state.lesson.pages[0].notes = "Confidential presenter-only note";
    state.lesson.pages.push(blankPage("Second page"));
    const host = await request("/sessions", "POST", { state }, undefined, 201);
    const prefix = `/sessions/${host.id}`;
    await request(prefix + "/state", "GET", undefined, undefined, 401);
    await request(prefix + "/join", "POST", { code: "000000", name: "Intruder", role: "controller" }, undefined, 403);
    const remote = await request(prefix + "/join", "POST", { code: host.joinCode, name: "Phone", role: "controller" }, undefined, 201);
    assert.equal(remote.status, "pending");
    await request(prefix + "/state", "GET", undefined, remote.key, 202);
    await request(prefix + "/command", "POST", { type: "next" }, remote.key, 202);
    await request(prefix + `/peers/${remote.peerId}`, "POST", { approved: true }, host.hostKey);
    const remoteView = await request(prefix + "/state", "GET", undefined, remote.key);
    assert.match(JSON.stringify(remoteView), /Confidential presenter-only note/);
    assert.ok(!JSON.stringify(remoteView).includes(host.hostKey));
    const display = await request(prefix + "/join", "POST", { code: host.joinCode, name: "Audience", role: "display" }, undefined, 201);
    const displayView = await request(prefix + "/state", "GET", undefined, display.key);
    assert.ok(!JSON.stringify(displayView).includes("Confidential presenter-only note"));
    assert.ok(!("peers" in displayView));
    await request(prefix + "/command", "POST", { type: "next" }, display.key, 403);
    await request(prefix, "DELETE", undefined, remote.key, 403);
    await request(prefix + "/rotate", "POST", undefined, remote.key, 403);
    await request(prefix + "/command", "POST", { type: "next" }, remote.key);
    assert.equal((await request(prefix + "/state", "GET", undefined, display.key)).state.pageIndex, 1);
    await request(prefix + "/command", "POST", { type: "page", index: 20 }, remote.key, 400);
    await request(prefix + "/command", "POST", { type: "pointer", x: 2, y: 0, visible: true }, remote.key, 400);
    await request(prefix + "/command", "POST", { type: "blank" }, remote.key);
    assert.equal((await request(prefix + "/state", "GET", undefined, display.key)).state.blank, true);
    await request(prefix + "/command", "POST", { type: "timer", seconds: 60, running: true }, remote.key);
    assert.equal((await request(prefix + "/state", "GET", undefined, display.key)).state.timer.running, true);
    const rotated = await request(prefix + "/rotate", "POST", undefined, host.hostKey);
    assert.match(rotated.joinCode, /^\d{6}$/);
    await request(prefix + `/peers/${remote.peerId}`, "POST", { approved: false }, host.hostKey);
    await request(prefix + "/state", "GET", undefined, remote.key, 401);
    const other = await request("/sessions", "POST", { state }, undefined, 201);
    await request(`/sessions/${other.id}/state`, "GET", undefined, host.hostKey, 401);
    await request(prefix, "DELETE", undefined, host.hostKey);
    await request(prefix + "/state", "GET", undefined, display.key, 404);
  } finally {
    service.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("expired sessions, unsafe assets and cross-origin requests fail explicitly", async () => {
  let clock = 1000;
  const service = createTvRelay({ now: () => clock, ttl: 1000 }), app = express();
  app.use(express.json());
  app.use("/api/tv", service.router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/tv`;
  const state = initialState();
  try {
    const create = await fetch(base + "/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
    const host = await create.json();
    clock = 2001;
    const expired = await fetch(`${base}/sessions/${host.id}/state`, { headers: { Authorization: `Bearer ${host.hostKey}` } });
    assert.equal(expired.status, 404);
    state.lesson.pages[0].model = { src: "javascript:alert(1)", name: "Bad", attribution: "", license: "", hotspots: [] };
    const bad = await fetch(base + "/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
    assert.equal(bad.status, 400);
    const cross = await fetch(base + "/sessions", { method: "POST", headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" }, body: "{}" });
    assert.equal(cross.status, 403);
  } finally {
    service.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
