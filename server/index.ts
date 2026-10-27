import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./replit_integrations/auth";
import path from "path";
import { registerChatbotWidget } from "./chatbot-widget";
import { initializeReferralSchema } from "./referral-store";
import { startReferralNotificationWorker } from "./referral-notifications";
import { createTvRelay } from "../packages/brightboard-tv/server/relay";
import { getUserById } from "./customAuthService";
import { canSaveTVLibrary } from "./tv-library-access";
import { afroaiSessionGuard } from "./afroaiSessionGuard";
import { paymentSecurityHeaders } from "./payment-security";
import { initializePaymentCheckoutSchema } from "./payment-checkout-schema";

// ── Global crash guards — keep the process alive if any async error escapes ──
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception (process kept alive):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection (process kept alive):", reason);
});

const app = express();
app.use(paymentSecurityHeaders);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && !path.startsWith("/api/chatbot-widget/") && !path.startsWith("/api/auth/") &&
        !path.startsWith("/api/referrals") && !path.startsWith("/api/affiliates") && !path.startsWith("/api/tv") &&
        !path.startsWith("/api/settings")) {
        if (!path.startsWith("/api/pesapal") && !path.startsWith("/api/payments")) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await initializeReferralSchema();
  await initializePaymentCheckoutSchema();
  const tvRelay = createTvRelay({ hostedLibrary: true, pageLimitForRequest: async (req: any) => {
    const user = req.session?.userId ? await getUserById(req.session.userId) : null;
    return canSaveTVLibrary(user) ? 20 : 10;
  } });
  httpServer.on("close", () => tvRelay.close());
  const tvDirectory = process.env.NODE_ENV === "production"
    ? path.resolve("dist/public/tv") : path.resolve("packages/brightboard-tv/dist");
  app.get(/^\/tv$/, (_req, res) => res.redirect(302, "/tv/"));
  app.use("/tv", express.static(tvDirectory, { index: "index.html" }));
  app.use("/tv-assets", express.static(path.join(tvDirectory, "tv-assets")));
  registerChatbotWidget(app);
  await setupAuth(app);
  // Creation reads account entitlements before registerRoutes' general guard.
  // Pairing/join/state endpoints intentionally use their own presentation keys.
  app.post("/api/tv/sessions", afroaiSessionGuard);
  app.use("/api/tv", tvRelay.router);
  
  await registerRoutes(httpServer, app);
  startReferralNotificationWorker();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  (async () => {
    try {
      const { sql: rawSql } = await import("drizzle-orm");
      const { db } = await import("./db");
      await db.execute(rawSql`
        INSERT INTO login_events (user_id, created_at)
        SELECT id, created_at FROM users
        WHERE id NOT IN (SELECT user_id FROM login_events)
      `);
      console.log("[backfill] Login events synced for all existing users");
    } catch (err) {
      console.error("[backfill] Login event backfill error:", err);
    }
  })();

  const scheduleActivationEmails = async () => {
    try {
      const { sendActivationEmail } = await import('./emailService');
      const { lt, isNull, and, eq, inArray } = await import('drizzle-orm');
      const { users, featureUsage } = await import('@shared/schema');
      const { db } = await import('./db');
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const eligibleUsers = await db.select().from(users).where(
        and(lt(users.createdAt, twentyFourHoursAgo), isNull(users.activationEmailSentAt), eq(users.emailVerified, true))
      );
      if (!eligibleUsers.length) return;
      const generatedRows = await db.selectDistinct({ userId: featureUsage.userId }).from(featureUsage)
        .where(inArray(featureUsage.userId, eligibleUsers.map(u => u.id)));
      const generatedIds = new Set(generatedRows.map(r => r.userId));
      const neverGenerated = eligibleUsers.filter(u => !generatedIds.has(u.id));
      for (const u of neverGenerated) {
        if (!u.email) continue;
        const ok = await sendActivationEmail(u.email, u.firstName ?? 'Teacher');
        if (ok) await db.update(users).set({ activationEmailSentAt: new Date() }).where(eq(users.id, u.id));
      }
      if (neverGenerated.length > 0) console.log(`[activation] Sent ${neverGenerated.length} activation email(s)`);
    } catch (err) {
      console.error('[activation] Error in scheduled email job:', err);
    }
  };
  // Use void + catch so any rejection is logged, never unhandled
  setTimeout(() => {
    void scheduleActivationEmails().catch(e => console.error('[activation] scheduler error:', e));
    setInterval(() => {
      void scheduleActivationEmails().catch(e => console.error('[activation] scheduler error:', e));
    }, 4 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  // Serve flashcard images from root public/ in both dev and production
  app.use("/flashcard-images", express.static(path.join(process.cwd(), "public", "flashcard-images")));

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
