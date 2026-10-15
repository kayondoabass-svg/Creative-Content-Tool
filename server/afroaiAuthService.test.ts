import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  afroaiSignup, afroaiLogin, afroaiVerifySession, afroaiSendVerification,
  afroaiForgotPassword, afroaiLogout, matchesAfroEmail,
} from "./afroaiAuthService";
import { afroaiSessionGuard } from "./afroaiSessionGuard";

const originalFetch = globalThis.fetch;
const originalEnv = {
  AFRO_AUTH_SECRET_KEY: process.env.AFRO_AUTH_SECRET_KEY,
  AFROAI_AUTH_API_SECRET: process.env.AFROAI_AUTH_API_SECRET,
  AFRO_AUTH_PROJECT_SLUG: process.env.AFRO_AUTH_PROJECT_SLUG,
};
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function provider(data: object, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init! });
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
  return calls;
}

test("canonical signup sends names and never exposes a legacy signup token", async () => {
  process.env.AFRO_AUTH_PROJECT_SLUG = "test-project";
  const calls = provider({ token: "never-a-signup-session", verificationRequired: true }, 201);
  const result = await afroaiSignup("teacher@example.com", "example-password", "Test", "Teacher");
  assert.equal(calls[0].url, "https://afroaigroup.com/cf-auth/v1/t/test-project/signup");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), {
    email: "teacher@example.com", password: "example-password", firstName: "Test", lastName: "Teacher",
  });
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined);
  assert.equal(calls[0].init.redirect, "error");
  assert.ok(calls[0].init.signal);
  assert.equal(result.token, undefined);
  assert.equal(result.verificationRequired, true);
});

test("login needs an actual token and rejects an explicitly unconfirmed account", async () => {
  provider({ message: "ok" });
  assert.equal((await afroaiLogin("teacher@example.com", "example-password")).ok, false);
  provider({ token: "test-token", user: { emailVerified: false } });
  const unconfirmed = await afroaiLogin("teacher@example.com", "example-password");
  assert.equal(unconfirmed.ok, false);
  assert.equal(unconfirmed.verificationRequired, true);
});

test("confirmation rejection is recognized without trusting arbitrary error text", async () => {
  provider({ message: "Please confirm your email address", diagnostic: "private-value" }, 403);
  const result = await afroaiLogin("teacher@example.com", "example-password");
  assert.equal(result.verificationRequired, true);
  assert.equal(JSON.stringify(result).includes("private-value"), false);
});

test("server verification uses the new secret name and never sends it in JSON", async () => {
  process.env.AFRO_AUTH_SECRET_KEY = "test-new-secret";
  process.env.AFROAI_AUTH_API_SECRET = "test-legacy-secret";
  const calls = provider({ valid: true, user: { email: "teacher@example.com" } });
  const result = await afroaiVerifySession("user-session");
  assert.equal(calls[0].url, "https://afroaigroup.com/cf-auth/v1/sessions/verify");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-new-secret");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { token: "user-session" });
  assert.equal(matchesAfroEmail(result, "Teacher@Example.com"), true);
  assert.equal(matchesAfroEmail(result, "different@example.com"), false);
});

test("existing secret environment name remains compatible", async () => {
  delete process.env.AFRO_AUTH_SECRET_KEY;
  process.env.AFROAI_AUTH_API_SECRET = "test-legacy-secret";
  const calls = provider({ valid: false });
  await afroaiVerifySession("user-session");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-legacy-secret");
});

test("missing secret fails closed without calling the provider", async () => {
  delete process.env.AFRO_AUTH_SECRET_KEY;
  delete process.env.AFROAI_AUTH_API_SECRET;
  const calls = provider({});
  const result = await afroaiVerifySession("user-session");
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(calls.length, 0);
});

test("HTTP failure cannot be treated as successful verification", async () => {
  process.env.AFRO_AUTH_SECRET_KEY = "test-secret";
  provider({ valid: true, user: { email: "teacher@example.com" } }, 401);
  assert.equal(matchesAfroEmail(await afroaiVerifySession("user-session"), "teacher@example.com"), false);
});

test("non-JSON provider errors and timeouts fail safely without logging secrets", async () => {
  globalThis.fetch = async () => new Response("<html>gateway unavailable</html>", { status: 502 });
  assert.equal((await afroaiLogin("teacher@example.com", "example-password")).ok, false);
  globalThis.fetch = async () => { throw new DOMException("test abort", "TimeoutError"); };
  assert.equal((await afroaiLogin("teacher@example.com", "example-password")).status, 503);
});

test("confirmation, recovery, and logout use the tenant endpoints and correct credential types", async () => {
  const calls = provider({ success: true });
  await afroaiSendVerification("teacher@example.com");
  await afroaiForgotPassword("teacher@example.com");
  await afroaiLogout("user-session");
  assert.ok(calls[0].url.endsWith("/send-verification"));
  assert.ok(calls[1].url.endsWith("/forgot-password"));
  assert.deepEqual(JSON.parse(calls[1].init.body as string), { email: "teacher@example.com" });
  assert.ok(calls[2].url.endsWith("/logout"));
  assert.equal((calls[2].init.headers as Record<string, string>).Authorization, "Bearer user-session");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined);
});

function guardContext(path = "/generate") {
  let destroyed = false, continued = false, status = 200, payload: unknown;
  const req = {
    path,
    session: {
      userId: "local-user",
      afroaiToken: "user-session",
      afroaiEmail: "teacher@example.com",
      destroy: (cb: () => void) => { destroyed = true; cb(); },
    },
  };
  const res = {
    status: (value: number) => { status = value; return res; },
    json: (value: unknown) => { payload = value; return res; },
    clearCookie: () => res,
  };
  return { req, res, next: () => { continued = true; }, state: () => ({ destroyed, continued, status, payload }) };
}

test("protected operations reject revoked sessions, not only /auth/me", async () => {
  process.env.AFRO_AUTH_SECRET_KEY = "test-secret";
  provider({ valid: false });
  const ctx = guardContext();
  await afroaiSessionGuard(ctx.req as any, ctx.res as any, ctx.next);
  assert.equal(ctx.state().status, 401);
  assert.equal(ctx.state().destroyed, true);
  assert.equal(ctx.state().continued, false);
});

test("provider outage denies protected operations but retains the local session for retry", async () => {
  process.env.AFRO_AUTH_SECRET_KEY = "test-secret";
  provider({}, 503);
  const ctx = guardContext();
  await afroaiSessionGuard(ctx.req as any, ctx.res as any, ctx.next);
  assert.equal(ctx.state().status, 503);
  assert.equal(ctx.state().destroyed, false);
  assert.equal(ctx.state().continued, false);
});

test("verified identity must match the local profile before an operation runs", async () => {
  process.env.AFRO_AUTH_SECRET_KEY = "test-secret";
  provider({ valid: true, user: { email: "teacher@example.com" } });
  const valid = guardContext();
  await afroaiSessionGuard(valid.req as any, valid.res as any, valid.next);
  assert.equal(valid.state().continued, true);
  provider({ valid: true, user: { email: "someone-else@example.com" } });
  const mismatch = guardContext();
  await afroaiSessionGuard(mismatch.req as any, mismatch.res as any, mismatch.next);
  assert.equal(mismatch.state().status, 401);
});

test("login and logout remain accessible with a revoked existing token", async () => {
  const calls = provider({ valid: false });
  for (const path of ["/auth/login", "/auth/logout", "/auth/forgot-password"]) {
    const ctx = guardContext(path);
    await afroaiSessionGuard(ctx.req as any, ctx.res as any, ctx.next);
    assert.equal(ctx.state().continued, true);
  }
  assert.equal(calls.length, 0);
});
