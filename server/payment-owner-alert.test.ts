import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "./db";
import { updatePaymentStatus } from "./pesapalService";

const originalFetch = globalThis.fetch;
const originalKey = process.env.AFROAI_EMAIL_API_KEY;
afterEach(() => {
  mock.restoreAll();
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.AFROAI_EMAIL_API_KEY;
  else process.env.AFROAI_EMAIL_API_KEY = originalKey;
});

// Stub database operations, never create payments or send real email in tests.
function fakePaymentStore() {
  let currentStatus = "pending";
  const conditions: { sql: string; params: unknown[] }[] = [];
  mock.method(db, "update", () => ({
    set(values: { status: string }) {
      return {
        where(condition: any) {
          conditions.push(new PgDialect().sqlToQuery(condition));
          return {
            async returning() {
              if (currentStatus === "completed") return [];
              currentStatus = values.status;
              return [{
                id: 123, orderId: "test-order", userId: "test-user",
                amount: 1250, currency: "USD", tier: "monthly",
                status: currentStatus, paymentMethod: "Card", confirmationCode: "TEST",
              }];
            },
          };
        },
      };
    },
  }) as any);
  mock.method(db, "select", () => ({
    from: () => ({ where: () => ({ limit: async () => [{
      firstName: "Test", lastName: "Teacher", email: "teacher@example.com",
    }] }) }),
  }) as any);
  process.env.AFROAI_EMAIL_API_KEY = "test-only-not-a-real-key";
  return { conditions, get status() { return currentStatus; } };
}

test("callback/IPN/recheck completion overlap sends one founder alert", async () => {
  const store = fakePaymentStore();
  let sent = 0;
  globalThis.fetch = async (_url, options) => {
    sent++;
    const body = JSON.parse(String(options?.body));
    assert.match(body.text, /USD 12\.50/);
    return new Response(JSON.stringify({ success: true, messageId: "mock-id" }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  await Promise.all([updatePaymentStatus("test-order", "completed"), updatePaymentStatus("test-order", "completed")]);
  await updatePaymentStatus("test-order", "completed");
  assert.equal(sent, 1);
  assert.equal(store.status, "completed");
  assert.ok(store.conditions.every(c => c.sql.includes('"status" <>') && c.params.includes("completed")));
});

test("pending and failed payments send no successful-payment alert", async () => {
  fakePaymentStore();
  let sent = 0;
  globalThis.fetch = async () => { sent++; throw new Error("Unexpected email"); };
  await updatePaymentStatus("test-order", "pending");
  await updatePaymentStatus("test-order", "failed");
  assert.equal(sent, 0);
});

test("email rejection never reverses or rejects a completed payment", async () => {
  const store = fakePaymentStore();
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false }), {
    headers: { "Content-Type": "application/json" },
  });
  await assert.doesNotReject(updatePaymentStatus("test-order", "completed"));
  assert.equal(store.status, "completed");
});

test("late failure cannot downgrade a completed payment", async () => {
  const store = fakePaymentStore();
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
  await updatePaymentStatus("test-order", "completed");
  await updatePaymentStatus("test-order", "failed");
  assert.equal(store.status, "completed");
});
