import { pool } from "./db";
import { getTransactionStatus, getSubscriptionEndDate, updatePaymentStatus, type TransactionStatus } from "./pesapalService";
import { reconcileProviderNotification } from "./referral-reconciliation";
import { transaction } from "./referral-store";
import { withBrightBoardBranding } from "./emailBranding";

export function matchesPayment(payment: any, result: TransactionStatus) {
  return result.merchantReference === payment.order_id &&
    result.orderTrackingId === payment.pesapal_tracking_id &&
    result.currency === payment.currency &&
    Number.isFinite(Number(result.amount)) &&
    Math.round(Number(result.amount) * 100) === payment.amount;
}

const escapeHtml = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]!));

export async function activateVerifiedPayment(paymentId: number, allowLegacyFirstCompletion = false) {
  return transaction(async client => {
    const { rows: [p] } = await client.query("SELECT * FROM payments WHERE id=$1 FOR UPDATE", [paymentId]);
    if (!p || p.status !== "completed") return false;
    const { rows: [u] } = await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [p.user_id]);
    if (!u) throw new Error("Payment account missing");
    const { rows: [existing] } = await client.query("SELECT * FROM payment_activations WHERE payment_id=$1", [p.id]);
    if (existing) return true;
    // Already-activated historical orders must not renew the plan again.
    const alreadyApplied = u.pesapal_order_tracking_id === p.pesapal_tracking_id;
    if (!alreadyApplied && !allowLegacyFirstCompletion) {
      const { rows: [checkout] } = await client.query("SELECT order_id FROM payment_checkouts WHERE payment_id=$1", [p.id]);
      // A historical completed payment may predate the activation ledger and
      // no longer be the account's latest purchase. Never grant it again.
      if (!checkout) return false;
    }
    const end = alreadyApplied && u.subscription_ends_at
      ? new Date(u.subscription_ends_at) : getSubscriptionEndDate(p.tier);
    if (!alreadyApplied && u.subscription_status === "active" && u.subscription_ends_at) {
      // Preserve the customer's remaining paid time when buying another period.
      end.setTime(end.getTime() + Math.max(0, new Date(u.subscription_ends_at).getTime() - Date.now()));
    }
    if (!alreadyApplied) {
      await client.query(`UPDATE users SET subscription_tier=$2,subscription_status='active',
        subscription_ends_at=$3,pesapal_order_tracking_id=$4,updated_at=now() WHERE id=$1`,
        [u.id, p.tier, end, p.pesapal_tracking_id]);
    }
    await client.query("INSERT INTO payment_activations(payment_id,ends_at) VALUES($1,$2)", [p.id, end]);
    if (u.email && !p.receipt_sent_at && !alreadyApplied) {
      const amount = `${p.currency} ${(p.amount / 100).toFixed(2)}`;
      const text = `Your BrightBoard ${p.tier} plan is active. Payment: ${amount}. Order: ${p.order_id}. Access ends: ${end.toISOString()}.`;
      await client.query(`INSERT INTO referral_notifications(id,event_key,recipient,subject,html,body_text)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_key) DO NOTHING`,
        [crypto.randomUUID(), `receipt:${p.id}`, u.email, "Your BrightBoard payment receipt",
          withBrightBoardBranding(`<h1>Payment confirmed</h1><p>${escapeHtml(text)}</p><p><a href="https://www.brightboardapp.com/">Start creating</a></p>`), text]);
    }
    return true;
  });
}

export async function verifyPayment(trackingId: string) {
  const { rows: [payment] } = await pool.query("SELECT * FROM payments WHERE pesapal_tracking_id=$1 LIMIT 1", [trackingId]);
  if (!payment) throw new Error("Payment not found");
  const result = await getTransactionStatus(trackingId);
  if (!matchesPayment(payment, result)) throw new Error("Payment verification mismatch");
  await reconcileProviderNotification(trackingId, result.merchantReference, result.referralState);
  if (result.referralState === "completed") {
    await updatePaymentStatus(payment.order_id, "completed", result.paymentMethod, result.confirmationCode);
    await activateVerifiedPayment(payment.id, payment.status !== "completed" && payment.status !== "reversed");
  } else if (result.referralState === "failed") {
    await updatePaymentStatus(payment.order_id, "failed");
  }
  return payment.order_id;
}

export async function paymentView(orderId: string, userId: string, checkProvider = true) {
  let { rows: [p] } = await pool.query(`SELECT p.*,c.checkout_url,c.creation_state
    FROM payments p LEFT JOIN payment_checkouts c ON c.payment_id=p.id
    WHERE p.order_id=$1 AND p.user_id=$2 LIMIT 1`, [orderId, userId]);
  if (!p) return null;
  if (checkProvider && p.pesapal_tracking_id && (p.status === "pending" || (p.status === "completed" && p.creation_state))) {
    // Database claim bounds provider requests across tabs and server processes.
    const { rowCount } = await pool.query(`UPDATE payment_checkouts SET last_checked_at=now()
      WHERE payment_id=$1 AND (last_checked_at IS NULL OR last_checked_at<now()-interval '5 seconds')`, [p.id]);
    if (rowCount || !p.creation_state) {
      try { await verifyPayment(p.pesapal_tracking_id); }
      catch { console.warn("[payments] Verification unavailable; access not changed"); }
    }
  }
  const { rows: [fresh] } = await pool.query(`SELECT p.status,a.activated_at,n.status AS receipt_status
    FROM payments p LEFT JOIN payment_activations a ON a.payment_id=p.id
    LEFT JOIN referral_notifications n ON n.event_key='receipt:'||p.id::text WHERE p.id=$1`, [p.id]);
  const creationState = p.creation_state === "initializing" && Date.now() - new Date(p.created_at).getTime() > 90_000
    ? "creation_unknown" : p.creation_state;
  const status = fresh.status === "pending" && creationState && creationState !== "ready"
    ? creationState : fresh.status;
  return { orderId, status, tier: p.tier, amount: p.amount, currency: p.currency,
    activated: fresh.status === "completed" && !!fresh.activated_at,
    checkoutUrl: fresh.status === "pending" ? p.checkout_url || null : null,
    receiptStatus: fresh.receipt_status === "sent" ? "accepted" :
      ["pending", "sending"].includes(fresh.receipt_status) ? "queued" : "not_sent" };
}
