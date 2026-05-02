import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./replit_integrations/auth";

const app = express();
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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await setupAuth(app);
  
  await registerRoutes(httpServer, app);

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
  setTimeout(() => { scheduleActivationEmails(); setInterval(scheduleActivationEmails, 4 * 60 * 60 * 1000); }, 10 * 60 * 1000);

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
