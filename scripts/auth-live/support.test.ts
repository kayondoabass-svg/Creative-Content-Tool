import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { AppClient, CheckFailure, config } from "./support";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const settings = () => ({
  AUTH_LIVE_TEST_AUTHORIZED: "dedicated-test-accounts-only",
  AFRO_AUTH_SECRET_KEY: "unit-test-not-a-real-key",
  AFRO_AUTH_PROJECT_SLUG: "unit-test",
  AUTH_LIVE_TEST_BASE_URL: "https://app.example",
  AUTH_LIVE_TEST_EMAIL: "signup@example.com",
  AUTH_LIVE_TEST_LEGACY_EMAIL: "legacy@example.com",
  AUTH_LIVE_TEST_CONTRACT_REVIEWED_ON: new Date().toISOString().slice(0, 10),
});

test("live check requires explicit account authorization, rotated key, tenant and recent contract review", () => {
  assert.equal(config(settings()).base, "https://app.example");
  for (const key of ["AUTH_LIVE_TEST_AUTHORIZED", "AFRO_AUTH_SECRET_KEY", "AFRO_AUTH_PROJECT_SLUG", "AUTH_LIVE_TEST_CONTRACT_REVIEWED_ON"]) {
    assert.throws(() => config({ ...settings(), [key]: "" }), CheckFailure);
  }
  assert.throws(() => config({ ...settings(), AUTH_LIVE_TEST_CONTRACT_REVIEWED_ON: "2020-01-01" }), CheckFailure);
  assert.throws(() => config({ ...settings(), AUTH_LIVE_TEST_CONTRACT_REVIEWED_ON: "2099-01-01" }), CheckFailure);
});

test("live check rejects unsafe target origins and requires distinct inboxes", () => {
  for (const url of ["http://app.example", "https://user:private@app.example", "https://app.example/path", "https://app.example/?token=private"]) {
    assert.throws(() => config({ ...settings(), AUTH_LIVE_TEST_BASE_URL: url }), CheckFailure);
  }
  assert.equal(config({ ...settings(), AUTH_LIVE_TEST_BASE_URL: "http://127.0.0.1:5000" }).base, "http://127.0.0.1:5000");
  assert.throws(() => config({ ...settings(), AUTH_LIVE_TEST_LEGACY_EMAIL: "signup@example.com" }), CheckFailure);
});

test("HTTP helper keeps cookies in memory and never forwards them to redirects", async () => {
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(init!);
    return new Response('{"user":null}', { headers: { "set-cookie": "connect.sid=private-cookie; HttpOnly; Secure" } });
  };
  const client = new AppClient("https://app.example");
  await client.request("/api/auth/me");
  await client.request("/api/auth/me");
  assert.equal(client.cookie, "connect.sid=private-cookie");
  assert.equal((calls[1].headers as Record<string, string>).Cookie, "connect.sid=private-cookie");
  assert.equal(calls[0].redirect, "error");
  assert.ok(calls[0].signal);
});

test("HTTP helper suppresses raw errors, non-JSON bodies and exposed credentials", async () => {
  const client = new AppClient("https://app.example");
  globalThis.fetch = async () => { throw new Error("private-password private-email-link"); };
  await assert.rejects(client.request("/api/auth/login", {}), error => error instanceof CheckFailure && !error.message.includes("private"));
  globalThis.fetch = async () => new Response("private-email-link", { status: 502 });
  await assert.rejects(client.request("/api/auth/me"), error => error instanceof CheckFailure && !error.message.includes("private"));
  globalThis.fetch = async () => new Response('{"token":"private-token"}');
  await assert.rejects(client.request("/api/auth/me"), error => error instanceof CheckFailure && !error.message.includes("private"));
});

test("rate limiting stops immediately rather than silently retrying or reporting a pass", async () => {
  let count = 0;
  globalThis.fetch = async () => { count++; return new Response("{}", { status: 429 }); };
  await assert.rejects(new AppClient("https://app.example").request("/api/auth/login", {}), /Rate limited/);
  assert.equal(count, 1);
});
