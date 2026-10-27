// Isolated integration checks: an empty temporary schema, never real user data.
// No provider calls and no notification worker are started.
import assert from "node:assert/strict";
import express from "express";
import { pool } from "../server/db";
import { initializeReferralSchema, recordProviderPaymentStatus } from "../server/referral-store";
import { registerReferralRoutes } from "../server/referral-routes";
import { pesapalState, reconcileProviderNotification } from "../server/referral-reconciliation";
import { getTransactionStatus } from "../server/pesapalService";

const realFetch = globalThis.fetch;
const provider = new Map<string, any>();
// Exercise the real status adapter. The process can never send an actual
// provider request, including authentication, charges, refunds or mail.
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("pay.pesapal.com/v3/api/Auth/RequestToken")) return Response.json({ token: "fixture-only", expiryDate: "2099-01-01" });
  if (url.includes("pay.pesapal.com/v3/api/Transactions/GetTransactionStatus")) {
    const trackingId = new URL(url).searchParams.get("orderTrackingId")!;
    const result = provider.get(trackingId);
    if (result instanceof Error) throw result;
    return Response.json(result || { status: "500" });
  }
  if (!url.startsWith("http://127.0.0.1:")) throw new Error("Unexpected external request blocked in referral test");
  return realFetch(input, init);
};
function providerResult(order: string, code: number, extra: Record<string, unknown> = {}) {
  return { status: "200", status_code: code, payment_status_description: ["INVALID", "COMPLETED", "FAILED", "REVERSED"][code],
    merchant_reference: order, currency: "USD", amount: 15, ...extra };
}
async function notification(order: string) {
  const result = await getTransactionStatus(order);
  await reconcileProviderNotification(order, result.merchantReference, result.referralState);
}

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
  assert.equal(earnings.balances[0].held, 450, "even zero-day commissions need provider verification");
  await pool.query("UPDATE payments SET pesapal_tracking_id=order_id WHERE order_id='fixture-order'");
  provider.set("fixture-order", providerResult("fixture-order", 1));
  await request(`/api/referrals/owner/${affiliateId}/check-payments`, ownerId, "POST");
  earnings = await request("/api/referrals/me", partnerId);
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
  // Documented contract: HTTP success is not payment completion; status_code is
  // authoritative and payment_status_code is frequently empty in real replies.
  assert.equal(pesapalState(providerResult("contract", 3, { payment_status_code: "" })), "reversed");
  assert.equal(pesapalState(providerResult("contract", 1, { payment_status_description: "Completed" })), "completed");
  for (const result of [
    { status: "200", payment_status_code: 1 }, providerResult("x", 1, { status: "500" }),
    providerResult("x", 3, { payment_status_description: "COMPLETED" }), providerResult("x", 1, { error: { code: "ERR" } }),
    providerResult("x", 99), { status: "200", message: "Refund request successfully" },
  ]) assert.equal(pesapalState(result), "unknown");

  let nextPayment = 900010;
  async function newPayment(order: string) {
    await pool.query(`INSERT INTO payments(id,user_id,order_id,amount,currency,tier,status,created_at,pesapal_tracking_id)
      VALUES($1,$2,$3,1500,'USD','monthly','pending',now()+interval '1 second',$3)`, [nextPayment++, applicantId, order]);
    provider.set(order, providerResult(order, 1));
    await recordProviderPaymentStatus(order, "completed");
    await request(`/api/referrals/owner/${affiliateId}/check-payments`, ownerId, "POST");
    return (await pool.query("SELECT * FROM referral_commissions WHERE order_id=$1", [order])).rows[0];
  }
  const refunded = await newPayment("refund-reserved");
  const unrelated = await newPayment("unrelated-earnings");
  const reserved = await request("/api/referrals/me/payouts", partnerId, "POST", { currency: "USD" });
  provider.set("refund-reserved", providerResult("refund-reserved", 3));
  // Approval itself checks PesaPal, without waiting for an IPN.
  await request(`/api/referrals/owner/payouts/${reserved.payoutId}`, ownerId, "POST", { status: "approved" }, 400);
  const beforeDuplicate = (await pool.query("SELECT count(*)::int AS n FROM referral_activity")).rows[0].n;
  await Promise.all([notification("refund-reserved"), notification("refund-reserved")]);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM referral_activity")).rows[0].n, beforeDuplicate);
  let reviewed = await request("/api/referrals/me", partnerId);
  assert.equal(reviewed.payouts.find((p: any) => p.id === reserved.payoutId).status, "blocked");
  assert.equal(reviewed.commissions.find((c: any) => c.id === refunded.id).status, "review");
  assert.equal(reviewed.commissions.find((c: any) => c.id === unrelated.id).status, "available");
  await request(`/api/referrals/owner/payouts/${reserved.payoutId}`, ownerId, "POST", { status: "paid", reference: "NO-TRANSFER" }, 400);
  await request(`/api/referrals/owner/payouts/${reserved.payoutId}`, ownerId, "POST", { status: "rejected" });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM referral_payout_items WHERE payout_id=$1", [reserved.payoutId])).rows[0].n, 2,
    "rejecting preserves original payout membership for audit");
  const rescheduled = await request("/api/referrals/me/payouts", partnerId, "POST", { currency: "USD" });
  assert.equal((await pool.query("SELECT amount FROM referral_payouts WHERE id=$1", [rescheduled.payoutId])).rows[0].amount, 450);
  await request(`/api/referrals/owner/commissions/${refunded.id}`, ownerId, "POST", { action: "release", note: "Cannot release a confirmed reversal" }, 400);
  await request(`/api/referrals/owner/commissions/${refunded.id}`, ownerId, "POST", { action: "reverse", note: "Verified full refund in provider portal" });

  // A reversal arriving after approval must block mark-paid too.
  await request(`/api/referrals/owner/payouts/${rescheduled.payoutId}`, ownerId, "POST", { status: "approved" });
  provider.set("unrelated-earnings", providerResult("unrelated-earnings", 3));
  await request(`/api/referrals/owner/payouts/${rescheduled.payoutId}`, ownerId, "POST", { status: "paid", reference: "NO-TRANSFER" }, 400);
  await request(`/api/referrals/owner/payouts/${rescheduled.payoutId}`, ownerId, "POST", { status: "rejected" });

  // Paid refunds: preserve the paid payout and original commission forever.
  const originalPaid = earnings.commissions[0].id;
  provider.set("fixture-order", providerResult("fixture-order", 3));
  await Promise.all([notification("fixture-order"), notification("fixture-order")]);
  reviewed = await request("/api/referrals/me", partnerId);
  assert.equal(reviewed.commissions.find((c: any) => c.id === originalPaid).status, "paid");
  assert.equal(reviewed.payouts.find((p: any) => p.id === payout.payoutId).status, "paid");
  assert.equal(reviewed.balances[0].paid, 450);
  assert.equal(reviewed.adjustments.length, 1);
  assert.equal(reviewed.adjustments[0].commissionReference, `Referral ${originalPaid.slice(0, 8)}`);
  assert.equal(reviewed.adjustments[0].commissionId, undefined);
  const adjustmentId = reviewed.adjustments[0].id;
  await request(`/api/referrals/owner/adjustments/${adjustmentId}`, partnerId, "POST", { status: "waived", reference: "private-proof", note: "private recovery evidence" }, 403);
  await request(`/api/referrals/owner/adjustments/${adjustmentId}`, ownerId, "POST", { status: "recovered", amount: 451, reference: "private-proof", note: "private recovery evidence" }, 400);
  await request(`/api/referrals/owner/adjustments/${adjustmentId}`, ownerId, "POST", { status: "recovered", amount: 200, reference: "private-proof", note: "private recovery evidence" });
  await notification("fixture-order");
  reviewed = await request("/api/referrals/me", partnerId);
  assert.equal(reviewed.adjustments.length, 1);
  assert.equal(reviewed.adjustments[0].recoveredAmount, 200);
  assert.ok(!JSON.stringify(reviewed).includes("private-proof"));
  assert.ok(!JSON.stringify(reviewed).includes("private recovery evidence"));
  assert.equal(reviewed.balances[0].paid, 450);
  await request(`/api/referrals/owner/adjustments/${adjustmentId}`, ownerId, "POST", { status: "waived", reference: "duplicate", note: "Do not repeat recovery" }, 409);
  assert.equal((await request("/api/referrals/me", otherId)).adjustments.length, 0);

  // A delayed completion notification cannot resurrect a reversed payment.
  provider.set("fixture-order", providerResult("fixture-order", 1));
  await notification("fixture-order");
  await recordProviderPaymentStatus("fixture-order", "completed");
  assert.equal((await pool.query("SELECT status FROM payments WHERE order_id='fixture-order'")).rows[0].status, "reversed");
  assert.equal((await pool.query("SELECT provider_state FROM referral_commissions WHERE id=$1", [originalPaid])).rows[0].provider_state, "reversed");

  // Outages and inconsistent identity fail closed, but can be explicitly
  // resolved after a fresh check, never merely by a hold-period timer.
  const uncertain = await newPayment("uncertain-payment");
  provider.set("uncertain-payment", new Error("Simulated timeout"));
  await request(`/api/referrals/owner/${affiliateId}/check-payments`, ownerId, "POST");
  assert.equal((await pool.query("SELECT status FROM referral_commissions WHERE id=$1", [uncertain.id])).rows[0].status, "review");
  provider.set("uncertain-payment", providerResult("uncertain-payment", 1, { merchant_reference: "wrong-order" }));
  await request(`/api/referrals/owner/commissions/${uncertain.id}`, ownerId, "POST", { action: "release", note: "Wrong identity must stay held" }, 400);
  provider.set("uncertain-payment", providerResult("uncertain-payment", 1));
  await request(`/api/referrals/owner/commissions/${uncertain.id}`, ownerId, "POST", { action: "release", note: "Confirmed provider identity and completion" });
  await request(`/api/referrals/owner/commissions/${uncertain.id}`, ownerId, "POST", { action: "flag", note: "External provider dispute case: PRIVATE-DISPUTE" });
  assert.ok(!JSON.stringify(await request("/api/referrals/me", partnerId)).includes("PRIVATE-DISPUTE"));
  await request(`/api/referrals/owner/commissions/${uncertain.id}`, ownerId, "POST", { action: "release", note: "Dispute resolved with provider evidence" });
  await request(`/api/referrals/owner/commissions/${originalPaid}`, ownerId, "POST", { action: "flag", note: "Duplicate external evidence" });
  await initializeReferralSchema(); // Restart-safe, no duplicate paid adjustments.
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM referral_adjustments")).rows[0].n, 1);
  await request(`/api/referrals/owner/${affiliateId}`, ownerId, "PATCH", { status: "suspended" });
  assert.equal((await request("/api/referrals/me", partnerId)).commissions.length, 4);
  await request("/api/referrals/me/payouts", partnerId, "POST", { currency: "USD" }, 400);
  await pool.query("UPDATE users SET email_verified=false WHERE id=$1", [partnerId]);
  await request("/api/referrals/me", partnerId, "GET", undefined, 403);
  console.log(`PASS: ${checks} HTTP checks; ownership isolation, founder access, duplicate completion, private notes, application identity, commission and payout lifecycle. No real mail or payments.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (http) await new Promise<void>(resolve => http!.close(() => resolve()));
  globalThis.fetch = realFetch;
  // The generated schema contains only this test's empty clones and fixtures.
  if (/^referral_test_[a-f0-9]{32}$/.test(schema)) await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
});
