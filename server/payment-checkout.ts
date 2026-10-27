import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "./db";
import { transaction } from "./referral-store";
import { getTierPrice, isConfigured, submitOrder } from "./pesapalService";
import { paymentView, verifyPayment } from "./payment-verification";
import { paymentBaseUrl, requirePaymentOrigin } from "./payment-security";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const checkoutLimiter = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: true, legacyHeaders: false });

export function registerPaymentCheckoutRoutes(app: Express, provider = { isConfigured, submitOrder }) {
  app.post("/api/pesapal/checkout", requirePaymentOrigin, checkoutLimiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Please sign in to subscribe" });
    const { tier, currency, attemptId } = req.body || {};
    if (!["weekly", "monthly", "institution"].includes(tier) || !uuid.test(attemptId || "") ||
        typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ error: "Invalid checkout request" });
    }
    const price = getTierPrice(tier, currency);
    if (!price) return res.status(400).json({ error: "Unsupported plan or currency" });
    if (!provider.isConfigured()) return res.status(503).json({ error: "Payments are not configured yet. Please contact BrightBoard support." });
    let orderId: string | undefined;
    try {
      const order = await transaction(async client => {
        // Serialize order creation for an account, not the network request.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`checkout:${userId}`]);
        const { rows: [existing] } = await client.query(`SELECT c.*,p.tier,p.currency FROM payment_checkouts c
          JOIN payments p ON p.id=c.payment_id WHERE c.user_id=$1 AND
          (c.attempt_id=$2 OR (p.tier=$3 AND p.currency=$4 AND p.status='pending' AND
           c.created_at>now()-interval '30 minutes' AND c.creation_state<>'creation_failed'))
          ORDER BY (c.attempt_id=$2) DESC,c.created_at DESC LIMIT 1`, [userId, attemptId, tier, currency]);
        if (existing) {
          if (existing.tier !== tier || existing.currency !== currency) throw new Error("Attempt mismatch");
          return { orderId: existing.order_id, create: false };
        }
        const reference = `BB-${crypto.randomUUID()}`;
        const { rows: [p] } = await client.query(`INSERT INTO payments(user_id,order_id,amount,currency,tier,status)
          VALUES($1,$2,$3,$4,$5,'pending') RETURNING id`, [userId, reference, Math.round(price.amount * 100), price.currency, tier]);
        await client.query(`INSERT INTO payment_checkouts(order_id,payment_id,user_id,attempt_id)
          VALUES($1,$2,$3,$4)`, [reference, p.id, userId, attemptId]);
        return { orderId: reference, create: true };
      });
      const reference = String(order.orderId);
      orderId = reference;
      if (order.create) {
        const { rows: [user] } = await pool.query("SELECT email,first_name,last_name FROM users WHERE id=$1", [userId]);
        if (!user?.email) throw new Error("Customer email missing");
        const base = paymentBaseUrl(req);
        const result = await provider.submitOrder({ merchantReference: reference, userId, email: user.email,
          firstName: user.first_name || "", lastName: user.last_name || "", amount: price.amount,
          currency: price.currency, tier, callbackUrl: `${base}/api/pesapal/callback`,
          ipnUrl: `${base}/api/pesapal/ipn` });
        await pool.query("UPDATE payment_checkouts SET checkout_url=$2,creation_state='ready' WHERE order_id=$1", [reference, result.redirectUrl]);
      }
      const view = await paymentView(reference, userId, false);
      const { rows: [p] } = await pool.query("SELECT pesapal_tracking_id FROM payments WHERE order_id=$1 AND user_id=$2", [orderId, userId]);
      return res.json({ orderId, url: view?.checkoutUrl || null, orderTrackingId: p?.pesapal_tracking_id || null });
    } catch {
      // A timeout can mean an order WAS created at the provider. Never silently
      // resubmit an ambiguous attempt or reveal provider response bodies.
      if (orderId) {
        await pool.query("UPDATE payment_checkouts SET creation_state='creation_unknown' WHERE order_id=$1 AND creation_state='initializing'", [orderId]).catch(() => {});
        return res.json({ orderId, url: null, orderTrackingId: null });
      }
      return res.status(503).json({ error: "Unable to start checkout. Please try again." });
    }
  });

  app.get("/api/payments/:orderId", async (req: any, res, next) => {
    // Do not shadow existing named endpoints such as /api/payments/history.
    if (!/^BB-[a-z0-9-]+$/i.test(req.params.orderId)) return next();
    res.setHeader("Cache-Control", "no-store");
    if (!req.session?.userId) return res.status(401).json({ error: "Please sign in to check your payment" });
    try {
      const view = await paymentView(req.params.orderId, req.session.userId);
      if (!view) return res.status(404).json({ error: "Payment not found" });
      res.json(view);
    } catch { res.status(503).json({ error: "Unable to check payment right now. Please try again." }); }
  });

  app.get("/api/pesapal/callback", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const tracking = typeof req.query.OrderTrackingId === "string" ? req.query.OrderTrackingId : "";
    // A return is only a signal. Verification failure stays pending, not failed.
    let orderId: string | undefined;
    try {
      const { rows: [p] } = await pool.query("SELECT order_id FROM payments WHERE pesapal_tracking_id=$1 LIMIT 1", [tracking]);
      orderId = p?.order_id;
      if (orderId) await verifyPayment(tracking);
    } catch { console.warn("[payments] Callback awaiting verification"); }
    res.redirect(orderId ? `/checkout?order=${encodeURIComponent(orderId)}` : "/payment/callback");
  });

  app.get("/api/pesapal/ipn", async (req, res) => {
    const tracking = typeof req.query.OrderTrackingId === "string" ? req.query.OrderTrackingId : "";
    if (!tracking) return res.status(400).json({ error: "Missing tracking ID" });
    try {
      await verifyPayment(tracking);
      res.json({ orderNotificationType: req.query.OrderNotificationType, orderTrackingId: tracking, status: 200 });
    } catch {
      res.status(503).json({ error: "Payment notification could not be verified. Retry later." });
    }
  });
}
