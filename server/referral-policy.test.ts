import test from "node:test";
import assert from "node:assert/strict";
import { affiliateOwnedBy, calculateCommission, draftReferralPolicy, policySchema, safeCsv } from "./referral-policy";
import { referralToken, validReferralToken } from "./referral-attribution";

test("inactive financial rules never invent a commission", () => {
  assert.equal(calculateCommission({ amount: 1500, currency: "USD", tier: "monthly" }, draftReferralPolicy), null);
});
test("percentage uses original currency and deterministic minor-unit rounding", () => {
  assert.deepEqual(calculateCommission({ amount: 1500, currency: "USD", tier: "monthly" }, { ...draftReferralPolicy, active: true }), { amount: 450, currency: "USD" });
  assert.deepEqual(calculateCommission({ amount: 1001, currency: "UGX", tier: "monthly" }, { ...draftReferralPolicy, active: true }), { amount: 300, currency: "UGX" });
});
test("fixed commission is explicit in the founder selected currency", () => {
  assert.deepEqual(calculateCommission({ amount: 5500000, currency: "UGX", tier: "monthly" }, { ...draftReferralPolicy, active: true, mode: "fixed" }), { amount: 200, currency: "USD" });
});
test("unverified or mismatched applicants cannot own another person's record", () => {
  const record = { email: "partner@example.test" };
  assert.equal(affiliateOwnedBy({ email: record.email, emailVerified: false }, record), false);
  assert.equal(affiliateOwnedBy({ email: "other@example.test", emailVerified: true }, record), false);
  assert.equal(affiliateOwnedBy({ email: "PARTNER@example.test", emailVerified: true }, record), true);
  assert.equal(affiliateOwnedBy({ isOwner: true }, record), true);
});
test("financial configuration requires confirmation and valid positive thresholds", () => {
  assert.equal(policySchema.safeParse({ ...draftReferralPolicy }).success, false);
  assert.equal(policySchema.safeParse({ ...draftReferralPolicy, confirmed: true }).success, true);
  assert.equal(policySchema.safeParse({ ...draftReferralPolicy, confirmed: true, percent: 101 }).success, false);
});
test("attribution cookie rejects tampering and expiry", () => {
  const old = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-only-secret";
  try {
    const token = referralToken("partner123", Date.now() + 10000);
    assert.equal(validReferralToken(token), "partner123");
    assert.equal(validReferralToken(token.replace("partner123", "other123")), null);
    assert.equal(validReferralToken(referralToken("partner123", Date.now() - 1000)), null);
    assert.equal(validReferralToken("invalid"), null);
  } finally {
    if (old === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = old;
  }
});
test("CSV export neutralizes untrusted spreadsheet formulas", () => {
  assert.equal(safeCsv("=SUM(A1)"), "\"'=SUM(A1)\"");
  assert.equal(safeCsv(" =SUM(A1)"), "\"' =SUM(A1)\"");
  assert.equal(safeCsv('A "teacher"'), '"A ""teacher"""');
});
