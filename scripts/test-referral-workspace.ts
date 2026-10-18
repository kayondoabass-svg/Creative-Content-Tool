// Isolated integration checks: an empty temporary schema, never real user data.
// No provider calls and no notification worker are started.
import assert from "node:assert/strict";
import express from "express";
import { pool } from "../server/db";
import { initializeReferralSchema, recordProviderPaymentStatus } from "../server/referral-store";
import { registerReferralRoutes } from "../server/referral-routes";

const schema = `referral_test_${crypto.randomUUID().replace(/-/g, "")}`;
const server = express();
let http: ReturnType<typeof server.listen> | undefined;
const ownerId = crypto.randomUUID(), partnerId = crypto.randomUUID(), otherId = crypto.randomUUID();
const applicantId = crypto.randomUUID(), affiliateId = crypto.randomUUID(), otherAffiliateId = crypto.randomUUID();

async function main() {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  pool.on("connect", client => { void client.query(`SET search_path TO "${schema}",public`); });
  await pool.query(`SET search_path TO "${schema}",public`);
  for (const table of ["users", "affiliates", "payments"]) {
    await pool.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  }
  await initializeReferralSchema();
  for (const [id, email, founder, verified] of [
    [ownerId, "founder@example.test", true, true],
    [partnerId, "partner@example.test", false, true],
    [otherId, "other@example.test", false, true],
    [applicantId, "new@example.test", false, true],
  ]) await pool.query("INSERT INTO users(id,email,email_verified,is_owner,first_name) VALUES($1,$2,$3,$4,$5)", [id, email, verified, founder, email]);
  for (const [id, name, email, code] of [
    [affiliateId, "Partner One", "partner@example.test", "testpartner"],
    [otherAffiliateId, "Partner Two", "other@example.test", "otherpartner"],
  ]) await pool.query(`INSERT INTO affiliates(id,name,email,referral_code,reason,status) VALUES($1,$2,$3,$4,'Test application','approved')`, [id, name, email, code]);
  server.use(express.json());
  // Test-server-only identity injection; never installed in the real app.
  server.use((req: any, _res, next) => { req.session = { userId: req.get("x-fixture-user") }; next(); });
  registerReferralRoutes(server);
  http = server.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => http!.once("listening", resolve));
  const port = (http.address() as any).port;
  let checks = 0;
  async function request(path: string, user?: string, method = "GET", body?: unknown, expected = 200) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method, headers: { "Content-Type": "application/json", ...(user ? { "x-fixture-user": user } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    assert.equal(response.status, expected, `${method} ${path}: ${text}`);
    checks++;
    return response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : text;
  }
  await request("/api/referrals/me", undefined, "GET", undefined, 401);
  await request(`/api/affiliates/status/partner@example.test`, undefined, "GET", undefined, 401);
  await request(`/api/affiliates/status/other@example.test`, partnerId, "GET", undefined, 403);
  await request(`/api/referrals/owner/${otherAffiliateId}`, partnerId, "GET", undefined, 403);
  await request(`/api/referrals/owner/${otherAffiliateId}`, partnerId, "PATCH", { status: "approved" }, 403);
  const me = await request("/api/referrals/me", partnerId);
  assert.equal(me.affiliate.id, affiliateId);
  assert.ok(!JSON.stringify(me).includes("other@example.test"));
  const ownerList = await request("/api/referrals/owner", ownerId);
  assert.equal(ownerList.affiliates.length, 2);
  await request(`/api/referrals/owner/${affiliateId}`, ownerId, "PATCH", { note: "Founder-only confidential note" });
  const mine = await request("/api/referrals/me", partnerId);
  assert.ok(!JSON.stringify(mine).includes("Founder-only confidential note"));
  const detail = await request(`/api/referrals/owner/${affiliateId}`, ownerId);
  assert.ok(JSON.stringify(detail).includes("Founder-only confidential note"));
  await request("/api/referrals/apply", applicantId, "POST", {
    name: "New Applicant", email: "other@example.test", reason: "I help teachers find classroom tools", termsAccepted: true,
  });
  const application = await request("/api/referrals/me", applicantId);
  assert.equal(application.affiliate.email, "new@example.test");
  await request("/api/referrals/apply", applicantId, "POST", {
    name: "New Applicant", reason: "Duplicate application", termsAccepted: true,
  }, 409);
  const notices = await request("/api/referrals/owner/notifications", ownerId);
  assert.equal(notices.notifications.length, 2);
  await pool.query("UPDATE users SET referred_by='testpartner' WHERE id=$1", [applicantId]);
  await request("/api/referrals/owner/policy", ownerId, "PATCH", {
    active: true, confirmed: true, mode: "percentage", percent: 30,
    fixedCurrency: "USD", fixedRates: { weekly: 100, monthly: 200, institution: 500 },
    holdDays: 0, minimumByCurrency: { USD: 100 }, attributionDays: 90,
  });
  await pool.query(`INSERT INTO payments(id,user_id,order_id,amount,currency,tier,status,created_at)
    VALUES(900001,$1,'fixture-order',1500,'USD','monthly','pending',now()+interval '1 second')`, [applicantId]);
  await Promise.all([
    recordProviderPaymentStatus("fixture-order", "completed", "Card", "TEST"),
    recordProviderPaymentStatus("fixture-order", "completed", "Card", "TEST"),
  ]);
  let earnings = await request("/api/referrals/me", partnerId);
  assert.equal(earnings.commissions.length, 1);
  assert.equal(earnings.balances[0].available, 450);
  assert.ok(!JSON.stringify(earnings).includes("new@example.test"));
  assert.equal((await request("/api/referrals/owner/notifications", ownerId)).notifications.length, 3);
  await request("/api/referrals/me/payout-details", partnerId, "PATCH", { payoutMethod: "paypal", payoutDetails: "partner@example.test" });
  const payout = await request("/api/referrals/me/payouts", partnerId, "POST", { currency: "USD" });
  await request("/api/referrals/me/payouts", partnerId, "POST", { currency: "USD" }, 400);
  await request(`/api/referrals/owner/payouts/${payout.payoutId}`, partnerId, "POST", { status: "paid", reference: "FAKE" }, 403);
  await request(`/api/referrals/owner/payouts/${payout.payoutId}`, ownerId, "POST", { status: "paid", reference: "TEST" }, 400);
  await request(`/api/referrals/owner/payouts/${payout.payoutId}`, ownerId, "POST", { status: "approved" });
  await request(`/api/referrals/owner/payouts/${payout.payoutId}`, ownerId, "POST", { status: "paid", reference: "fixture-transfer" });
  earnings = await request("/api/referrals/me", partnerId);
  assert.equal(earnings.balances[0].paid, 450);
  assert.equal(earnings.balances[0].available, 0);
  await request(`/api/referrals/owner/commissions/${earnings.commissions[0].id}`, ownerId, "POST", { action: "reverse", note: "Do not change paid records" }, 400);
  await request(`/api/referrals/owner/${affiliateId}`, ownerId, "PATCH", { status: "suspended" });
  assert.equal((await request("/api/referrals/me", partnerId)).commissions.length, 1);
  await request("/api/referrals/me/payouts", partnerId, "POST", { currency: "USD" }, 400);
  await pool.query("UPDATE users SET email_verified=false WHERE id=$1", [partnerId]);
  await request("/api/referrals/me", partnerId, "GET", undefined, 403);
  console.log(`PASS: ${checks} HTTP checks; ownership isolation, founder access, duplicate completion, private notes, application identity, commission and payout lifecycle. No real mail or payments.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (http) await new Promise<void>(resolve => http!.close(() => resolve()));
  // The generated schema contains only this test's empty clones and fixtures.
  if (/^referral_test_[a-f0-9]{32}$/.test(schema)) await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
});
