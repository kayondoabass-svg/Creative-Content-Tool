import type { Request, Response, NextFunction } from "express";

export function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid payment URL");
  const url = new URL(value);
  if (url.origin !== "https://pay.pesapal.com" || url.username || url.password ||
      !url.pathname.startsWith("/pesapaliframe/")) throw new Error("Unapproved payment URL");
  return url.href;
}

export function paymentSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Same-origin framing permits our own pages, never third-party framing.
  // Protect every page from outside framing. Restrict outgoing payment frames
  // on checkout documents without breaking unrelated advertising frames.
  const checkout = req.path === "/checkout" || req.path.startsWith("/payment/");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self'" +
    (checkout ? "; frame-src 'self' https://pay.pesapal.com" : ""));
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}

export function trustedPaymentOrigins() {
  const origins = new Set(["https://brightboardapp.com", "https://www.brightboardapp.com"]);
  if (process.env.APP_URL) origins.add(new URL(process.env.APP_URL).origin);
  if (process.env.NODE_ENV !== "production") {
    if (process.env.REPLIT_DEV_DOMAIN) origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");
  }
  return origins;
}

export function requirePaymentOrigin(req: Request, res: Response, next: NextFunction) {
  if (!trustedPaymentOrigins().has(req.get("origin") || "") || req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ error: "Start checkout from BrightBoard." });
  }
  next();
}

export function paymentBaseUrl(req: Request) {
  const origin = req.get("origin");
  if (origin && trustedPaymentOrigins().has(origin)) return origin;
  return process.env.APP_URL ? new URL(process.env.APP_URL).origin : "https://www.brightboardapp.com";
}
