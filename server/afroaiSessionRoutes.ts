import type { Express, Request, Response } from "express";
import {
  afroaiListSessions, afroaiRevokeSession, afroaiLogoutAll,
  afroaiVerifySession, matchesAfroEmail,
} from "./afroaiAuthService";

const unsupported = "Device management is available for Afro Auth sign-ins only. This Google or older local sign-in is unchanged. You can still sign out of this browser using the account menu.";

function credentials(req: Request, res: Response): string | null {
  res.setHeader("Cache-Control", "no-store");
  const session = (req as any).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Please sign in to manage your devices." });
    return null;
  }
  if (!session.afroaiToken) {
    res.status(409).json({ supported: false, error: unsupported });
    return null;
  }
  return session.afroaiToken;
}

function clearLocal(req: Request, res: Response) {
  (req as any).session.destroy((err: unknown) => {
    res.clearCookie("connect.sid");
    if (err) return res.status(500).json({ error: "Provider sign-out succeeded, but this browser could not finish signing out. Reload and sign in again." });
    res.json({ success: true, signedOut: true });
  });
}

// Mount after afroaiSessionGuard: every request must first verify live identity.
export function registerAfroSessionRoutes(app: Express) {
  app.get("/api/auth/sessions", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const session = (req as any).session;
    if (session?.userId && !session.afroaiToken) {
      return res.json({ supported: false, message: unsupported, sessions: [] });
    }
    const token = credentials(req, res);
    if (!token) return;
    const result = await afroaiListSessions(token);
    if (!result.ok) return res.status(result.status >= 500 ? 503 : result.status).json({ error: result.error });
    res.json({ supported: true, sessions: result.sessions });
  });

  app.delete("/api/auth/sessions/:id", async (req, res) => {
    const token = credentials(req, res);
    if (!token) return;
    const id = req.params.id;
    if (typeof id !== "string" || !id || id.length > 256 || id.includes(".")) {
      return res.status(400).json({ error: "Invalid device session." });
    }
    // Never trust a browser-supplied ID as proof of ownership.
    const owned = await afroaiListSessions(token);
    if (!owned.ok) return res.status(503).json({ error: "Unable to check your devices. Please try again." });
    if (!owned.sessions?.some(row => row.id === id)) {
      return res.status(404).json({ error: "That session is not in your active devices. Refresh the list." });
    }
    const revoked = await afroaiRevokeSession(token, id);
    if (!revoked.ok) return res.status(revoked.status >= 500 ? 503 : revoked.status).json({ error: "The provider could not revoke that session. Refresh and try again." });
    // The provider may not identify the current device in its list. Check the
    // current token after deletion rather than guessing from browser metadata.
    const verified = await afroaiVerifySession(token);
    if (!verified.ok) return res.status(503).json({ error: "Revocation was accepted, but could not be verified. Refresh before trying again." });
    const session = (req as any).session;
    if (!matchesAfroEmail(verified, session.afroaiEmail || session.user?.email || "")) {
      return clearLocal(req, res);
    }
    const remaining = await afroaiListSessions(token);
    if (!remaining.ok || remaining.sessions?.some(row => row.id === id)) {
      return res.status(503).json({ error: "The device sign-out could not be confirmed. Refresh the list." });
    }
    res.json({ success: true, signedOut: false });
  });

  app.post("/api/auth/logout-all", async (req, res) => {
    const token = credentials(req, res);
    if (!token) return;
    if (req.body?.confirm !== true) {
      return res.status(400).json({ error: "Confirm sign-out on all Afro Auth devices, including this one." });
    }
    const result = await afroaiLogoutAll(token);
    if (!result.ok) return res.status(result.status >= 500 ? 503 : result.status).json({ error: "Unable to sign out everywhere. Your local sign-in has not been cleared; please try again." });
    // Other provider-linked local sessions fail the live guard on their next
    // request. Google/legacy local sessions are deliberately not deleted.
    clearLocal(req, res);
  });
}
