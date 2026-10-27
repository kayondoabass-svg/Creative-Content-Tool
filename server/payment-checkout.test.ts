import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { pool } from "./db";
import { registerPaymentCheckoutRoutes } from "./payment-checkout";
import { paymentSecurityHeaders, safeCheckoutUrl } from "./payment-security";
import { activateVerifiedPayment, matchesPayment } from "./payment-verification";
import { getTierPrice } from "./pesapalService";

afterEach(() => mock.restoreAll());

test("checkout accepts only the exact HTTPS PesaPal payment frame", () => {
  assert.equal(safeCheckoutUrl("https://pay.pesapal.com/pesapaliframe/checkout"), "https://pay.pesapal.com/pesapaliframe/checkout");
  for (const url of ["http://pay.pesapal.com/pesapaliframe/a", "https://pay.pesapal.com.evil.test/pesapaliframe/a",
    "https://evil.test/", "javascript:alert(1)", "https://user@pay.pesapal.com/pesapaliframe/a",
    "https://pay.pesapal.com/other", "https://pay.pesapal.com:444/pesapaliframe/a"]) {
    assert.throws(() => safeCheckoutUrl(url));
  }
});

test("payment verification checks amount, currency, reference and tracking ID", () => {
  const payment = { order_id: "BB-test", pesapal_tracking_id: "provider-test", amount: 1500, currency: "USD" };
  const result: any = { merchantReference: "BB-test", orderTrackingId: "provider-test", amount: 15, currency: "USD" };
  assert.equal(matchesPayment(payment, result), true);
  for (const change of [{ amount: 1 }, { amount: NaN }, { currency: "UGX" },
    { merchantReference: "other" }, { orderTrackingId: "other" }]) {
    assert.equal(matchesPayment(payment, { ...result, ...change }), false);
  }
  assert.equal(getTierPrice("monthly", "FAKE"), null);
});

function activationStore(status = "completed", existing = false, legacy = false, hasCheckout = true) {
  let activations = existing ? 1 : 0, updates = 0, queued = 0;
  const client = {
    release() {},
    async query(sql: string, args: any[] = []) {
      if (sql.startsWith("SELECT * FROM payments")) return { rows: [{ id: 1, status, user_id: "teacher", tier: "monthly",
        amount: 1500, currency: "USD", order_id: "BB-test", pesapal_tracking_id: "provider-test" }] };
      if (sql.startsWith("SELECT * FROM users")) return { rows: [{ id: "teacher", email: "teacher@example.test",
        pesapal_order_tracking_id: legacy ? "provider-test" : null, subscription_ends_at: null }] };
      if (sql.startsWith("SELECT * FROM payment_activations")) return { rows: activations ? [{}] : [] };
      if (sql.startsWith("SELECT order_id FROM payment_checkouts")) return { rows: hasCheckout ? [{ order_id: "BB-test" }] : [] };
      if (sql.startsWith("UPDATE users")) updates++;
      if (sql.startsWith("INSERT INTO payment_activations")) activations++;
      if (sql.includes("INSERT INTO referral_notifications")) {
        queued++;
        assert.equal(args[1], "receipt:1");
        assert.match(args[4], /data-brightboard-email-brand/);
      }
      return { rows: [] };
    },
  };
  mock.method(pool, "connect", async () => client as any);
  return { get activations() { return activations; }, get updates() { return updates; }, get queued() { return queued; } };
}

test("repeated payment activation updates access and queues a receipt only once", async () => {
  const s = activationStore();
  assert.equal(await activateVerifiedPayment(1), true);
  assert.equal(await activateVerifiedPayment(1), true);
  assert.equal(s.activations, 1);
  assert.equal(s.updates, 1);
  assert.equal(s.queued, 1);
});

test("reversed and pending payments cannot activate access", async () => {
  for (const status of ["reversed", "pending", "failed"]) {
    const s = activationStore(status);
    assert.equal(await activateVerifiedPayment(1), false);
    assert.equal(s.updates, 0);
    assert.equal(s.queued, 0);
    mock.restoreAll();
  }
});

test("historical activation is recorded without granting another period", async () => {
  const s = activationStore("completed", false, true);
  await activateVerifiedPayment(1);
  assert.equal(s.activations, 1);
  assert.equal(s.updates, 0);
  assert.equal(s.queued, 0);
});

test("an old completed order that is no longer the latest purchase cannot grant access again", async () => {
  const s = activationStore("completed", false, false, false);
  assert.equal(await activateVerifiedPayment(1), false);
  assert.equal(s.updates, 0);
  assert.equal(s.queued, 0);
});

async function withApp(run: (base: string) => Promise<void>, provider?: Parameters<typeof registerPaymentCheckoutRoutes>[1]) {
  const app = express();
  app.use(express.json(), paymentSecurityHeaders);
  app.use((req: any, _res, next) => {
    if (req.headers["x-test-account"]) req.session = { userId: req.headers["x-test-account"] };
    next();
  });
  registerPaymentCheckoutRoutes(app, provider);
  app.get("/api/payments/history", (_req, res) => res.json({ payments: [] }));
  app.get(["/checkout", "/pricing"], (_req, res) => res.type("html").send("<!doctype html><title>BrightBoard</title>"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as any).port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test("framing headers protect responses and checkout rejects foreign or missing origins", async () => {
  await withApp(async base => {
    for (const origin of ["https://scam.example", "null", ""]) {
      const response = await fetch(`${base}/api/pesapal/checkout`, { method: "POST", headers: origin ? { Origin: origin } : {} });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
      assert.match(response.headers.get("content-security-policy")!, /frame-ancestors 'self'/);
    }
    const response = await fetch(`${base}/api/pesapal/checkout`, { method: "POST", headers: { Origin: "https://www.brightboardapp.com" } });
    assert.equal(response.status, 401);
    const checkout = await fetch(`${base}/checkout`);
    assert.match(checkout.headers.get("content-security-policy")!, /frame-src 'self' https:\/\/pay\.pesapal\.com/);
    const pricing = await fetch(`${base}/pricing`);
    assert.equal(pricing.headers.get("content-security-policy"), "frame-ancestors 'self'");
  });
});

test("payment status requires sign-in and restricts the database read to the account", async () => {
  mock.method(pool, "query", async (sql: string, args: any[]) => {
    assert.match(sql, /p\.order_id=\$1 AND p\.user_id=\$2/);
    assert.deepEqual(args, ["BB-other", "teacher"]);
    return { rows: [] } as any;
  });
  await withApp(async base => {
    const history = await fetch(`${base}/api/payments/history`);
    assert.equal(history.status, 200);
    assert.deepEqual(await history.json(), { payments: [] });
    assert.equal((await fetch(`${base}/api/payments/BB-other`)).status, 401);
    const response = await fetch(`${base}/api/payments/BB-other`, { headers: { "x-test-account": "teacher" } });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("duplicate checkout resumes the stored order without calling the provider", async () => {
  mock.method(pool, "connect", async () => ({
    release() {},
    async query(sql: string) {
      if (sql.includes("SELECT c.*,p.tier")) return { rows: [{ order_id: "BB-existing", tier: "monthly", currency: "USD" }] };
      return { rows: [] };
    },
  }) as any);
  mock.method(pool, "query", async (sql: string) => {
    if (sql.includes("SELECT p.*,c.checkout_url")) return { rows: [{ id: 1, status: "pending", tier: "monthly", amount: 1500, currency: "USD",
      creation_state: "ready", checkout_url: "https://pay.pesapal.com/pesapaliframe/test" }] } as any;
    if (sql.includes("SELECT p.status")) return { rows: [{ status: "pending" }] } as any;
    return { rows: [{ pesapal_tracking_id: "provider-test" }] } as any;
  });
  await withApp(async base => {
    const response = await fetch(`${base}/api/pesapal/checkout`, { method: "POST", headers: {
      Origin: "https://www.brightboardapp.com", "Content-Type": "application/json", "x-test-account": "teacher",
    }, body: JSON.stringify({ tier: "monthly", currency: "USD", attemptId: crypto.randomUUID() }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).orderId, "BB-existing");
  }, { isConfigured: () => true, submitOrder: async () => { throw new Error("Duplicate provider call"); } });
});

test("new order is committed before provider submission and ambiguous creation is retained", async () => {
  let committed = false, storedOrder = "", retainedUnknown = false;
  mock.method(pool, "connect", async () => ({
    release() {},
    async query(sql: string, args: any[] = []) {
      if (sql.startsWith("INSERT INTO payments")) {
        storedOrder = args[1];
        assert.match(storedOrder, /^BB-[0-9a-f-]{36}$/);
        assert.equal(args[2], 1500); // Price comes from the server, not the browser.
        return { rows: [{ id: 1 }] };
      }
      if (sql === "COMMIT") committed = true;
      return { rows: [] };
    },
  }) as any);
  mock.method(pool, "query", async (sql: string, args: any[]) => {
    if (sql.startsWith("SELECT email")) return { rows: [{ email: "teacher@example.test" }] } as any;
    assert.match(sql, /creation_state='creation_unknown'/);
    assert.equal(args[0], storedOrder);
    retainedUnknown = true;
    return { rows: [] } as any;
  });
  await withApp(async base => {
    const response = await fetch(`${base}/api/pesapal/checkout`, { method: "POST", headers: {
      Origin: "https://www.brightboardapp.com", "Content-Type": "application/json", "x-test-account": "teacher",
    }, body: JSON.stringify({ tier: "monthly", currency: "USD", amount: 0.01, userId: "another-user", attemptId: crypto.randomUUID() }) });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.orderId, storedOrder);
    assert.equal(body.url, null);
    assert.equal(retainedUnknown, true);
  }, { isConfigured: () => true, submitOrder: async params => {
    assert.equal(committed, true);
    assert.equal(params.userId, "teacher");
    assert.equal(params.amount, 15);
    assert.equal(params.merchantReference, storedOrder);
    throw new Error("Simulated provider timeout: sensitive provider body must not be returned");
  } });
});
