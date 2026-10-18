import { pool } from "./db";
import type { PoolClient } from "pg";
import { calculateCommission, draftReferralPolicy } from "./referral-policy";
import { paymentOwnerAlert, type OwnerAlert } from "./owner-alerts";

export type Queryable = Pick<PoolClient, "query">;

// Additive, idempotent schema setup. Existing users, affiliates and payments are
// never recreated, truncated or deleted. This also runs on the prebuilt VPS.
export async function initializeReferralSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS referral_policy (
      id integer PRIMARY KEY CHECK (id=1), config jsonb NOT NULL,
      effective_from timestamptz, installed_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS referral_profiles (
      affiliate_id varchar PRIMARY KEY REFERENCES affiliates(id),
      payout_method text, payout_details text, terms_accepted_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS referral_payouts (
      id text PRIMARY KEY, affiliate_id varchar NOT NULL REFERENCES affiliates(id),
      currency varchar(3) NOT NULL, amount integer NOT NULL CHECK(amount>0),
      status text NOT NULL DEFAULT 'requested',
      method text NOT NULL, details text NOT NULL, reference text, note text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS referral_commissions (
      id text PRIMARY KEY, affiliate_id varchar NOT NULL REFERENCES affiliates(id),
      payment_id integer NOT NULL UNIQUE REFERENCES payments(id),
      order_id text NOT NULL, amount integer NOT NULL CHECK(amount>0),
      currency varchar(3) NOT NULL, status text NOT NULL,
      available_at timestamptz NOT NULL, payout_id text REFERENCES referral_payouts(id),
      policy_snapshot jsonb NOT NULL, note text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS referral_commissions_partner ON referral_commissions(affiliate_id);
    CREATE TABLE IF NOT EXISTS referral_activity (
      id text PRIMARY KEY, affiliate_id varchar NOT NULL REFERENCES affiliates(id),
      actor_id text, action text NOT NULL, note text,
      internal boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS referral_link_visits (
      id text PRIMARY KEY, affiliate_id varchar NOT NULL REFERENCES affiliates(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS referral_notifications (
      id text PRIMARY KEY, event_key text NOT NULL UNIQUE, recipient text NOT NULL,
      subject text NOT NULL, html text NOT NULL, body_text text NOT NULL,
      status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
      last_error text, created_at timestamptz NOT NULL DEFAULT now(),
      started_at timestamptz, sent_at timestamptz
    );
  `);
  await pool.query("INSERT INTO referral_policy(id,config) VALUES(1,$1) ON CONFLICT DO NOTHING", [draftReferralPolicy]);
  // An interrupted request may already have reached the email provider. Do not
  // automatically resend uncertain deliveries and risk duplicates.
  await pool.query(`UPDATE referral_notifications SET status='unknown',last_error='Delivery interrupted; provider acceptance unknown'
    WHERE status='sending' AND started_at < now()-interval '5 minutes'`);
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export function camelRow(row: any): any {
  if (!row) return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value,
  ]));
}

export async function getReferralPolicy(client: Queryable = pool) {
  const { rows: [row] } = await client.query("SELECT * FROM referral_policy WHERE id=1");
  return { ...row.config, effectiveFrom: row.effective_from, updatedAt: row.updated_at };
}

export async function referralActivity(client: Queryable, affiliateId: string, actorId: string | null, action: string, note = "", internal = false) {
  await client.query(`INSERT INTO referral_activity(id,affiliate_id,actor_id,action,note,internal) VALUES($1,$2,$3,$4,$5,$6)`,
    [crypto.randomUUID(), affiliateId, actorId, action, note, internal]);
}

export async function enqueueNotification(client: Queryable, eventKey: string, recipient: string, alert: OwnerAlert) {
  await client.query(`INSERT INTO referral_notifications(id,event_key,recipient,subject,html,body_text)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_key) DO NOTHING`,
    [crypto.randomUUID(), eventKey, recipient, alert.subject, alert.html, alert.text]);
}

export async function queuePaymentOwnerAlert(payment: any, client: Queryable = pool) {
  const { rows: [customer] } = await client.query("SELECT first_name,last_name,email FROM users WHERE id=$1", [payment.user_id]);
  await enqueueNotification(client, `payment:${payment.id}`, process.env.OWNER_NOTIFICATION_EMAIL || "kayondoabass@gmail.com",
    paymentOwnerAlert({
      orderId: payment.order_id, amount: payment.amount / 100, currency: payment.currency,
      tier: payment.tier, customerName: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim(),
      customerEmail: customer?.email || "", paymentMethod: payment.payment_method, confirmationCode: payment.confirmation_code,
    }));
}

export async function recordProviderPaymentStatus(orderId: string, status: string, paymentMethod?: string, confirmationCode?: string) {
  await transaction(async client => {
    const { rows } = await client.query(`UPDATE payments SET status=$2,
      payment_method=COALESCE(NULLIF($3,''),payment_method),
      confirmation_code=COALESCE(NULLIF($4,''),confirmation_code)
      WHERE order_id=$1 AND status<>'completed' RETURNING *`,
      [orderId, status, paymentMethod || null, confirmationCode || null]);
    if (status !== "completed" || !rows.length) return;
    // Saving the payment, alert and commission is one transaction. Provider
    // downtime cannot erase a notification or turn an email error into lost money.
    await queuePaymentOwnerAlert(rows[0], client);
    await recordReferralCommission(rows[0].id, client);
  });
}

export async function recordReferralCommission(paymentId: number, client: Queryable = pool) {
  const policy = await getReferralPolicy(client);
  if (!policy.active || !policy.effectiveFrom) return;
  const { rows: [payment] } = await client.query(`SELECT p.*,u.referred_by,u.email AS customer_email
    FROM payments p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.status='completed'`, [paymentId]);
  // Only payments initiated after the founder confirmed a policy qualify.
  // No automatic historical debt is invented.
  if (!payment || new Date(payment.created_at) < new Date(policy.effectiveFrom)) return;
  const { rows: [affiliate] } = await client.query(`SELECT * FROM affiliates WHERE referral_code=$1 AND status='approved'`, [payment.referred_by]);
  if (!affiliate || affiliate.email.toLowerCase() === payment.customer_email?.toLowerCase()) return;
  const commission = calculateCommission(payment, policy);
  if (!commission) return;
  const { rows } = await client.query(`INSERT INTO referral_commissions
    (id,affiliate_id,payment_id,order_id,amount,currency,status,available_at,policy_snapshot)
    VALUES($1,$2,$3,$4,$5,$6,$7,now()+($8*interval '1 day'),$9)
    ON CONFLICT(payment_id) DO NOTHING RETURNING id`,
    [crypto.randomUUID(), affiliate.id, payment.id, payment.order_id, commission.amount,
      commission.currency, policy.holdDays === 0 ? "available" : "held", policy.holdDays, policy]);
  if (rows.length) await referralActivity(client, affiliate.id, null, "commission_recorded", `Order ${payment.order_id}: ${commission.currency} ${(commission.amount / 100).toFixed(2)}`);
}

export async function settleHeldCommissions(client: Queryable = pool) {
  await client.query("UPDATE referral_commissions SET status='available' WHERE status='held' AND available_at<=now()");
}

export async function referralDetail(affiliateId: string, founder = false) {
  await settleHeldCommissions();
  const { rows: [affiliate] } = await pool.query(`SELECT a.*,r.payout_method,r.payout_details,r.terms_accepted_at
    FROM affiliates a LEFT JOIN referral_profiles r ON r.affiliate_id=a.id WHERE a.id=$1`, [affiliateId]);
  if (!affiliate) return null;
  const [{ rows: commissions }, { rows: payouts }, { rows: activity }, { rows: referrals }, { rows: [visits] }] = await Promise.all([
    pool.query("SELECT * FROM referral_commissions WHERE affiliate_id=$1 ORDER BY created_at DESC", [affiliateId]),
    pool.query("SELECT * FROM referral_payouts WHERE affiliate_id=$1 ORDER BY created_at DESC", [affiliateId]),
    pool.query(`SELECT id,action,note,created_at FROM referral_activity WHERE affiliate_id=$1 ${founder ? "" : "AND NOT internal"} ORDER BY created_at DESC`, [affiliateId]),
    pool.query(`SELECT ${founder ? "id,first_name,last_name,email," : "id,"} created_at AS joined_at FROM users WHERE referred_by=$1 ORDER BY created_at DESC`, [affiliate.referral_code]),
    pool.query("SELECT count(*)::integer AS count FROM referral_link_visits WHERE affiliate_id=$1", [affiliateId]),
  ]);
  const balances = new Map<string, any>();
  for (const commission of commissions) {
    const balance = balances.get(commission.currency) || {
      currency: commission.currency, held: 0, available: 0, reserved: 0, paid: 0, reversed: 0,
    };
    const bucket = commission.status === "available" && commission.payout_id ? "reserved" : commission.status;
    if (bucket in balance) balance[bucket] += commission.amount;
    balances.set(commission.currency, balance);
  }
  const visibleCommissions = commissions.map(c => {
    const row = camelRow(c);
    if (!founder) {
      delete row.paymentId;
      delete row.policySnapshot;
      // Do not expose internal payment references or founder-only notes.
      row.orderId = `Referral ${String(c.id).slice(0, 8)}`;
      delete row.note;
    }
    return row;
  });
  return { affiliate: camelRow(affiliate), policy: await getReferralPolicy(), commissions: visibleCommissions,
    payouts: payouts.map(p => { const row = camelRow(p); if (!founder) delete row.note; return row; }),
    balances: Array.from(balances.values()), activity: activity.map(camelRow),
    stats: { linkVisits: visits.count, signups: referrals.length, completedPaymentCount: commissions.filter(c => c.status !== "reversed").length },
    referrals: referrals.map((r, index) => founder ? camelRow(r) : { id: `Referral ${index + 1}`, joinedAt: r.joined_at }) };
}
