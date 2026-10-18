import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";

const cookieName = "bb_referral";
const lifetime = 90 * 86400000;

export function referralToken(code: string, expires: number): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session secret is required for referral attribution");
  const value = `${code}.${expires}`;
  return `${value}.${crypto.createHmac("sha256", secret).update(value).digest("hex")}`;
}

export function validReferralToken(value: string | undefined): string | null {
  if (!value || value.length > 200) return null;
  const [code, expires, signature] = value.split(".");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(code || "") || !/^\d+$/.test(expires || "") ||
    !/^[a-f0-9]{64}$/.test(signature || "") || Number(expires) < Date.now() ||
    Number(expires) > Date.now() + lifetime + 60000) return null;
  try {
    const expected = referralToken(code, Number(expires)).split(".")[2];
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? code : null;
  } catch { return null; }
}

function readCookie(req: any): string | undefined {
  const raw = req.headers.cookie?.split(";").map((p: string) => p.trim()).find((p: string) => p.startsWith(`${cookieName}=`));
  if (!raw) return undefined;
  try { return decodeURIComponent(raw.slice(cookieName.length + 1)); } catch { return undefined; }
}

export async function captureReferral(req: Request, res: Response, next: NextFunction) {
  const code = typeof req.query.ref === "string" ? req.query.ref : "";
  if (req.method !== "GET" || !/^[a-zA-Z0-9_-]{1,64}$/.test(code)) return next();
  try {
    const { rows } = await pool.query("SELECT id FROM affiliates WHERE referral_code=$1 AND status='approved'", [code]);
    if (rows.length) {
      res.cookie(cookieName, referralToken(code, Date.now() + lifetime), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: lifetime, path: "/",
      });
      await pool.query("INSERT INTO referral_link_visits(id,affiliate_id) VALUES($1,$2)", [crypto.randomUUID(), rows[0].id]);
    }
    next();
  } catch { next(); }
}

export async function attachSignupReferral(req: any, userId: string, explicitCode?: unknown) {
  const cookieCode = validReferralToken(readCookie(req));
  // Only the current signup may use an explicit code; persisted referrals must
  // have a valid signed, unexpired cookie. Latest valid click wins.
  const code = typeof explicitCode === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(explicitCode) ? explicitCode : cookieCode;
  if (!code) return;
  await pool.query(`WITH attached AS (
    UPDATE users u SET referred_by=$2
    WHERE u.id=$1 AND u.referred_by IS NULL AND EXISTS(
      SELECT 1 FROM affiliates a WHERE a.referral_code=$2 AND a.status='approved'
      AND lower(a.email)<>lower(COALESCE(u.email,'')))
    RETURNING id)
    UPDATE affiliates SET total_referrals=total_referrals+(SELECT count(*) FROM attached)
    WHERE referral_code=$2`, [userId, code]);
}
