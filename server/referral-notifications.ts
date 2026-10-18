import { pool } from "./db";

let running = false;
export async function processReferralNotifications() {
  if (running) return;
  running = true;
  try {
    await pool.query(`UPDATE referral_notifications SET status='unknown',last_error='Interrupted delivery; check inbox before resending'
      WHERE status='sending' AND started_at<now()-interval '5 minutes'`);
    for (let i = 0; i < 10; i++) {
      const { rows: [mail] } = await pool.query(`UPDATE referral_notifications SET status='sending',attempts=attempts+1,started_at=now()
        WHERE id=(SELECT id FROM referral_notifications WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
        AND status='pending' RETURNING *`);
      if (!mail) break;
      let status = "failed", error = "Email key is not configured";
      if (process.env.AFROAI_EMAIL_API_KEY) {
        try {
          const response = await fetch("https://afroaigroup.com/api/email-api/send", {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AFROAI_EMAIL_API_KEY}` },
            body: JSON.stringify({
              from: process.env.AFROAI_EMAIL_FROM || "BrightBoard <noreply@brightboardapp.com>",
              to: mail.recipient, subject: mail.subject, html: mail.html, text: mail.body_text,
            }),
          });
          if (response.ok) {
            const data = await response.json().catch(() => null);
            if (data && data.success !== false && !data.error) { status = "sent"; error = ""; }
            else { status = "unknown"; error = "Provider returned an ambiguous acceptance response"; }
          } else {
            status = response.status >= 500 ? "unknown" : "failed";
            error = `Provider HTTP ${response.status}`;
          }
        } catch {
          status = "unknown";
          error = "Network timeout or interruption; delivery may have occurred";
        }
      }
      await pool.query(`UPDATE referral_notifications SET status=$2,last_error=$3,sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1`,
        [mail.id, status, error || null]);
    }
  } finally { running = false; }
}

export function startReferralNotificationWorker() {
  const tick = () => processReferralNotifications().catch(() => console.error("[referrals] Notification worker failed; queued messages retained"));
  const timer = setInterval(tick, 15000);
  timer.unref();
  void tick();
}
