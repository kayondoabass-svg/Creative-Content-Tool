import test, { afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { pool } from "./db";
import { processReferralNotifications } from "./referral-notifications";

const key = process.env.AFROAI_EMAIL_API_KEY;
afterEach(() => {
  mock.restoreAll();
  if (key === undefined) delete process.env.AFROAI_EMAIL_API_KEY; else process.env.AFROAI_EMAIL_API_KEY = key;
});
function queue() {
  let claimed = false;
  const outcomes: any[][] = [];
  mock.method(pool, "query", async (sql: string, args?: any[]) => {
    if (sql.includes("RETURNING *") && !claimed) {
      claimed = true;
      return { rows: [{ id: "fixture-mail", recipient: "fixture@example.test", subject: "Test", html: "<p>Test</p>", body_text: "Test" }] } as any;
    }
    if (sql.includes("SET status=$2")) outcomes.push(args!);
    return { rows: [] } as any;
  });
  process.env.AFROAI_EMAIL_API_KEY = "test-only-not-a-real-key";
  return outcomes;
}
test("queue records provider acceptance without claiming inbox delivery", async () => {
  const outcomes = queue();
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ success: true, messageId: "test-id" }), {
    headers: { "Content-Type": "application/json" },
  }));
  await processReferralNotifications();
  assert.equal(outcomes[0][1], "sent");
});
test("provider rejects are marked failed using only sanitized status", async () => {
  const outcomes = queue();
  mock.method(globalThis, "fetch", async () => new Response("Never store this private provider diagnostic", { status: 401 }));
  await processReferralNotifications();
  assert.deepEqual(outcomes[0], ["fixture-mail", "failed", "Provider HTTP 401"]);
});
test("timeout is uncertain, not automatically retried", async () => {
  const outcomes = queue();
  let calls = 0;
  mock.method(globalThis, "fetch", async () => { calls++; throw new Error("Timeout"); });
  await processReferralNotifications();
  await processReferralNotifications();
  assert.equal(calls, 1);
  assert.equal(outcomes[0][1], "unknown");
});
