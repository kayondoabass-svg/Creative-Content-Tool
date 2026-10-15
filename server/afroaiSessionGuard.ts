import type { Request, Response, NextFunction } from "express";
import { afroaiVerifySession, matchesAfroEmail } from "./afroaiAuthService";

// Recovery/login/logout must remain usable even when an old token is invalid.
const publicAuthPaths = new Set([
  "/auth/signup", "/auth/login", "/auth/logout", "/auth/forgot-password",
  "/auth/reset-password", "/auth/verify-email", "/auth/resend-code",
  "/auth/social-providers", "/auth/recaptcha-key",
  "/auth/google", "/auth/google/callback", "/auth/facebook",
  "/auth/facebook/callback", "/auth/tiktok", "/auth/tiktok/callback",
]);

export async function afroaiSessionGuard(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.userId || !session.afroaiToken || publicAuthPaths.has(req.path)) return next();
  const result = await afroaiVerifySession(session.afroaiToken);
  if (!result.ok) {
    // A provider outage or a misconfigured rotated key is not a revoked session.
    return res.status(503).json({ error: "Unable to verify your login right now. Please try again." });
  }
  if (!matchesAfroEmail(result, session.afroaiEmail || session.user?.email || "")) {
    session.destroy(() => {});
    res.clearCookie("connect.sid");
    if (req.path === "/auth/me") return res.json({ user: null });
    return res.status(401).json({ error: "Your session expired or was revoked. Please sign in again." });
  }
  return next();
}
