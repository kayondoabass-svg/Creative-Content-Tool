import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import { once } from "node:events";
import { afroaiSessionGuard } from "./afroaiSessionGuard";
import { registerAfroSessionRoutes } from "./afroaiSessionRoutes";
import { afroaiListSessions } from "./afroaiAuthService";
import { createTvRelay } from "../packages/brightboard-tv/server/relay";
import { initialState, blankPage } from "../packages/brightboard-tv/src/types";

test("device management enforces ownership, provider success, and live revocation across browsers", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.AFRO_AUTH_SECRET_KEY;
  process.env.AFRO_AUTH_SECRET_KEY = "fixture-server-secret";
  const active = new Set(["first", "second", "foreign"]);
  let failDelete = false;
  let ignoreDelete = false;
  let failLogoutAll = false;
  let failVerify = false;
  let failList = false;
  const calls: { path: string; method: string; bearer: string | undefined; body: unknown }[] = [];
  const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status });
  globalThis.fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    const bearer = (init?.headers as Record<string, string>)?.Authorization?.replace("Bearer ", "");
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method: init?.method || "GET", bearer, body });
    if (path.endsWith("/sessions/verify")) {
      if (failVerify) return json({ error: "unavailable" }, 503);
      return json({
        valid: active.has(body.token.replace("fixture-token-", "")),
        user: { email: "teacher@example.com" },
      });
    }
    assert.ok(bearer === "fixture-token-first" || bearer === "fixture-token-second");
    if (!active.has(bearer!.replace("fixture-token-", ""))) return json({ error: "revoked" }, 401);
    if (path.endsWith("/sessions") && init?.method === "GET") {
      if (failList) return json({ sessions: "malformed", token: "private" });
      return json({ sessions: [...active].filter(id => id !== "foreign").map(id => ({
        id, current: `fixture-token-${id}` === bearer, userAgent: "Fixture browser",
        createdAt: "2026-10-24T10:00:00Z", token: "private-provider-field",
      })), token: bearer });
    }
    if (init?.method === "DELETE") {
      if (failDelete) return json({ error: "denied" }, 403);
      if (!ignoreDelete) active.delete(decodeURIComponent(path.split("/").at(-1)!));
      return new Response(null, { status: 204 });
    }
    if (path.endsWith("/logout-all")) {
      assert.deepEqual(body, {});
      if (failLogoutAll) return json({ error: "outage" }, 503);
      active.delete("first");
      active.delete("second");
      return json({ success: true });
    }
    throw new Error("Unexpected provider call");
  };
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "fixture-local-secret", resave: false, saveUninitialized: false }));
  // Fixture-only login: no test route is added to the real app.
  app.post("/fixture/:token", (req, res) => {
    const local = req.session as any;
    local.userId = "teacher-id";
    local.afroaiEmail = "teacher@example.com";
    if (req.params.token !== "legacy") local.afroaiToken = `fixture-token-${req.params.token}`;
    res.json({ ok: true });
  });
  let entitlementLookups = 0;
  const tvRelay = createTvRelay({ hostedLibrary: true, pageLimitForRequest: async req => {
    entitlementLookups++;
    return (req.session as any)?.userId ? 20 : 10;
  } });
  // Match production ordering: the TV relay precedes registerRoutes' guard.
  app.post("/api/tv/sessions", afroaiSessionGuard);
  app.use("/api/tv", tvRelay.router);
  app.use("/api", afroaiSessionGuard);
  registerAfroSessionRoutes(app);
  app.get("/api/protected", (_req, res) => res.json({ protected: true }));
  app.get("/fixture/local", (req, res) => res.json({ signedIn: Boolean((req.session as any).userId) }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const call = (path: string, cookie = "", method = "GET", body?: object) => originalFetch(base + path, {
    method, headers: { Cookie: cookie, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const login = async (token: string) => (await call(`/fixture/${token}`, "", "POST")).headers.get("set-cookie")!.split(";")[0];
  const first = await login("first");
  const second = await login("second");
  const secondTv = await login("second");
  const legacy = await login("legacy");
  const createTv = (cookie = "", pages = 20) => {
    const state = initialState();
    state.lesson.pages = Array.from({ length: pages }, (_, i) => blankPage(`Page ${i}`));
    return call("/api/tv/sessions", cookie, "POST", { state });
  };
  let paidRoom: { id: string; joinCode: string };
  try {
    await t.test("production TV middleware order verifies paid creation and preserves guest/legacy use", async () => {
      const paid = await createTv(secondTv);
      assert.equal(paid.status, 201);
      paidRoom = await paid.json();
      assert.equal((await createTv("", 20)).status, 403);
      assert.equal((await createTv("", 10)).status, 201);
      assert.equal((await createTv(legacy)).status, 201);
    });
    await t.test("signed-out access rejected; legacy listing and mutations preserve local session", async () => {
      assert.equal((await call("/api/auth/sessions")).status, 401);
      const result = await (await call("/api/auth/sessions", legacy)).json();
      assert.equal(result.supported, false);
      assert.match(result.message, /Google or older local/);
      assert.equal((await call("/api/auth/logout-all", legacy, "POST", { confirm: true })).status, 409);
      assert.equal((await call("/api/auth/sessions/first", legacy, "DELETE")).status, 409);
      assert.equal((await (await call("/fixture/local", legacy)).json()).signedIn, true);
    });
    await t.test("safe list and correct user-token GET; malformed lists fail explicitly", async () => {
      const result = await (await call("/api/auth/sessions", first)).json();
      assert.equal(result.sessions.length, 2);
      assert.equal(result.sessions[0].current, true);
      assert.ok(!JSON.stringify(result).includes("private"));
      const list = calls.find(c => c.path.endsWith("/sessions") && c.method === "GET")!;
      assert.equal(list.bearer, "fixture-token-first");
      assert.equal(list.body, undefined);
      failList = true;
      assert.equal((await call("/api/auth/sessions", first)).status, 503);
      failList = false;
    });
    await t.test("foreign IDs never reach DELETE; provider errors and no-op deletes never claim success", async () => {
      const count = calls.filter(c => c.method === "DELETE").length;
      assert.equal((await call("/api/auth/sessions/foreign", first, "DELETE")).status, 404);
      assert.equal(calls.filter(c => c.method === "DELETE").length, count);
      failDelete = true;
      assert.equal((await call("/api/auth/sessions/second", first, "DELETE")).status, 403);
      failDelete = false;
      ignoreDelete = true;
      assert.equal((await call("/api/auth/sessions/second", first, "DELETE")).status, 503);
      ignoreDelete = false;
      assert.equal(active.has("second"), true);
    });
    await t.test("revoked second browser loses protected API access and clears its cookie", async () => {
      assert.equal((await call("/api/protected", second)).status, 200);
      const result = await call("/api/auth/sessions/second", first, "DELETE");
      assert.deepEqual(await result.json(), { success: true, signedOut: false });
      const before = entitlementLookups;
      const tvDenied = await createTv(secondTv);
      assert.equal(tvDenied.status, 401);
      assert.equal(entitlementLookups, before, "revoked TV request never reaches paid entitlement lookup");
      assert.match(tvDenied.headers.get("set-cookie")!, /connect.sid=;/);
      // A distinct still-revoked cookie must not interfere with public pairing.
      const join = await call(`/api/tv/sessions/${paidRoom.id}/join`, second, "POST", {
        code: paidRoom.joinCode, name: "Public display", role: "display",
      });
      assert.equal(join.status, 201);
      const denied = await call("/api/protected", second);
      assert.equal(denied.status, 401);
      assert.match(denied.headers.get("set-cookie")!, /connect.sid=;/);
      assert.equal((await call("/api/protected", first)).status, 200);
    });
    await t.test("verification outage fails closed without destroying local session", async () => {
      failVerify = true;
      assert.equal((await call("/api/protected", first)).status, 503);
      const before = entitlementLookups;
      assert.equal((await createTv(first)).status, 503);
      assert.equal(entitlementLookups, before);
      assert.equal((await (await call("/fixture/local", first)).json()).signedIn, true);
      failVerify = false;
    });
    await t.test("explicit sign-out-all confirmation required; provider failure preserves local session", async () => {
      assert.equal((await call("/api/auth/logout-all", first, "POST", {})).status, 400);
      failLogoutAll = true;
      assert.equal((await call("/api/auth/logout-all", first, "POST", { confirm: true })).status, 503);
      assert.equal((await (await call("/fixture/local", first)).json()).signedIn, true);
      failLogoutAll = false;
    });
    await t.test("sign-out-all clears current browser and denies another local session for the same token", async () => {
      const duplicate = await login("first");
      const result = await call("/api/auth/logout-all", first, "POST", { confirm: true });
      assert.deepEqual(await result.json(), { success: true, signedOut: true });
      assert.match(result.headers.get("set-cookie")!, /connect.sid=;/);
      assert.equal((await call("/api/protected", duplicate)).status, 401);
      assert.equal((await (await call("/fixture/local", legacy)).json()).signedIn, true);
    });
    await t.test("revoking the current token clears its local session too", async () => {
      active.add("first");
      const current = await login("first");
      const result = await call("/api/auth/sessions/first", current, "DELETE");
      assert.deepEqual(await result.json(), { success: true, signedOut: true });
      assert.match(result.headers.get("set-cookie")!, /connect.sid=;/);
    });
    await t.test("token-shaped IDs and provider secrets never pass list serialization", async () => {
      globalThis.fetch = async () => json({ sessions: [{ id: "header.payload.signature" }] });
      assert.equal((await afroaiListSessions("first")).ok, false);
      globalThis.fetch = async () => json({ sessions: [{ id: "first" }] });
      assert.equal((await afroaiListSessions("first")).ok, false);
    });
  } finally {
    globalThis.fetch = originalFetch;
    tvRelay.close();
    if (originalSecret === undefined) delete process.env.AFRO_AUTH_SECRET_KEY;
    else process.env.AFRO_AUTH_SECRET_KEY = originalSecret;
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
