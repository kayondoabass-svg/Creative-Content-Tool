import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { pool } from "./db";
import { affiliateOwnedBy, policySchema, safeCsv } from "./referral-policy";
import { camelRow, enqueueNotification, getReferralPolicy, recordReferralCommission,
  referralActivity, referralDetail, settleHeldCommissions, transaction } from "./referral-store";
import { referralApplicationOwnerAlert } from "./owner-alerts";
import type { OwnerAlert } from "./owner-alerts";

function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
function route(fn: (req: any, res: Response) => Promise<any>) {
  return (req: Request, res: Response) => Promise.resolve(fn(req, res)).catch((error) => {
    const status = error instanceof z.ZodError ? 400 : error.status || 500;
    if (status === 500) console.error("[referrals] Request failed", error.code || error.name || "unknown");
    res.status(status).json({ error: status === 500 ? "Referral request failed. Please try again." :
      error instanceof z.ZodError ? error.issues.map((i: any) => i.message).join("; ") : error.message });
  });
}

export async function referralAccess(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.session?.userId) return res.status(401).json({ error: "Sign in to view your referral account" });
    const { rows: [user] } = await pool.query("SELECT id,email,email_verified,is_owner FROM users WHERE id=$1", [req.session.userId]);
    if (!user) return res.status(401).json({ error: "Account not found" });
    if (!user.is_owner && (!user.email_verified || !user.email)) return res.status(403).json({ error: "Verify your account email before accessing referral information" });
    // Mutations are same-origin. No permissive CORS or public recipient input.
    const origin = req.get("origin");
    if (!["GET", "HEAD"].includes(req.method) && origin) {
      if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Cross-origin referral changes are not allowed" });
    }
    req.referralUser = user;
    res.setHeader("Cache-Control", "no-store");
    next();
  } catch { res.status(503).json({ error: "Referral access is temporarily unavailable" }); }
}

function owner(req: any, res: Response, next: NextFunction) {
  if (!req.referralUser?.is_owner) return res.status(403).json({ error: "Founder access only" });
  next();
}

async function ownAffiliate(req: any, client: any = pool) {
  const { rows: [affiliate] } = await client.query("SELECT * FROM affiliates WHERE lower(email)=lower($1)", [req.referralUser.email]);
  return affiliate;
}

const applicationSchema = z.object({
  name: z.string().trim().min(2).max(120), website: z.string().trim().max(500).optional(),
  socialMedia: z.string().trim().max(500).optional(), audience: z.string().trim().max(500).optional(),
  reason: z.string().trim().min(5).max(4000), termsAccepted: z.literal(true),
});

function textAlert(subject: string, text: string): OwnerAlert {
  const escaped = text.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return { subject, text, html: `<div style="font-family:Arial;white-space:pre-wrap">${escaped}</div>` };
}

export function registerReferralRoutes(app: Express) {
  const applyLimiter = rateLimit({ windowMs: 3600000, max: 8, standardHeaders: true, legacyHeaders: false });

  app.get("/api/referrals/policy", route(async (_req, res) => res.json(await getReferralPolicy())));
  app.use("/api/referrals", (req, res, next) => referralAccess(req, res, next));

  const apply = route(async (req, res) => {
    const data = applicationSchema.parse(req.body);
    const result = await transaction(async client => {
      // Lock the account, including first application, to serialize duplicates.
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [req.referralUser.id]);
      const existing = await ownAffiliate(req, client);
      if (existing && existing.status !== "rejected") fail("You already have an application. Open your referral workspace.", 409);
      const id = existing?.id || crypto.randomUUID();
      if (existing) {
        await client.query(`UPDATE affiliates SET name=$2,website=$3,social_media=$4,audience=$5,reason=$6,status='pending',rejected_reason=NULL
          WHERE id=$1`, [id, data.name, data.website || null, data.socialMedia || null, data.audience || null, data.reason]);
      } else {
        await client.query(`INSERT INTO affiliates(id,name,email,website,social_media,audience,reason,referral_code,status)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
          [id, data.name, req.referralUser.email.toLowerCase(), data.website || null, data.socialMedia || null,
            data.audience || null, data.reason, crypto.randomUUID().replace(/-/g, "").slice(0, 16)]);
      }
      await client.query(`INSERT INTO referral_profiles(affiliate_id,terms_accepted_at) VALUES($1,now())
        ON CONFLICT(affiliate_id) DO UPDATE SET terms_accepted_at=now()`, [id]);
      await referralActivity(client, id, req.referralUser.id, existing ? "reapplied" : "applied");
      const event = `application:${id}:${crypto.randomUUID()}`;
      await enqueueNotification(client, event, process.env.OWNER_NOTIFICATION_EMAIL || "kayondoabass@gmail.com",
        referralApplicationOwnerAlert({ ...data, email: req.referralUser.email }));
      await enqueueNotification(client, `${event}:receipt`, req.referralUser.email, textAlert(
        "[BrightBoard] Referral application received",
        `Hello ${data.name},\n\nYour referral application has been received and is pending review.\nSign in with this email to view only your application at https://www.brightboardapp.com/affiliate\n\nWe will email you when a decision is made.`));
      return id;
    });
    res.json({ success: true, affiliateId: result });
  });
  app.post("/api/referrals/apply", applyLimiter, apply);
  // Backwards-compatible URLs, but never a public email-based bypass.
  app.post("/api/affiliates/apply", referralAccess, applyLimiter, apply);
  app.patch("/api/affiliates/:id", referralAccess, owner, (req, res) => {
    res.redirect(307, `/api/referrals/owner/${encodeURIComponent(String(req.params.id))}`);
  });
  app.get("/api/affiliates/status/:email", referralAccess, route(async (req, res) => {
    if (!req.referralUser.is_owner && req.params.email.toLowerCase() !== req.referralUser.email.toLowerCase()) fail("Not authorized", 403);
    const { rows: [affiliate] } = await pool.query("SELECT * FROM affiliates WHERE lower(email)=lower($1)", [req.params.email]);
    if (!affiliate) return res.json({ found: false });
    // Legacy client gets only its own record and no private audit notes.
    res.json({ found: true, ...camelRow(affiliate) });
  }));

  app.get("/api/referrals/me", route(async (req, res) => {
    const affiliate = await ownAffiliate(req);
    res.json(affiliate ? await referralDetail(affiliate.id) : {
      affiliate: null, policy: await getReferralPolicy(), commissions: [], payouts: [], balances: [], activity: [], referrals: [],
    });
  }));
  app.patch("/api/referrals/me/payout-details", route(async (req, res) => {
    const data = z.object({ payoutMethod: z.enum(["paypal", "bank"]), payoutDetails: z.string().trim().min(5).max(1000) }).parse(req.body);
    const affiliate = await ownAffiliate(req);
    if (!affiliate) fail("Apply to the referral program first", 404);
    await transaction(async client => {
      await client.query(`INSERT INTO referral_profiles(affiliate_id,payout_method,payout_details) VALUES($1,$2,$3)
        ON CONFLICT(affiliate_id) DO UPDATE SET payout_method=$2,payout_details=$3`, [affiliate.id, data.payoutMethod, data.payoutDetails]);
      await referralActivity(client, affiliate.id, req.referralUser.id, "payout_details_updated");
    });
    res.json({ success: true });
  }));
  app.post("/api/referrals/me/payouts", route(async (req, res) => {
    const { currency } = z.object({ currency: z.string().regex(/^[A-Z]{3}$/) }).parse(req.body);
    const result = await transaction(async client => {
      const affiliate = await ownAffiliate(req, client);
      if (!affiliate || affiliate.status !== "approved") fail("Only approved partners can request a payout");
      await client.query("SELECT id FROM affiliates WHERE id=$1 FOR UPDATE", [affiliate.id]);
      const policy = await getReferralPolicy(client);
      const { rows: [profile] } = await client.query("SELECT * FROM referral_profiles WHERE affiliate_id=$1", [affiliate.id]);
      if (!profile?.payout_method || !profile.payout_details) fail("Save payout details first");
      await settleHeldCommissions(client);
      const { rows: commissions } = await client.query(`SELECT * FROM referral_commissions
        WHERE affiliate_id=$1 AND currency=$2 AND status='available' AND payout_id IS NULL FOR UPDATE`, [affiliate.id, currency]);
      const amount = commissions.reduce((n, c) => n + c.amount, 0);
      const minimum = policy.minimumByCurrency[currency];
      if (!minimum) fail("The founder must configure a payout minimum for this currency");
      if (amount < minimum) fail(`Minimum payout is ${currency} ${(minimum / 100).toFixed(2)}`);
      const id = crypto.randomUUID();
      await client.query(`INSERT INTO referral_payouts(id,affiliate_id,currency,amount,method,details)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, affiliate.id, currency, amount, profile.payout_method, profile.payout_details]);
      await client.query("UPDATE referral_commissions SET payout_id=$1 WHERE id=ANY($2::text[])", [id, commissions.map(c => c.id)]);
      await referralActivity(client, affiliate.id, req.referralUser.id, "payout_requested", `${currency} ${(amount / 100).toFixed(2)}`);
      return id;
    });
    res.json({ success: true, payoutId: result });
  }));

  app.use("/api/referrals/owner", owner);
  app.get("/api/referrals/owner", route(async (req, res) => {
    const q = String(req.query.q || "").slice(0, 120), status = String(req.query.status || "");
    const page = Math.max(1, Math.min(1000000, Math.floor(Number(req.query.page) || 1)));
    const pageSize = 50;
    const { rows } = await pool.query(`SELECT a.*,r.payout_method,r.payout_details FROM affiliates a
      LEFT JOIN referral_profiles r ON r.affiliate_id=a.id
      WHERE ($1='' OR a.name ILIKE '%'||$1||'%' OR a.email ILIKE '%'||$1||'%' OR a.referral_code ILIKE '%'||$1||'%')
      AND ($2='' OR $2='all' OR a.status=$2) ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`, [q, status, pageSize, (page - 1) * pageSize]);
    const { rows: [total] } = await pool.query(`SELECT count(*)::integer AS total FROM affiliates a
      WHERE ($1='' OR a.name ILIKE '%'||$1||'%' OR a.email ILIKE '%'||$1||'%' OR a.referral_code ILIKE '%'||$1||'%')
      AND ($2='' OR $2='all' OR a.status=$2)`, [q, status]);
    const { rows: counts } = await pool.query("SELECT status,count(*)::integer AS count FROM affiliates GROUP BY status");
    const { rows: payouts } = await pool.query("SELECT p.*,a.name AS affiliate_name FROM referral_payouts p JOIN affiliates a ON a.id=p.affiliate_id ORDER BY p.created_at DESC");
    res.json({ affiliates: rows.map(camelRow), payouts: payouts.map(camelRow), policy: await getReferralPolicy(),
      counts: Object.fromEntries(counts.map(c => [c.status, c.count])),
      pagination: { page, pageSize, total: total.total, totalPages: Math.max(1, Math.ceil(total.total / pageSize)) } });
  }));
  app.patch("/api/referrals/owner/policy", route(async (req, res) => {
    const { confirmed, ...data } = policySchema.parse(req.body);
    await pool.query(`UPDATE referral_policy SET config=$1,effective_from=COALESCE(effective_from,CASE WHEN $2 THEN now() END),updated_at=now() WHERE id=1`, [data, data.active]);
    res.json({ success: true, policy: await getReferralPolicy() });
  }));
  app.post("/api/referrals/owner/reconcile", route(async (req, res) => {
    const affiliateId = req.body.affiliateId ? z.string().uuid().parse(req.body.affiliateId) : null;
    const { rows } = await pool.query(`SELECT p.id FROM payments p JOIN users u ON u.id=p.user_id
      JOIN affiliates a ON a.referral_code=u.referred_by JOIN referral_policy rp ON rp.id=1
      WHERE p.status='completed' AND p.created_at>=rp.effective_from AND ($1::text IS NULL OR a.id=$1)
      AND NOT EXISTS(SELECT 1 FROM referral_commissions c WHERE c.payment_id=p.id)`, [affiliateId]);
    for (const row of rows) await recordReferralCommission(row.id);
    res.json({ success: true, checked: rows.length });
  }));
  app.get("/api/referrals/owner/export", route(async (req, res) => {
    const id = req.query.affiliateId ? String(req.query.affiliateId) : null;
    const { rows } = await pool.query(`SELECT a.name,a.email,c.order_id,c.currency,c.amount,c.status,c.created_at
      FROM referral_commissions c JOIN affiliates a ON a.id=c.affiliate_id
      WHERE ($1::text IS NULL OR c.affiliate_id=$1) ORDER BY c.created_at DESC`, [id]);
    res.type("text/csv").attachment("brightboard-referral-commissions.csv").send([
      ["Partner", "Email", "Order", "Currency", "Amount", "Status", "Created"].map(safeCsv).join(","),
      ...rows.map(r => [r.name, r.email, r.order_id, r.currency, (r.amount / 100).toFixed(2), r.status, r.created_at.toISOString()].map(safeCsv).join(",")),
    ].join("\r\n"));
  }));
  app.get("/api/referrals/owner/notifications", route(async (_req, res) => {
    const { rows } = await pool.query(`SELECT id,event_key,subject,status,attempts,last_error,created_at,sent_at
      FROM referral_notifications ORDER BY created_at DESC LIMIT 200`);
    res.json({ notifications: rows.map(camelRow) });
  }));
  app.post("/api/referrals/owner/notifications/:id/retry", route(async (req, res) => {
    await transaction(async client => {
      const { rows: [mail] } = await client.query("SELECT * FROM referral_notifications WHERE id=$1 FOR UPDATE", [req.params.id]);
      if (!mail) fail("Notification not found", 404);
      if (mail.status === "unknown" && req.body.acknowledgeDuplicateRisk !== true) fail("Check inbox first, then acknowledge duplicate delivery risk");
      if (!["failed", "unknown"].includes(mail.status)) fail("Only failed or uncertain messages can be retried");
      await client.query("UPDATE referral_notifications SET status='pending',last_error=NULL WHERE id=$1", [mail.id]);
    });
    res.json({ success: true });
  }));
  app.post("/api/referrals/owner/payouts/:id", route(async (req, res) => {
    const data = z.object({ status: z.enum(["approved", "paid", "rejected"]), reference: z.string().trim().max(250).optional(), note: z.string().trim().max(2000).optional() }).parse(req.body);
    await transaction(async client => {
      const { rows: [payout] } = await client.query("SELECT * FROM referral_payouts WHERE id=$1 FOR UPDATE", [req.params.id]);
      if (!payout) fail("Payout not found", 404);
      if (["paid", "rejected"].includes(payout.status)) fail("This payout is already finalized", 409);
      if (data.status === "paid" && (payout.status !== "approved" || !data.reference)) fail("Approve first, then provide the actual transfer reference before marking paid");
      await client.query("UPDATE referral_payouts SET status=$2,reference=$3,note=$4,updated_at=now() WHERE id=$1", [payout.id, data.status, data.reference || null, data.note || null]);
      if (data.status === "paid") await client.query("UPDATE referral_commissions SET status='paid' WHERE payout_id=$1", [payout.id]);
      if (data.status === "rejected") await client.query("UPDATE referral_commissions SET payout_id=NULL WHERE payout_id=$1", [payout.id]);
      await referralActivity(client, payout.affiliate_id, req.referralUser.id, `payout_${data.status}`, data.reference || "");
    });
    res.json({ success: true });
  }));
  app.post("/api/referrals/owner/commissions/:id", route(async (req, res) => {
    const data = z.object({ action: z.enum(["release", "reverse"]), note: z.string().trim().min(3).max(2000) }).parse(req.body);
    await transaction(async client => {
      const { rows: [commission] } = await client.query("SELECT * FROM referral_commissions WHERE id=$1 FOR UPDATE", [req.params.id]);
      if (!commission) fail("Commission not found", 404);
      if (commission.payout_id || ["paid", "reversed"].includes(commission.status)) fail("Finalize/reject the payout first; paid or reversed commissions cannot be edited");
      if (data.action === "release" && commission.status !== "held") fail("Only held commissions can be released");
      await client.query("UPDATE referral_commissions SET status=$2,note=$3 WHERE id=$1", [commission.id, data.action === "release" ? "available" : "reversed", data.note]);
      await referralActivity(client, commission.affiliate_id, req.referralUser.id, `commission_${data.action}`, `Commission ${commission.id.slice(0, 8)}`);
      await referralActivity(client, commission.affiliate_id, req.referralUser.id, "commission_note", data.note, true);
    });
    res.json({ success: true });
  }));
  app.get("/api/referrals/owner/:id", route(async (req, res) => {
    const detail = await referralDetail(req.params.id, true);
    if (!detail) fail("Application not found", 404);
    res.json(detail);
  }));
  app.patch("/api/referrals/owner/:id", route(async (req, res) => {
    const data = z.object({ status: z.enum(["approved", "rejected", "suspended", "pending"]).optional(),
      note: z.string().trim().max(4000).optional(), rejectedReason: z.string().trim().max(2000).optional() }).parse(req.body);
    if (!data.status && !data.note) fail("Provide a status or note");
    await transaction(async client => {
      const { rows: [affiliate] } = await client.query("SELECT * FROM affiliates WHERE id=$1 FOR UPDATE", [req.params.id]);
      if (!affiliate) fail("Application not found", 404);
      if (data.note) await referralActivity(client, affiliate.id, req.referralUser.id, "founder_note", data.note, true);
      if (data.status && data.status !== affiliate.status) {
        await client.query(`UPDATE affiliates SET status=$2::varchar,
          approved_at=CASE WHEN $2::varchar='approved' THEN COALESCE(approved_at,now()) ELSE approved_at END,
          rejected_reason=CASE WHEN $2::varchar='rejected' THEN $3::varchar ELSE NULL END WHERE id=$1`, [affiliate.id, data.status, data.rejectedReason || null]);
        await referralActivity(client, affiliate.id, req.referralUser.id, `status_${data.status}`, data.status === "rejected" ? data.rejectedReason || "" : "");
        const message = data.status === "approved"
          ? `Your referral application is approved.\nYour link: https://www.brightboardapp.com/signup?ref=${affiliate.referral_code}\nCommission eligibility follows the founder-confirmed policy displayed in your workspace.`
          : `Your referral application status is now ${data.status}.${data.status === "rejected" && data.rejectedReason ? `\nReason: ${data.rejectedReason}` : ""}`;
        await enqueueNotification(client, `decision:${affiliate.id}:${crypto.randomUUID()}`, affiliate.email,
          textAlert(`[BrightBoard] Referral application ${data.status}`, `${message}\n\nView your account: https://www.brightboardapp.com/affiliate`));
      }
    });
    res.json({ success: true });
  }));
}
