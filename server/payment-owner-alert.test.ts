import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { pool } from "./db";
import { updatePaymentStatus } from "./pesapalService";
import { draftReferralPolicy } from "./referral-policy";

afterEach(() => mock.restoreAll());

function store() {
  let status = "pending", queued = 0, committed = 0;
  const queries: string[] = [];
  const client = {
    release() {},
    async query(sql: string, args: any[] = []) {
      queries.push(sql);
      if (sql.startsWith("UPDATE payments")) {
        if (status === "completed") return { rows: [] };
        assert.match(sql, /status<>'completed'/);
        status = args[1];
        return { rows: [{ id: 123, user_id: "test-user", order_id: "test-order", amount: 1250, currency: "USD", tier: "monthly", status }] };
      }
      if (sql.startsWith("SELECT first_name")) return { rows: [{ first_name: "Test", last_name: "Teacher", email: "teacher@example.test" }] };
      if (sql.includes("INSERT INTO referral_notifications")) {
        queued++;
        assert.equal(args[1], "payment:123");
        assert.match(args[5], /USD 12\.50/);
      }
      if (sql.startsWith("SELECT * FROM referral_policy")) return { rows: [{ config: draftReferralPolicy }] };
      if (sql === "COMMIT") committed++;
      return { rows: [] };
    },
  };
  mock.method(pool, "connect", async () => client as any);
  return { get status() { return status; }, get queued() { return queued; }, get committed() { return committed; }, queries };
}

test("repeated completed callbacks queue a single persistent founder alert", async () => {
  const s = store();
  await updatePaymentStatus("test-order", "completed");
  await updatePaymentStatus("test-order", "completed");
  assert.equal(s.queued, 1);
  assert.equal(s.status, "completed");
  assert.equal(s.committed, 2);
});
test("pending and failed payments never queue a success alert", async () => {
  const s = store();
  await updatePaymentStatus("test-order", "pending");
  await updatePaymentStatus("test-order", "failed");
  assert.equal(s.queued, 0);
});
test("provider network is not used in payment-status transaction", async () => {
  const s = store();
  mock.method(globalThis, "fetch", async () => { throw new Error("Must not send during payment commit"); });
  await assert.doesNotReject(updatePaymentStatus("test-order", "completed"));
  assert.equal(s.queued, 1);
});
test("late failure cannot downgrade a completed payment", async () => {
  const s = store();
  await updatePaymentStatus("test-order", "completed");
  await updatePaymentStatus("test-order", "failed");
  assert.equal(s.status, "completed");
  assert.equal(s.queued, 1);
});
