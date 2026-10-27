import { referralActivity, transaction, type Queryable } from "./referral-store";

export type ProviderState = "completed" | "reversed" | "failed" | "unknown";

// API 3 documents status_code, NOT payment_status_code. Unknown or contradictory
// responses fail closed. No invented refund amount or dispute code.
export function pesapalState(data: any): ProviderState {
  if (String(data.status) !== "200" || data.error?.code || data.error?.error_type) return "unknown";
  const states: Record<string, ProviderState> = { "0": "unknown", "1": "completed", "2": "failed", "3": "reversed" };
  const state = states[String(data.status_code)] || "unknown";
  const description = String(data.payment_status_description || "").toLowerCase();
  return description === state || (state === "unknown" && description === "invalid") ? state : "unknown";
}

export async function applyProviderReview(client: Queryable, paymentId: number, state: ProviderState, externalEvidence = false) {
  if (state === "reversed") await client.query("UPDATE payments SET status='reversed' WHERE id=$1", [paymentId]);
  const { rows: [c] } = await client.query("SELECT * FROM referral_commissions WHERE payment_id=$1 FOR UPDATE", [paymentId]);
  if (!c) return;
  await client.query("UPDATE referral_commissions SET provider_state=$2,provider_checked_at=now() WHERE id=$1", [c.id, state]);
  if (state === "completed") return; // Never automatically remove a previous review.
  if (c.status === "reversed") return;
  const reason = state === "reversed" ? "Provider reports reversal; refund amount requires founder review."
    : "Provider payment could not be confirmed; founder review required.";
  if (c.status === "paid") {
    if (state !== "reversed" && !externalEvidence) return;
    const { rows } = await client.query(`INSERT INTO referral_adjustments(id,commission_id,affiliate_id,currency,exposure)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(commission_id) DO NOTHING RETURNING id`,
      [crypto.randomUUID(), c.id, c.affiliate_id, c.currency, c.amount]);
    if (rows.length) await referralActivity(client, c.affiliate_id, null, "paid_commission_recovery_review",
      `${c.currency} ${(c.amount / 100).toFixed(2)} paid commission under review. Not deducted from earnings.`);
    return;
  }
  await client.query("UPDATE referral_commissions SET status='review',review_required=true WHERE id=$1", [c.id]);
  if (!c.review_required) await referralActivity(client, c.affiliate_id, null, "commission_provider_review", reason);
  if (c.payout_id) {
    const { rows } = await client.query(`UPDATE referral_payouts SET status='blocked',updated_at=now()
      WHERE id=$1 AND status IN ('requested','approved') RETURNING id`, [c.payout_id]);
    if (rows.length) await referralActivity(client, c.affiliate_id, null, "payout_blocked",
      "Payment review blocked a reserved payout. Founder must reject it to release unaffected earnings for a new request.");
  }
}

export async function verifyCommissionPayments(client: Queryable, filter: { affiliateId?: string; payoutId?: string; commissionId?: string }) {
  const { rows } = await client.query(`SELECT c.id,c.payment_id,p.order_id,p.pesapal_tracking_id,p.amount,p.currency,p.status AS payment_status FROM referral_commissions c
    JOIN payments p ON p.id=c.payment_id WHERE ($1::text IS NULL OR c.affiliate_id=$1)
    AND ($2::text IS NULL OR c.payout_id=$2) AND ($3::text IS NULL OR c.id=$3)
    AND c.status<>'reversed' ORDER BY c.id`, [filter.affiliateId || null, filter.payoutId || null, filter.commissionId || null]);
  const { getTransactionStatus } = await import("./pesapalService");
  // Bound a whole sweep as well as each provider request. Remaining rows fail
  // closed if a slow provider exhausts the budget; a later check can retry.
  const deadline = Date.now() + 30000;
  for (const c of rows) {
    let state: ProviderState = "unknown";
    try {
      if (c.pesapal_tracking_id && Date.now() < deadline) {
        const result = await getTransactionStatus(c.pesapal_tracking_id);
        if (result.merchantReference === c.order_id && (result.referralState === "reversed" ||
          (result.currency === c.currency && Math.round(Number(result.amount) * 100) === c.amount))) state = result.referralState;
      }
    } catch { /* Persist uncertainty; do not roll back the safety hold. */ }
    await applyProviderReview(client, c.payment_id, c.payment_status === "reversed" ? "reversed" : state);
  }
}

// Called only after a server-to-provider lookup, never from notification payloads.
export async function reconcileProviderNotification(trackingId: string, merchantReference: string, state: ProviderState) {
  await transaction(async client => {
    const { rows: [p] } = await client.query("SELECT id,order_id,status FROM payments WHERE pesapal_tracking_id=$1", [trackingId]);
    if (p) await applyProviderReview(client, p.id, p.status === "reversed" ? "reversed" : merchantReference === p.order_id ? state : "unknown");
  });
}
