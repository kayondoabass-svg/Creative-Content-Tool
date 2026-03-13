import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContentSchema, fileConversionSchema, organizationSettingsSchema, videoExportSchema, type ContentType, type Slide, type Activity, type StoryboardFrame, type VideoOptions, type PresentationOptions, type WorksheetOptions, type ImageOptions, type TextOptions, type ActivityOptions } from "@shared/schema";
import OpenAI from "openai";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PDFExtract } from "pdf.js-extract";
import sharp from "sharp";
import PptxGenJS from "pptxgenjs";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { generateVideoFromStoryboard } from "./videoService";
import { jobQueue } from "./jobQueue";

// Custom authentication middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}
import * as paddleService from "./paddleService";
import crypto from "crypto";
import * as customAuth from "./customAuthService";
import { db } from "./db";
import { users, featureUsage, expenses, insertExpenseSchema, expenseCategories, generatedContent, affiliates, payments, type Expense, type InsertExpense } from "@shared/schema";
import * as pesapalService from "./pesapalService";
import { eq, count, sql, desc, gte, and, sum } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========== SEO & MONETIZATION FILES ==========
  // Served explicitly so they always work in production regardless of static file setup

  app.get("/googlecea605fb996bd1af.html", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("google-site-verification: googlecea605fb996bd1af.html");
  });

  app.get("/ads.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send("google.com, pub-8935590092792147, DIRECT, f08c47fec0942fa0");
  });

  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(
`User-agent: *
Allow: /
Allow: /blog
Allow: /about
Allow: /features
Allow: /how-it-works
Allow: /pricing
Allow: /contact
Allow: /privacy
Allow: /terms
Allow: /refund
Disallow: /api/
Disallow: /owner-dashboard
Disallow: /owner-expenses
Sitemap: https://www.brightboardapp.com/sitemap.xml`
    );
  });

  app.get("/sitemap.xml", (_req, res) => {
    const base = "https://www.brightboardapp.com";
    const now = new Date().toISOString().split("T")[0];
    const pages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/blog", priority: "0.9", changefreq: "weekly" },
      { url: "/blog/ai-classroom", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/engagement-strategies", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/visual-learning", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/gamification", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/time-saving", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/inclusive-education", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/lesson-planning", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/vocabulary-visual", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/worksheet-design", priority: "0.8", changefreq: "monthly" },
      { url: "/blog/mind-mapping", priority: "0.8", changefreq: "monthly" },
      { url: "/features", priority: "0.8", changefreq: "monthly" },
      { url: "/how-it-works", priority: "0.8", changefreq: "monthly" },
      { url: "/pricing", priority: "0.7", changefreq: "weekly" },
      { url: "/about", priority: "0.7", changefreq: "monthly" },
      { url: "/contact", priority: "0.6", changefreq: "monthly" },
      { url: "/privacy", priority: "0.5", changefreq: "yearly" },
      { url: "/terms", priority: "0.5", changefreq: "yearly" },
      { url: "/refund", priority: "0.5", changefreq: "yearly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${base}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  });

  // ========== CUSTOM AUTHENTICATION ROUTES ==========
  
  // Sign up with email/password
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, recaptchaToken, ref } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const result = await customAuth.signUp(email, password, firstName, lastName, recaptchaToken);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      // Track referral if ref code provided
      if (ref && result.userId) {
        try {
          const affiliate = await db.select().from(affiliates).where(eq(affiliates.referralCode, ref)).limit(1);
          if (affiliate[0] && affiliate[0].status === "approved") {
            await db.update(users).set({ referredBy: ref }).where(eq(users.id, result.userId));
            await db.update(affiliates).set({ totalReferrals: sql`${affiliates.totalReferrals} + 1` }).where(eq(affiliates.id, affiliate[0].id));
          }
        } catch (refErr) {
          console.error("Referral tracking error:", refErr);
        }
      }
      
      res.json({ message: result.message, userId: result.userId });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to sign up" });
    }
  });

  // Verify email with code
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }
      
      const result = await customAuth.verifyEmail(email, code);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend verification code
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const result = await customAuth.resendVerificationCode(email);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Resend code error:", error);
      res.status(500).json({ error: "Failed to resend code" });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const result = await customAuth.login(email, password);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Store user in session
      (req as any).session.userId = result.user.id;
      (req as any).session.user = result.user;
      
      res.json({ user: result.user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      const session = (req as any).session;
      const userId = session?.userId;
      
      // Debug log for troubleshooting CEO access
      if (req.query.debug === "ceo") {
        console.log("[Auth/Me Debug] Session keys:", Object.keys(session || {}));
        console.log("[Auth/Me Debug] userId:", userId);
        console.log("[Auth/Me Debug] session.user:", session?.user?.email);
      }
      
      if (!userId) {
        return res.json({ user: null });
      }
      
      const user = await customAuth.getUserById(userId);
      
      if (!user) {
        return res.json({ user: null });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const result = await customAuth.requestPasswordReset(email);
      res.json({ message: result.message });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to request password reset" });
    }
  });

  // Reset password with code
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const result = await customAuth.resetPassword(email, code, newPassword);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get reCAPTCHA site key (for frontend)
  app.get("/api/auth/recaptcha-key", async (req, res) => {
    res.json({ siteKey: process.env.RECAPTCHA_SITE_KEY || null });
  });

  // Public stats endpoint for landing page
  app.get("/api/public/stats", async (req, res) => {
    try {
      const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalContent = await db.select({ count: sql<number>`count(*)` }).from(generatedContent);
      
      res.json({
        totalUsers: Number(totalUsers[0]?.count || 0),
        totalContent: Number(totalContent[0]?.count || 0),
      });
    } catch (error) {
      console.error("Error fetching public stats:", error);
      res.json({ totalUsers: 0, totalContent: 0 });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }

      // Send contact notification email to support
      try {
        const { sendContactNotification } = await import("./emailService");
        await sendContactNotification(name, email, subject || "general", message);
      } catch (emailError) {
        console.error("Failed to send contact email:", emailError);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });

  // ========== NEWSLETTER SUBSCRIPTION ==========
  
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const { newsletterSubscribers } = await import("@shared/schema");
      
      const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase()));
      if (existing.length > 0) {
        if (existing[0].status === "unsubscribed") {
          await db.update(newsletterSubscribers)
            .set({ status: "active", unsubscribedAt: null })
            .where(eq(newsletterSubscribers.email, email.toLowerCase()));
          return res.json({ success: true, message: "Welcome back! You've been re-subscribed." });
        }
        return res.json({ success: true, message: "You're already subscribed!" });
      }

      await db.insert(newsletterSubscribers).values({
        email: email.toLowerCase(),
        name: name || null,
        status: "active",
      });

      try {
        const { sendNewsletterWelcomeEmail } = await import("./emailService");
        await sendNewsletterWelcomeEmail(email.toLowerCase(), name);
      } catch (emailError) {
        console.error("Failed to send newsletter welcome email:", emailError);
      }

      res.json({ success: true, message: "Successfully subscribed!" });
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.get("/api/newsletter/count", async (req, res) => {
    try {
      const { newsletterSubscribers } = await import("@shared/schema");
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.status, "active"));
      res.json({ count: Number(result[0]?.count || 0) });
    } catch (error) {
      res.json({ count: 0 });
    }
  });

  // ========== AFFILIATE PROGRAM ENDPOINTS ==========
  
  // Apply to affiliate program (public)
  app.post("/api/affiliates/apply", async (req, res) => {
    try {
      const { name, email, website, socialMedia, audience, reason } = req.body;
      if (!name || !email || !reason) {
        return res.status(400).json({ error: "Name, email, and reason are required" });
      }

      // Check if already applied
      const existing = await db.select().from(affiliates).where(eq(affiliates.email, email.toLowerCase())).limit(1);
      if (existing.length > 0) {
        const status = existing[0].status;
        if (status === "approved") {
          return res.json({ success: true, alreadyApproved: true, referralCode: existing[0].referralCode });
        }
        return res.status(400).json({ error: "An application with this email already exists" });
      }

      // Generate unique referral code
      const code = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "").substring(0, 8) + Math.random().toString(36).substring(2, 6);

      await db.insert(affiliates).values({
        name,
        email: email.toLowerCase(),
        website: website || null,
        socialMedia: socialMedia || null,
        audience: audience || null,
        reason,
        referralCode: code,
        status: "pending",
      });

      // Notify owner
      try {
        const { sendContactNotification } = await import("./emailService");
        await sendContactNotification(name, email, "partnership", `New affiliate application:\n\nName: ${name}\nEmail: ${email}\nWebsite: ${website || "N/A"}\nSocial Media: ${socialMedia || "N/A"}\nAudience: ${audience || "N/A"}\nReason: ${reason}`);
      } catch (e) {
        console.error("Failed to send affiliate notification:", e);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Affiliate apply error:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // Check affiliate status by email (public)
  app.get("/api/affiliates/status/:email", async (req, res) => {
    try {
      const result = await db.select().from(affiliates).where(eq(affiliates.email, req.params.email.toLowerCase())).limit(1);
      if (result.length === 0) {
        return res.json({ found: false });
      }
      const aff = result[0];
      res.json({
        found: true,
        status: aff.status,
        referralCode: aff.status === "approved" ? aff.referralCode : null,
        referralLink: aff.status === "approved" ? `https://www.brightboardapp.com/signup?ref=${aff.referralCode}` : null,
        totalReferrals: aff.totalReferrals,
        totalEarnings: aff.totalEarnings,
        appliedAt: aff.createdAt,
        approvedAt: aff.approvedAt,
        rejectedReason: aff.rejectedReason,
      });
    } catch (error) {
      console.error("Affiliate status error:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // Owner: List all affiliates
  app.get("/api/affiliates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isOwner) return res.status(403).json({ error: "Not authorized" });

      const allAffiliates = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
      res.json(allAffiliates);
    } catch (error) {
      console.error("List affiliates error:", error);
      res.status(500).json({ error: "Failed to list affiliates" });
    }
  });

  // Owner: Approve/reject affiliate
  app.patch("/api/affiliates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]?.isOwner) return res.status(403).json({ error: "Not authorized" });

      const { status, rejectedReason } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be approved or rejected" });
      }

      const updateData: any = { status };
      if (status === "approved") {
        updateData.approvedAt = new Date();
      }
      if (status === "rejected" && rejectedReason) {
        updateData.rejectedReason = rejectedReason;
      }

      await db.update(affiliates).set(updateData).where(eq(affiliates.id, req.params.id));

      // Get affiliate to send email notification
      const aff = await db.select().from(affiliates).where(eq(affiliates.id, req.params.id)).limit(1);
      if (aff[0]) {
        try {
          const { sendAffiliateStatusEmail } = await import("./emailService");
          await sendAffiliateStatusEmail(aff[0].name, aff[0].email, status, aff[0].referralCode, rejectedReason);
        } catch (e) {
          console.error("Failed to send affiliate status email:", e);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Update affiliate error:", error);
      res.status(500).json({ error: "Failed to update affiliate" });
    }
  });

  // Emergency CEO account delete (for fresh start)
  app.post("/api/auth/emergency-delete", async (req, res) => {
    try {
      const { email, adminKey } = req.body;
      const CEO_EMAIL = "kayondoabass@gmail.com";
      const ADMIN_KEY = process.env.ADMIN_RESET_KEY || "brightboard-emergency-2026";
      
      if (email?.toLowerCase() !== CEO_EMAIL) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (adminKey !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
      }
      
      const result = await customAuth.deleteUser(email);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: "Account deleted. You can now sign up fresh." });
    } catch (error) {
      console.error("Emergency delete error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Emergency CEO password reset (for bootstrapping when email isn't configured)
  app.post("/api/auth/emergency-reset", async (req, res) => {
    try {
      const { email, newPassword, adminKey } = req.body;
      const CEO_EMAIL = "kayondoabass@gmail.com";
      const ADMIN_KEY = process.env.ADMIN_RESET_KEY || "brightboard-emergency-2026";
      
      // Only allow for CEO email with correct admin key
      if (email?.toLowerCase() !== CEO_EMAIL) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (adminKey !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
      }
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const result = await customAuth.emergencyPasswordReset(email, newPassword);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
      console.error("Emergency reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ========== END CUSTOM AUTH ROUTES ==========

  // ========== OWNER DASHBOARD ROUTES ==========
  
  // Middleware to check if user is owner
  async function isOwnerMiddleware(req: any, res: any, next: any) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await customAuth.getUserById(userId);
    if (!user || !user.isOwner) {
      return res.status(403).json({ error: "Access denied. Owner only." });
    }
    
    return next();
  }

  // Get owner dashboard statistics
  app.get("/api/owner/stats", isOwnerMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total users
      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      const totalUsers = totalUsersResult?.count || 0;

      // New users today
      const [newTodayResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, today));
      const newUsersToday = newTodayResult?.count || 0;

      // New users this week
      const [newWeekResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, weekAgo));
      const newUsersWeek = newWeekResult?.count || 0;

      // New users this month
      const [newMonthResult] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, monthAgo));
      const newUsersMonth = newMonthResult?.count || 0;

      // Subscription breakdown
      const subscriptionStats = await db
        .select({
          tier: users.subscriptionTier,
          status: users.subscriptionStatus,
          count: count(),
        })
        .from(users)
        .groupBy(users.subscriptionTier, users.subscriptionStatus);

      // Active premium subscribers
      const premiumCount = subscriptionStats
        .filter(s => s.tier !== "free" && s.status === "active")
        .reduce((sum, s) => sum + Number(s.count), 0);

      // Free users
      const freeCount = subscriptionStats
        .filter(s => s.tier === "free" || s.status !== "active")
        .reduce((sum, s) => sum + Number(s.count), 0);

      // Feature usage stats
      const [totalGenerationsResult] = await db
        .select({ count: count() })
        .from(featureUsage);
      const totalGenerations = totalGenerationsResult?.count || 0;

      // Generations by type
      const generationsByType = await db
        .select({
          type: featureUsage.featureType,
          count: count(),
        })
        .from(featureUsage)
        .groupBy(featureUsage.featureType);

      // Recent signups (last 10)
      const recentSignups = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          subscriptionTier: users.subscriptionTier,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(10);

      res.json({
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersWeek,
          newThisMonth: newUsersMonth,
          premium: premiumCount,
          free: freeCount,
        },
        content: {
          totalGenerations,
          byType: generationsByType,
        },
        subscriptions: subscriptionStats,
        recentSignups: recentSignups.map(u => ({
          id: u.id,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown",
          email: u.email,
          createdAt: u.createdAt,
          tier: u.subscriptionTier,
        })),
      });
    } catch (error) {
      console.error("Owner stats error:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  app.get("/api/owner/revenue", isOwnerMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const currentYear = now.getFullYear();
      const yearStart = new Date(currentYear, 0, 1);

      const completedPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.status, "completed"))
        .orderBy(desc(payments.createdAt));

      const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const revenueThisMonth = completedPayments
        .filter(p => p.createdAt >= thirtyDaysAgo)
        .reduce((sum, p) => sum + p.amount, 0);
      const revenueToday = completedPayments
        .filter(p => p.createdAt >= today)
        .reduce((sum, p) => sum + p.amount, 0);
      const revenueThisYear = completedPayments
        .filter(p => p.createdAt >= yearStart)
        .reduce((sum, p) => sum + p.amount, 0);

      const byTier: Record<string, { count: number; revenue: number }> = {};
      const byMethod: Record<string, { count: number; revenue: number }> = {};
      const byCurrency: Record<string, { count: number; revenue: number }> = {};

      completedPayments.forEach(p => {
        const tier = p.tier || "unknown";
        if (!byTier[tier]) byTier[tier] = { count: 0, revenue: 0 };
        byTier[tier].count++;
        byTier[tier].revenue += p.amount;

        const method = p.paymentMethod || "unknown";
        if (!byMethod[method]) byMethod[method] = { count: 0, revenue: 0 };
        byMethod[method].count++;
        byMethod[method].revenue += p.amount;

        const currency = p.currency || "UGX";
        if (!byCurrency[currency]) byCurrency[currency] = { count: 0, revenue: 0 };
        byCurrency[currency].count++;
        byCurrency[currency].revenue += p.amount;
      });

      const monthlyTrend: Record<string, number> = {};
      completedPayments.forEach(p => {
        const monthKey = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
        monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + p.amount;
      });
      const sortedMonthlyTrend = Object.entries(monthlyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount }));

      const vatRate = 0.18;
      const estimatedVAT = Math.round(revenueThisYear * vatRate / (1 + vatRate));
      const incomeBeforeVAT = revenueThisYear - estimatedVAT;

      const allPayments = await db
        .select({
          id: payments.id,
          userId: payments.userId,
          orderId: payments.orderId,
          amount: payments.amount,
          currency: payments.currency,
          tier: payments.tier,
          status: payments.status,
          paymentMethod: payments.paymentMethod,
          confirmationCode: payments.confirmationCode,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .orderBy(desc(payments.createdAt))
        .limit(50);

      res.json({
        totals: {
          allTime: totalRevenue,
          thisYear: revenueThisYear,
          thisMonth: revenueThisMonth,
          today: revenueToday,
          totalTransactions: completedPayments.length,
        },
        byTier,
        byMethod,
        byCurrency,
        monthlyTrend: sortedMonthlyTrend,
        tax: {
          tin: "1008176770",
          businessName: "Keyo Technologies",
          registrationNumber: "80030812159711",
          address: "P.O. Box 22900, Kampala, Central Division, Nakivuubo Shauriyako Parish, Uganda",
          vatRate: 18,
          estimatedVAT,
          incomeBeforeVAT,
          taxableRevenue: revenueThisYear,
          financialYear: `${currentYear}`,
        },
        recentPayments: allPayments,
      });
    } catch (error) {
      console.error("Owner revenue error:", error);
      res.status(500).json({ error: "Failed to fetch revenue data" });
    }
  });

  // Get all users for owner
  app.get("/api/owner/users", isOwnerMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          lastActiveAt: users.lastActiveAt,
          subscriptionTier: users.subscriptionTier,
          subscriptionStatus: users.subscriptionStatus,
          emailVerified: users.emailVerified,
          country: users.country,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db.select({ count: count() }).from(users);

      res.json({
        users: allUsers,
        pagination: {
          page,
          limit,
          total: totalResult?.count || 0,
          pages: Math.ceil((totalResult?.count || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get daily signup trend (last 30 days)
  app.get("/api/owner/trends", isOwnerMiddleware, async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get signups per day for the last 30 days
      const signupTrend = await db
        .select({
          date: sql<string>`DATE(${users.createdAt})`.as("date"),
          count: count(),
        })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`);

      // Get generations per day
      const generationTrend = await db
        .select({
          date: sql<string>`DATE(${featureUsage.createdAt})`.as("date"),
          count: count(),
        })
        .from(featureUsage)
        .where(gte(featureUsage.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${featureUsage.createdAt})`)
        .orderBy(sql`DATE(${featureUsage.createdAt})`);

      res.json({
        signups: signupTrend,
        generations: generationTrend,
      });
    } catch (error) {
      console.error("Get trends error:", error);
      res.status(500).json({ error: "Failed to fetch trends" });
    }
  });

  // ========== END OWNER DASHBOARD ROUTES ==========

  // Get all generated content
  app.get("/api/content", async (req, res) => {
    try {
      const content = await storage.getAllContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get single content item
  app.get("/api/content/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const content = await storage.getContent(id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Delete content
  app.delete("/api/content/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ error: "Failed to delete content" });
    }
  });

  // Get organization settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getOrganizationSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update organization settings (logo, name)
  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = organizationSettingsSchema.partial().parse(req.body);
      
      // Validate logo if provided
      if (validatedData.logo) {
        const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
        if (!dataUrlPattern.test(validatedData.logo)) {
          return res.status(400).json({ error: "Invalid logo format. Please upload a PNG, JPEG, GIF, WebP, or SVG image." });
        }
        // Base64 is ~4/3 the size of the original, so 10MB base64 = ~7.5MB file
        if (validatedData.logo.length > 10 * 1024 * 1024) {
          return res.status(400).json({ error: "Logo too large. Please use an image under 7MB." });
        }
      }
      
      const settings = await storage.updateOrganizationSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Generate logo using AI
  app.post("/api/generate-logo", async (req, res) => {
    try {
      const { name, style, colors, colorScheme } = req.body;
      
      // Check authentication - premium feature only
      const sessionUserId = (req as any).session?.userId;
      const sessionUser = (req as any).session?.user;
      if (!sessionUserId) {
        return res.status(401).json({ error: "Please sign in to generate logos" });
      }
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = sessionUser?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      
      // Check subscription status - premium feature (CEO gets bypass)
      if (!isCEO) {
        const subscriptionStatus = await stripeService.getSubscriptionStatus(sessionUserId);
        if (!subscriptionStatus.isPremium) {
          return res.status(403).json({ 
            error: "Logo generation is a premium feature. Upgrade to access this feature!",
            requiresPremium: true
          });
        }
      }
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Please provide an organization name" });
      }
      
      const stylePrompt = style || "Modern & Clean";
      const colorPrompt = colors || "vibrant professional colors";
      
      // Premium quality logo variations with different design approaches
      const variations = [
        { name: "Icon + Text", desc: "distinctive icon symbol with the name in elegant typography below" },
        { name: "Lettermark", desc: "creative monogram using the initials with artistic styling" },
        { name: "Emblem", desc: "circular or shield-shaped emblem with the name integrated" },
        { name: "Wordmark", desc: "stylized text-only logo with unique custom lettering" },
        { name: "Mascot", desc: "friendly character or mascot representing education and learning" },
      ];
      
      const logoPromises = variations.map((variation, i) => {
        const prompt = `Create a PREMIUM, PROFESSIONAL logo design for "${name}" - an educational institution.

DESIGN TYPE: ${variation.name} - ${variation.desc}
STYLE: ${stylePrompt} - high-end, polished, suitable for a top-tier school
COLORS: Use ${colorPrompt} as the primary palette
QUALITY: Award-winning logo design quality, vector-style crispness, perfect symmetry

Requirements:
- Clean white or very light background
- High contrast for excellent readability
- Scalable design that works at any size
- Timeless and memorable
- Educational/academic feel
- Professional enough for letterheads, uniforms, and signage

This should look like it was designed by a world-class branding agency. Make it distinctive, elegant, and instantly recognizable.`;

        return openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
        });
      });
      
      const responses = await Promise.all(logoPromises);
      const logos = responses
        .map(r => r.data?.[0]?.b64_json)
        .filter(Boolean)
        .map(data => `data:image/png;base64,${data}`);
      
      if (logos.length === 0) {
        return res.status(500).json({ error: "Failed to generate logos" });
      }
      
      res.json({ 
        logos, 
        variations: variations.map(v => v.name)
      });
    } catch (error) {
      console.error("Error generating logos:", error);
      res.status(500).json({ error: "Failed to generate logos" });
    }
  });

  // File conversion endpoint
  app.post("/api/convert", async (req, res) => {
    try {
      const validatedData = fileConversionSchema.parse(req.body);
      const { file, fileName, fromFormat, toFormat } = validatedData;
      
      // Size limit for file conversion (20MB)
      if (file.length > 30 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Please use a file under 20MB." });
      }
      
      // Extract base64 data
      const base64Match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: "Invalid file format" });
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      let convertedData: string;
      let outputMimeType: string;
      
      // Handle conversions
      if (toFormat === "pdf") {
        // Convert to PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4 size
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        if (mimeType.startsWith("image/")) {
          // Embed image in PDF
          let image;
          if (mimeType === "image/png") {
            image = await pdfDoc.embedPng(buffer);
          } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
            image = await pdfDoc.embedJpg(buffer);
          } else {
            // Convert to PNG first using sharp
            const pngBuffer = await sharp(buffer).png().toBuffer();
            image = await pdfDoc.embedPng(pngBuffer);
          }
          
          const { width, height } = image.scale(1);
          const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
          const scaledWidth = width * scale;
          const scaledHeight = height * scale;
          
          page.drawImage(image, {
            x: (page.getWidth() - scaledWidth) / 2,
            y: (page.getHeight() - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else if (mimeType === "text/plain" || mimeType.includes("text")) {
          // Text to PDF
          const text = buffer.toString("utf-8");
          const lines = text.split("\n");
          let y = page.getHeight() - 50;
          
          for (const line of lines) {
            if (y < 50) {
              const newPage = pdfDoc.addPage([595, 842]);
              y = newPage.getHeight() - 50;
            }
            page.drawText(line.substring(0, 80), {
              x: 50,
              y,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
            y -= 16;
          }
        }
        
        const pdfBytes = await pdfDoc.save();
        convertedData = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
        outputMimeType = "application/pdf";
      } else if (toFormat === "jpeg" || toFormat === "png") {
        // Image conversion using sharp
        if (!mimeType.startsWith("image/")) {
          return res.status(400).json({ error: "Can only convert images to JPEG/PNG format" });
        }
        
        let outputBuffer;
        if (toFormat === "jpeg") {
          outputBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
          outputMimeType = "image/jpeg";
        } else {
          outputBuffer = await sharp(buffer).png().toBuffer();
          outputMimeType = "image/png";
        }
        
        convertedData = `data:${outputMimeType};base64,${outputBuffer.toString("base64")}`;
      } else {
        return res.status(400).json({ error: `Conversion to ${toFormat} is not yet supported` });
      }
      
      const outputFileName = fileName.replace(/\.[^.]+$/, `.${toFormat}`);
      
      res.json({
        file: convertedData,
        fileName: outputFileName,
        mimeType: outputMimeType,
      });
    } catch (error) {
      console.error("Error converting file:", error);
      res.status(500).json({ error: "Failed to convert file" });
    }
  });

  // ========== FILE TOOLS ENDPOINTS ==========
  
  // Helper to check if user has premium subscription
  async function checkPremiumStatus(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    try {
      const user = await stripeService.getUser(userId);
      if (!user?.email) return false;
      
      // Owner (CEO) always gets premium access
      const OWNER_EMAILS = ["kayondoabass@gmail.com"];
      if (OWNER_EMAILS.includes(user.email.toLowerCase())) {
        return true;
      }
      
      // Check Paddle subscription
      const paddleApiKey = process.env.PADDLE_API_KEY;
      if (paddleApiKey) {
        const response = await fetch("https://api.paddle.com/subscriptions", {
          headers: {
            "Authorization": `Bearer ${paddleApiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const data = await response.json();
          const activeSubscription = data.data?.find((sub: any) => 
            sub.status === "active" && 
            sub.custom_data?.user_id === userId
          );
          if (activeSubscription) return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  }
  
  // File conversion with watermark support
  app.post("/api/file-tools/convert", async (req, res) => {
    try {
      const { file, fileName, fromFormat, toFormat } = req.body;
      
      if (!file || !fileName) {
        return res.status(400).json({ error: "File and filename are required" });
      }
      
      // Server-side subscription check for watermark
      const userId = (req.session as any)?.userId;
      const isPremium = await checkPremiumStatus(userId);
      const addWatermark = !isPremium;
      
      const base64Match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: "Invalid file format" });
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      let buffer = Buffer.from(base64Data, "base64");
      
      let outputBuffer: Buffer;
      let outputMimeType: string;
      let outputExtension: string;
      
      if (toFormat === "pdf") {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        
        if (mimeType.startsWith("image/")) {
          let image;
          if (mimeType === "image/png") {
            image = await pdfDoc.embedPng(buffer);
          } else {
            const pngBuffer = await sharp(buffer).png().toBuffer();
            image = await pdfDoc.embedPng(pngBuffer);
          }
          
          const { width, height } = image.scale(1);
          const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
          page.drawImage(image, {
            x: (page.getWidth() - width * scale) / 2,
            y: (page.getHeight() - height * scale) / 2,
            width: width * scale,
            height: height * scale,
          });
        }
        
        // Add watermark for free users
        if (addWatermark) {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          page.drawText("brightboardapp.com", {
            x: 20,
            y: 20,
            size: 10,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
        }
        
        outputBuffer = Buffer.from(await pdfDoc.save());
        outputMimeType = "application/pdf";
        outputExtension = "pdf";
      } else if (toFormat === "jpg" || toFormat === "jpeg") {
        // Only support image-to-image conversion (PDF to image not supported without additional libraries)
        if (mimeType === "application/pdf") {
          return res.status(400).json({ error: "PDF to image conversion is not supported. Please use an online PDF converter for this feature." });
        }
        
        let sharpInstance = sharp(buffer).jpeg({ quality: 85 });
        
        if (addWatermark) {
          const metadata = await sharp(buffer).metadata();
          const watermarkSvg = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <text x="20" y="${(metadata.height || 100) - 20}" font-family="Arial" font-size="16" fill="rgba(128,128,128,0.7)">brightboardapp.com</text>
            </svg>
          `);
          sharpInstance = sharpInstance.composite([{ input: watermarkSvg, gravity: 'southwest' }]);
        }
        
        outputBuffer = await sharpInstance.toBuffer();
        outputMimeType = "image/jpeg";
        outputExtension = "jpg";
      } else if (toFormat === "png") {
        // Only support image-to-image conversion
        if (mimeType === "application/pdf") {
          return res.status(400).json({ error: "PDF to image conversion is not supported. Please use an online PDF converter for this feature." });
        }
        
        let sharpInstance = sharp(buffer).png();
        
        if (addWatermark) {
          const metadata = await sharp(buffer).metadata();
          const watermarkSvg = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <text x="20" y="${(metadata.height || 100) - 20}" font-family="Arial" font-size="16" fill="rgba(128,128,128,0.7)">brightboardapp.com</text>
            </svg>
          `);
          sharpInstance = sharpInstance.composite([{ input: watermarkSvg, gravity: 'southwest' }]);
        }
        
        outputBuffer = await sharpInstance.toBuffer();
        outputMimeType = "image/png";
        outputExtension = "png";
      } else if (toFormat === "pptx") {
        const pptx = new PptxGenJS();
        pptx.author = "BrightBoard";
        pptx.title = fileName.replace(/\.[^.]+$/, "");
        
        if (mimeType.startsWith("image/")) {
          const slide = pptx.addSlide();
          const pngBuffer = await sharp(buffer).png().toBuffer();
          const base64Image = `data:image/png;base64,${pngBuffer.toString("base64")}`;
          
          slide.addImage({
            data: base64Image,
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 6.5,
            sizing: { type: "contain", w: 9, h: 6.5 }
          });
          
          if (addWatermark) {
            slide.addText("brightboardapp.com", {
              x: 0.5,
              y: 6.8,
              fontSize: 10,
              color: "999999"
            });
          }
        } else if (mimeType === "application/pdf") {
          const pdfExtract = new PDFExtract();
          const pdfData = await pdfExtract.extractBuffer(buffer, {});
          const pageCount = pdfData.pages.length;
          
          for (let i = 0; i < Math.min(pageCount, 50); i++) {
            const slide = pptx.addSlide();
            const pdfPage = pdfData.pages[i];
            
            const pageWidth = pdfPage.pageInfo?.width || 612;
            const pageHeight = pdfPage.pageInfo?.height || 792;
            
            const slideW = 10;
            const slideH = 7.5;
            const scaleX = slideW / pageWidth;
            const scaleY = slideH / pageHeight;
            
            const textItems = pdfPage.content || [];
            
            if (textItems.length === 0) {
              slide.addText(`Page ${i + 1}`, {
                x: 0.5,
                y: 3,
                w: 9,
                h: 1,
                fontSize: 24,
                align: "center",
                color: "666666"
              });
            } else {
              const lines: { text: string; y: number; x: number; fontSize: number; fontName?: string; bold?: boolean }[] = [];
              let currentLine = { text: "", y: 0, x: 0, fontSize: 12, fontName: "", bold: false };
              
              for (const item of textItems) {
                if (!item.str || item.str.trim() === "") continue;
                
                const itemY = Math.round((item.y || 0) * 10) / 10;
                
                if (lines.length === 0 || Math.abs(itemY - currentLine.y) > 2) {
                  if (currentLine.text) {
                    lines.push({ ...currentLine });
                  }
                  currentLine = {
                    text: item.str,
                    y: itemY,
                    x: item.x || 0,
                    fontSize: Math.round(item.height || 12),
                    fontName: (item as any).fontName || "",
                    bold: ((item as any).fontName || "").toLowerCase().includes("bold")
                  };
                } else {
                  currentLine.text += " " + item.str;
                }
              }
              if (currentLine.text) {
                lines.push({ ...currentLine });
              }
              
              for (const line of lines) {
                const posX = Math.max(0.3, line.x * scaleX);
                const posY = Math.max(0.2, Math.min(line.y * scaleY, slideH - 0.5));
                const fontSize = Math.max(8, Math.min(line.fontSize, 36));
                
                slide.addText(line.text, {
                  x: posX,
                  y: posY,
                  w: slideW - posX - 0.3,
                  h: 0.5,
                  fontSize: fontSize,
                  color: "333333",
                  bold: line.bold,
                  valign: "top",
                  wrap: true
                });
              }
            }
            
            if (addWatermark) {
              slide.addText("brightboardapp.com", {
                x: 0.5,
                y: 6.8,
                fontSize: 10,
                color: "999999"
              });
            }
          }
        }
        
        const pptxData = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
        outputBuffer = pptxData;
        outputMimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        outputExtension = "pptx";
      } else {
        return res.status(400).json({ error: "Unsupported output format" });
      }
      
      res.setHeader("Content-Type", outputMimeType);
      res.setHeader("Content-Disposition", `attachment; filename="converted.${outputExtension}"`);
      res.send(outputBuffer);
    } catch (error) {
      console.error("Error converting file:", error);
      res.status(500).json({ error: "Failed to convert file" });
    }
  });

  // Merge PDFs
  app.post("/api/file-tools/merge", async (req, res) => {
    try {
      const { files } = req.body;
      
      if (!files || files.length < 2) {
        return res.status(400).json({ error: "At least 2 files are required" });
      }
      
      // Server-side subscription check for watermark
      const userId = (req.session as any)?.userId;
      const isPremium = await checkPremiumStatus(userId);
      const addWatermark = !isPremium;
      
      const mergedPdf = await PDFDocument.create();
      
      for (const fileData of files) {
        const base64Match = fileData.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) continue;
        
        const buffer = Buffer.from(base64Match[2], "base64");
        
        try {
          const sourcePdf = await PDFDocument.load(buffer);
          const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
        } catch (e) {
          // If it's an image, convert to PDF page
          try {
            const page = mergedPdf.addPage([595, 842]);
            const pngBuffer = await sharp(buffer).png().toBuffer();
            const image = await mergedPdf.embedPng(pngBuffer);
            const { width, height } = image.scale(1);
            const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
            page.drawImage(image, {
              x: (page.getWidth() - width * scale) / 2,
              y: (page.getHeight() - height * scale) / 2,
              width: width * scale,
              height: height * scale,
            });
          } catch (imageError) {
            console.error("Could not process file:", fileData.name);
          }
        }
      }
      
      // Add watermark to first page for free users
      if (addWatermark && mergedPdf.getPageCount() > 0) {
        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        const firstPage = mergedPdf.getPage(0);
        firstPage.drawText("Merged with BrightBoard", {
          x: 20,
          y: 20,
          size: 10,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });
      }
      
      const outputBuffer = Buffer.from(await mergedPdf.save());
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="merged.pdf"');
      res.send(outputBuffer);
    } catch (error) {
      console.error("Error merging files:", error);
      res.status(500).json({ error: "Failed to merge files" });
    }
  });

  // Compress files
  app.post("/api/file-tools/compress", async (req, res) => {
    try {
      const { file, fileName, level } = req.body;
      
      if (!file || !fileName) {
        return res.status(400).json({ error: "File and filename are required" });
      }
      
      // Server-side subscription check for watermark
      const userId = (req.session as any)?.userId;
      const isPremium = await checkPremiumStatus(userId);
      const addWatermark = !isPremium;
      
      const base64Match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: "Invalid file format" });
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      let outputBuffer: Buffer;
      let outputMimeType: string;
      
      const qualityMap = { low: 90, medium: 70, high: 40 };
      const quality = qualityMap[level as keyof typeof qualityMap] || 70;
      
      if (mimeType.startsWith("image/")) {
        let sharpInstance = sharp(buffer);
        
        if (mimeType === "image/png") {
          sharpInstance = sharpInstance.png({ quality, compressionLevel: level === "high" ? 9 : level === "medium" ? 6 : 3 });
        } else {
          sharpInstance = sharpInstance.jpeg({ quality });
        }
        
        if (addWatermark) {
          const metadata = await sharp(buffer).metadata();
          const watermarkSvg = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <text x="20" y="${(metadata.height || 100) - 20}" font-family="Arial" font-size="16" fill="rgba(128,128,128,0.7)">brightboardapp.com</text>
            </svg>
          `);
          sharpInstance = sharpInstance.composite([{ input: watermarkSvg, gravity: 'southwest' }]);
        }
        
        outputBuffer = await sharpInstance.toBuffer();
        outputMimeType = mimeType;
      } else if (mimeType === "application/pdf") {
        // For PDFs, we just return as-is with watermark if needed
        const pdfDoc = await PDFDocument.load(buffer);
        
        if (addWatermark && pdfDoc.getPageCount() > 0) {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const firstPage = pdfDoc.getPage(0);
          firstPage.drawText("Compressed with BrightBoard", {
            x: 20,
            y: 20,
            size: 10,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
        }
        
        outputBuffer = Buffer.from(await pdfDoc.save());
        outputMimeType = "application/pdf";
      } else {
        return res.status(400).json({ error: "Unsupported file type for compression" });
      }
      
      const extension = fileName.split('.').pop() || 'file';
      res.setHeader("Content-Type", outputMimeType);
      res.setHeader("Content-Disposition", `attachment; filename="compressed.${extension}"`);
      res.send(outputBuffer);
    } catch (error) {
      console.error("Error compressing file:", error);
      res.status(500).json({ error: "Failed to compress file" });
    }
  });

  // Export storyboard as MP4 video
  app.post("/api/storyboard-to-video", async (req, res) => {
    try {
      const validatedRequest = videoExportSchema.parse(req.body);
      const { content, includeNarration, includeMusic, includeSubtitles, voice } = validatedRequest;
      
      const storyboardData = JSON.parse(content);
      
      if (!storyboardData.frames || storyboardData.frames.length === 0) {
        return res.status(400).json({ error: "No frames found in storyboard" });
      }
      
      const framesWithImages = storyboardData.frames.filter((f: any) => f.image);
      if (framesWithImages.length === 0) {
        return res.status(400).json({ error: "No frames with images found. Generate images first." });
      }
      
      let isPremium = false;
      const userId = (req.session as any)?.userId;
      const sessionUser = (req.session as any)?.user;
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = sessionUser?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      
      if (isCEO) {
        isPremium = true;
      } else if (userId) {
        try {
          const { getSubscriptionStatus } = await import('./paddleService');
          const subscriptionStatus = await getSubscriptionStatus(userId);
          isPremium = subscriptionStatus.isPremium;
        } catch (err) {
          console.error('Error checking subscription status:', err);
        }
      }
      
      const videoOptions = {
        includeNarration: isPremium ? includeNarration : false,
        includeMusic: isPremium ? includeMusic : false,
        includeSubtitles: isPremium ? includeSubtitles : false,
        voice,
        isPremium
      };
      
      const videoBuffer = await generateVideoFromStoryboard(storyboardData, videoOptions);
      
      const title = storyboardData.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'storyboard';
      const filename = `brightboard-${title}-${Date.now()}.mp4`;
      
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', videoBuffer.length);
      res.send(videoBuffer);
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Failed to generate video. Please try again." });
    }
  });

  // Worksheet to PDF
  app.post("/api/worksheet-to-pdf", async (req, res) => {
    try {
      const { content } = req.body;
      const data = JSON.parse(content);
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let page = pdfDoc.addPage([612, 792]); // US Letter size
      const { width, height } = page.getSize();
      const margin = 50;
      let yPosition = height - margin;
      const lineHeight = 16;
      
      // Title
      page.drawText(data.title || "Worksheet", {
        x: margin,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      yPosition -= 30;
      
      // Instructions
      if (data.instructions) {
        const instructionLines = wrapText(data.instructions, font, 11, width - margin * 2);
        for (const line of instructionLines) {
          if (yPosition < margin + 50) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = height - margin;
          }
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          yPosition -= lineHeight;
        }
        yPosition -= 10;
      }
      
      // Sections
      for (const section of data.sections || []) {
        if (yPosition < margin + 100) {
          page = pdfDoc.addPage([612, 792]);
          yPosition = height - margin;
        }
        
        // Section title
        if (section.title) {
          page.drawText(section.title, {
            x: margin,
            y: yPosition,
            size: 14,
            font: boldFont,
            color: rgb(0.3, 0.2, 0.5),
          });
          yPosition -= 22;
        }
        
        // Content items
        for (let i = 0; i < (section.content || []).length; i++) {
          if (yPosition < margin + 30) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = height - margin;
          }
          
          const item = section.content[i];
          const numberedItem = `${i + 1}. ${item}`;
          const itemLines = wrapText(numberedItem, font, 11, width - margin * 2 - 10);
          
          for (const line of itemLines) {
            page.drawText(line, {
              x: margin + 10,
              y: yPosition,
              size: 11,
              font,
            });
            yPosition -= lineHeight;
          }
          
          // Add writing lines for writing prompts
          if (section.type === "writingPrompt" || section.type === "drawing") {
            for (let j = 0; j < 3; j++) {
              yPosition -= 5;
              page.drawLine({
                start: { x: margin + 10, y: yPosition },
                end: { x: width - margin, y: yPosition },
                thickness: 0.5,
                color: rgb(0.7, 0.7, 0.7),
              });
              yPosition -= lineHeight;
            }
          }
          
          yPosition -= 4;
        }
        
        yPosition -= 10;
      }
      
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
      
      res.json({
        file: `data:application/pdf;base64,${pdfBase64}`,
        fileName: `${data.title || "worksheet"}.pdf`,
      });
    } catch (error) {
      console.error("Error creating worksheet PDF:", error);
      res.status(500).json({ error: "Failed to create PDF" });
    }
  });

  // Worksheet to Image
  app.post("/api/worksheet-to-image", async (req, res) => {
    try {
      const { content } = req.body;
      const data = JSON.parse(content);
      
      // Create an SVG representation of the worksheet
      const svgWidth = 800;
      const svgHeight = 1200;
      const margin = 40;
      const lineHeight = 22;
      let yPos = margin + 30;
      
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">`;
      svgContent += `<rect width="100%" height="100%" fill="white"/>`;
      
      // Title
      svgContent += `<text x="${margin}" y="${yPos}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333366">${escapeXml(data.title || "Worksheet")}</text>`;
      yPos += 35;
      
      // Instructions
      if (data.instructions) {
        svgContent += `<text x="${margin}" y="${yPos}" font-family="Arial, sans-serif" font-size="12" fill="#666666">${escapeXml(data.instructions)}</text>`;
        yPos += 25;
      }
      
      // Sections
      for (const section of data.sections || []) {
        if (section.title) {
          yPos += 10;
          svgContent += `<text x="${margin}" y="${yPos}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#663399">${escapeXml(section.title)}</text>`;
          yPos += lineHeight;
        }
        
        for (let i = 0; i < (section.content || []).length; i++) {
          const item = section.content[i];
          svgContent += `<text x="${margin + 10}" y="${yPos}" font-family="Arial, sans-serif" font-size="12" fill="#333333">${i + 1}. ${escapeXml(item)}</text>`;
          yPos += lineHeight;
          
          if (section.type === "writingPrompt" || section.type === "drawing") {
            for (let j = 0; j < 2; j++) {
              svgContent += `<line x1="${margin + 10}" y1="${yPos}" x2="${svgWidth - margin}" y2="${yPos}" stroke="#cccccc" stroke-width="1"/>`;
              yPos += lineHeight - 2;
            }
          }
        }
        yPos += 10;
      }
      
      svgContent += `</svg>`;
      
      // Convert SVG to PNG then to JPEG
      const svgBuffer = Buffer.from(svgContent);
      const jpegBuffer = await sharp(svgBuffer)
        .resize(svgWidth, svgHeight, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const jpegBase64 = jpegBuffer.toString("base64");
      
      res.json({
        file: `data:image/jpeg;base64,${jpegBase64}`,
        fileName: `${data.title || "worksheet"}.jpg`,
      });
    } catch (error) {
      console.error("Error creating worksheet image:", error);
      res.status(500).json({ error: "Failed to create image" });
    }
  });

  // Free tier limits
  const FREE_LIMITS = {
    image: 10,
    presentation: 5,
    storyboard: 1, // video/storyboard
  };

  // Get user usage status
  app.get("/api/usage", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.json({ 
          imageCount: 0, presentationCount: 0, videoCount: 0,
          imageLimit: FREE_LIMITS.image,
          presentationLimit: FREE_LIMITS.presentation,
          videoLimit: FREE_LIMITS.storyboard,
          isPremium: false
        });
      }
      
      const subscriptionStatus = await stripeService.getSubscriptionStatus(user.claims.sub);
      if (subscriptionStatus.isPremium) {
        return res.json({
          imageCount: 0, presentationCount: 0, videoCount: 0,
          imageLimit: -1, presentationLimit: -1, videoLimit: -1,
          isPremium: true
        });
      }
      
      const usage = await stripeService.getUserUsage(user.claims.sub);
      res.json({
        ...usage,
        imageLimit: FREE_LIMITS.image,
        presentationLimit: FREE_LIMITS.presentation,
        videoLimit: FREE_LIMITS.storyboard,
        isPremium: false
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  // Job status polling endpoint
  app.get("/api/generate/job/:jobId", (req, res) => {
    const job = jobQueue.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found or expired" });
    res.json(job);
  });

  // Queue stats (public monitoring)
  app.get("/api/queue/stats", (_req, res) => {
    res.json(jobQueue.stats);
  });

  // Generate content (requires authentication) — async queue-based
  app.post("/api/generate", async (req, res) => {
    try {
      // Auth must happen synchronously before returning jobId
      const sessionUserId = (req as any).session?.userId;
      const sessionUser = (req as any).session?.user;
      const legacyUser = (req as any).user;
      const legacyUserId = legacyUser?.claims?.sub;
      const userId = sessionUserId || legacyUserId;

      if (!userId) {
        return res.status(401).json({ error: "Please sign in to generate content" });
      }

      // Validate request body synchronously
      let validatedData: any;
      try {
        validatedData = generateContentSchema.parse(req.body);
      } catch (e: any) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      // Create job and return immediately
      const jobId = jobQueue.createJob();
      res.json({ jobId });

      // Capture values for background closure
      const userEmail = sessionUser?.email || legacyUser?.claims?.email;
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const isCEO = !!(userEmail && CEO_EMAILS.includes(userEmail.toLowerCase()));

      // Enqueue background processing
      jobQueue.enqueue(jobId, async () => {
        const onProgress = (step: string, percent: number) =>
          jobQueue.updateJob(jobId, { step, percent });

        let { type, prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage, imageOptions, textOptions, activityOptions, mindmapOptions, includeLogo } = validatedData;

        onProgress("Checking your account...", 5);

        // Check subscription status
        const subscriptionStatus = await stripeService.getSubscriptionStatus(userId);
        const isPremium = isCEO || subscriptionStatus.isPremium;

        // Check free tier usage limits
        if (!isPremium) {
          const usage = await stripeService.getUserUsage(userId);
          if (type === 'image' && usage.imageCount >= FREE_LIMITS.image) {
            return { error: `You've reached your daily limit of ${FREE_LIMITS.image} images. Upgrade to premium for unlimited generations!`, limitReached: true, limitType: 'image' };
          }
          if (type === 'presentation' && usage.presentationCount >= FREE_LIMITS.presentation) {
            return { error: `You've reached your daily limit of ${FREE_LIMITS.presentation} presentations. Upgrade to premium for unlimited generations!`, limitReached: true, limitType: 'presentation' };
          }
          if (type === 'storyboard' && usage.videoCount >= FREE_LIMITS.storyboard) {
            return { error: `You've reached your daily limit of ${FREE_LIMITS.storyboard} video storyboard. Upgrade to premium for unlimited generations!`, limitReached: true, limitType: 'storyboard' };
          }
        }

        // Downgrade premium features for free users
        const premiumQualities = ['hd', '4k'];
        const usesPremiumFeatures =
          (videoOptions?.quality && premiumQualities.includes(videoOptions.quality)) ||
          (presentationOptions?.imageQuality && premiumQualities.includes(presentationOptions.imageQuality)) ||
          (imageOptions?.quality && premiumQualities.includes(imageOptions.quality)) ||
          (presentationOptions?.transition && presentationOptions.transition !== 'none') ||
          (presentationOptions?.transitionDelay && presentationOptions.transitionDelay > 0) ||
          presentationOptions?.tapToReveal;

        if (usesPremiumFeatures && !isPremium) {
          if (videoOptions) videoOptions.quality = '2d';
          if (presentationOptions) { presentationOptions.imageQuality = '2d'; presentationOptions.transition = 'none'; presentationOptions.transitionDelay = 0; presentationOptions.tapToReveal = false; }
          if (imageOptions) imageOptions.quality = '2d';
        }

        // Validate referenceImage
        if (referenceImage) {
          const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
          if (!dataUrlPattern.test(referenceImage)) throw new Error("Invalid image format.");
          if (referenceImage.length > 15 * 1024 * 1024) throw new Error("Image too large. Please use an image under 10MB.");
        }

        let generatedContent: string;
        let title: string;

        switch (type) {
          case "image": {
            onProgress("Generating your image with AI...", 30);
            const imageResult = await generateImage(prompt, gradeLevel, subject, imageOptions);
            generatedContent = JSON.stringify(imageResult);
            title = imageResult.title;
            break;
          }
          case "presentation": {
            onProgress("Planning your slide structure...", 20);
            let effectiveSlideCount = slideCount;
            let slideLimitReached = false;
            if (!isPremium && effectiveSlideCount && effectiveSlideCount > 4) { effectiveSlideCount = 4; slideLimitReached = true; }
            onProgress("Generating slide content and images...", 45);
            const presentationResult = await generatePresentation(prompt, gradeLevel, subject, effectiveSlideCount, presentationOptions, referenceImage);
            if (slideLimitReached) { (presentationResult as any).slideLimitReached = true; (presentationResult as any).requestedSlides = slideCount; (presentationResult as any).maxFreeSlides = 4; }
            generatedContent = JSON.stringify(presentationResult);
            title = presentationResult.title;
            break;
          }
          case "text": {
            onProgress("Writing your content...", 35);
            const textResult = await generateText(prompt, gradeLevel, subject, textOptions);
            generatedContent = JSON.stringify(textResult);
            title = textResult.title;
            break;
          }
          case "activity": {
            onProgress("Building your interactive activity...", 35);
            const activityResult = await generateActivity(prompt, gradeLevel, subject, activityOptions);
            generatedContent = JSON.stringify(activityResult);
            title = activityResult.title;
            break;
          }
          case "storyboard": {
            onProgress("Creating your video storyboard...", 25);
            const storyboardResult = await generateStoryboard(prompt, gradeLevel, subject, videoOptions);
            generatedContent = JSON.stringify(storyboardResult);
            title = storyboardResult.title;
            break;
          }
          case "worksheet": {
            onProgress("Designing your worksheet...", 35);
            const worksheetResult = await generateWorksheet(prompt, gradeLevel, subject, worksheetOptions);
            generatedContent = JSON.stringify(worksheetResult);
            title = worksheetResult.title;
            break;
          }
          case "mindmap": {
            onProgress("Generating your mind map...", 30);
            if (!isPremium && mindmapOptions?.imageQuality && ['hd', '4k'].includes(mindmapOptions.imageQuality)) {
              mindmapOptions.imageQuality = '2d';
            }
            const mindmapResult = await generateMindmap(prompt, gradeLevel, subject, mindmapOptions);
            generatedContent = JSON.stringify(mindmapResult);
            title = mindmapResult.title;
            break;
          }
          default:
            throw new Error("Invalid content type");
        }

        onProgress("Finalising your content...", 88);

        // Add watermark/logo
        const parsed = JSON.parse(generatedContent);
        parsed.showLogo = true;
        if (!isPremium) parsed.watermark = "brightboardapp.com";
        generatedContent = JSON.stringify(parsed);

        // Save to storage
        const saved = await storage.createContent({ type, prompt, title, content: generatedContent });

        onProgress("Saving to your library...", 95);

        // Increment usage counters for free users
        if (!isPremium) {
          if (type === 'image') await stripeService.incrementUsage(userId, 'image');
          else if (type === 'presentation') await stripeService.incrementUsage(userId, 'presentation');
          else if (type === 'storyboard') await stripeService.incrementUsage(userId, 'video');
        }

        await stripeService.trackFeatureUsage(userId, type);

        // Log costs
        const costMap: Record<string, number> = { image: 5, text: 2, activity: 2, worksheet: 2, mindmap: 2 };
        let estimatedCostCents = costMap[type] ?? 2;
        let costDescription = `${type} generation: "${title?.substring(0, 50) || prompt.substring(0, 50)}..."`;
        if (type === 'presentation') { const sn = slideCount || 5; estimatedCostCents = sn * 5 + 2; costDescription = `Presentation (${sn} slides): "${title?.substring(0, 50)}..."`; }
        if (type === 'storyboard') { const fc = ({ "30sec":3,"1min":6,"2min":10,"3min":12,"4min":15,"5min":18,"10min":25,"30min":50 } as any)[videoOptions?.length||"1min"]||6; estimatedCostCents = fc*5+2; costDescription = `Storyboard (${fc} frames): "${title?.substring(0,50)}..."`; }
        if (estimatedCostCents > 0) {
          await logAutomaticExpense("openai", costDescription, estimatedCostCents, { contentType: type, contentId: saved.id, userId, slideCount, videoOptions });
        }

        return { data: saved };
      });

    } catch (error: any) {
      console.error("Error starting generation:", error);
      if (!res.headersSent) res.status(500).json({ error: error.message || "Failed to start generation" });
    }
  });

  // ========== OWNER EXPENSES ENDPOINTS ==========
  
  // Helper to log automatic expenses (OpenAI, Resend)
  async function logAutomaticExpense(
    category: string,
    description: string,
    amountCents: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(expenses).values({
        category,
        description,
        amount: amountCents,
        currency: "USD",
        date: new Date(),
        isAutomatic: true,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (error) {
      console.error("Failed to log expense:", error);
    }
  }

  // Get all expenses (owner only)
  app.get("/api/owner/expenses", isOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { startDate, endDate, category } = req.query;
      
      const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.date));
      
      // Filter in memory for simplicity
      let filtered = allExpenses;
      if (startDate) {
        filtered = filtered.filter(e => new Date(e.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(e => new Date(e.date) <= new Date(endDate as string));
      }
      if (category && category !== "all") {
        filtered = filtered.filter(e => e.category === category);
      }
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Get expense summary by category (owner only)
  app.get("/api/owner/expenses/summary", isOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { startDate, endDate } = req.query;
      
      const allExpenses = await db.select().from(expenses);
      
      // Filter by date range
      let filtered = allExpenses;
      if (startDate) {
        filtered = filtered.filter(e => new Date(e.date) >= new Date(startDate as string));
      }
      if (endDate) {
        filtered = filtered.filter(e => new Date(e.date) <= new Date(endDate as string));
      }
      
      // Group by category
      const summary: Record<string, { totalAmount: number; count: number }> = {};
      for (const expense of filtered) {
        if (!summary[expense.category]) {
          summary[expense.category] = { totalAmount: 0, count: 0 };
        }
        summary[expense.category].totalAmount += expense.amount;
        summary[expense.category].count += 1;
      }
      
      // Convert to array format
      const result = Object.entries(summary).map(([category, data]) => ({
        category,
        totalAmount: data.totalAmount,
        count: data.count,
      }));
      
      // Calculate totals
      const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);
      const automaticTotal = filtered.filter(e => e.isAutomatic).reduce((sum, e) => sum + e.amount, 0);
      const manualTotal = filtered.filter(e => !e.isAutomatic).reduce((sum, e) => sum + e.amount, 0);
      
      res.json({
        byCategory: result,
        totals: {
          total: totalExpenses,
          automatic: automaticTotal,
          manual: manualTotal,
        },
      });
    } catch (error) {
      console.error("Error fetching expense summary:", error);
      res.status(500).json({ error: "Failed to fetch expense summary" });
    }
  });

  // Add new expense (owner only)
  app.post("/api/owner/expenses", isOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { category, description, amount, currency, date } = req.body;
      
      if (!category || !description || amount === undefined) {
        return res.status(400).json({ error: "Category, description, and amount are required" });
      }
      
      const amountCents = Math.round(parseFloat(amount) * 100);
      
      const [newExpense] = await db.insert(expenses).values({
        category,
        description,
        amount: amountCents,
        currency: currency || "USD",
        date: date ? new Date(date) : new Date(),
        isAutomatic: false,
      }).returning();
      
      res.json(newExpense);
    } catch (error) {
      console.error("Error adding expense:", error);
      res.status(500).json({ error: "Failed to add expense" });
    }
  });

  // Update expense (owner only)
  app.patch("/api/owner/expenses/:id", isOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { category, description, amount, currency, date } = req.body;
      
      const updates: Partial<InsertExpense> = {};
      if (category) updates.category = category;
      if (description) updates.description = description;
      if (amount !== undefined) updates.amount = Math.round(parseFloat(amount) * 100);
      if (currency) updates.currency = currency;
      if (date) updates.date = new Date(date);
      
      const [updated] = await db.update(expenses)
        .set(updates)
        .where(eq(expenses.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  // Delete expense (owner only)
  app.delete("/api/owner/expenses/:id", isOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      
      const [deleted] = await db.delete(expenses)
        .where(eq(expenses.id, parseInt(id)))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Get expense categories
  app.get("/api/owner/expenses/categories", isOwnerMiddleware, async (_req: any, res: any) => {
    res.json(expenseCategories);
  });

  // ========== OWNER VIDEO SETTINGS ENDPOINTS ==========
  
  // In-memory storage for owner video settings
  let ownerVideoSettings = {
    showWatermark: true,
    watermarkPosition: "top-right" as "top-left" | "top-right" | "bottom-left" | "bottom-right",
    showEndLogo: true,
  };
  
  // Get owner video settings
  app.get("/api/owner/video-settings", isOwnerMiddleware, async (_req: any, res: any) => {
    res.json(ownerVideoSettings);
  });
  
  // Update owner video settings
  app.patch("/api/owner/video-settings", isOwnerMiddleware, async (req: any, res: any) => {
    try {
      const { showWatermark, watermarkPosition, showEndLogo } = req.body;
      
      if (showWatermark !== undefined) ownerVideoSettings.showWatermark = showWatermark;
      if (watermarkPosition) ownerVideoSettings.watermarkPosition = watermarkPosition;
      if (showEndLogo !== undefined) ownerVideoSettings.showEndLogo = showEndLogo;
      
      res.json(ownerVideoSettings);
    } catch (error) {
      console.error("Error updating video settings:", error);
      res.status(500).json({ error: "Failed to update video settings" });
    }
  });
  
  // Public endpoint to get video settings (for video export)
  app.get("/api/video-settings", async (_req: any, res: any) => {
    res.json({
      showWatermark: ownerVideoSettings.showWatermark,
      watermarkPosition: ownerVideoSettings.watermarkPosition,
      showEndLogo: ownerVideoSettings.showEndLogo,
    });
  });

  // Make logAutomaticExpense available for use in other parts of the app
  (app as any).logAutomaticExpense = logAutomaticExpense;

  // Register subscription routes
  registerSubscriptionRoutes(app);

  return httpServer;
}

// Image generation
async function generateImage(prompt: string, gradeLevel?: string, subject?: string, options?: ImageOptions) {
  const context = buildContext(gradeLevel, subject);
  const style = options?.style || "animation";
  const quality = options?.quality || "2d";
  const layout = options?.layout || "single";
  
  const styleDesc = style === "animation" ? "cartoon-like, animated style" : "realistic, photorealistic style";
  const qualityDesc = quality === "4k" ? "ultra high quality, 4K resolution" : 
                      quality === "hd" ? "high definition, crisp details" :
                      quality === "3d" ? "3D rendered, dimensional" : "2D flat illustration";
  
  const enhancedPrompt = `Create a colorful, child-friendly educational illustration: ${prompt}. ${context} Style: bright colors, simple shapes, ${styleDesc}, ${qualityDesc}, engaging for children, no text in the image.`;

  // For grid layout, generate 4 images
  const numImages = layout === "grid" ? 4 : 1;
  
  if (numImages === 1) {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      size: "1024x1024",
      n: 1,
    });

    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error("Failed to generate image");
    }

    return {
      title: extractTitle(prompt),
      description: prompt,
      imageUrl: imageData.url || undefined,
      b64_json: imageData.b64_json || undefined,
      options: { style, quality, layout },
    };
  } else {
    // Generate 4 images for grid layout
    const images: string[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `${enhancedPrompt} (variation ${i + 1})`,
        size: "1024x1024",
        n: 1,
      });
      const imageData = response.data?.[0];
      if (imageData?.b64_json) {
        images.push(imageData.b64_json);
      } else if (imageData?.url) {
        images.push(imageData.url);
      }
    }
    
    return {
      title: extractTitle(prompt),
      description: prompt,
      images,
      options: { style, quality, layout },
    };
  }
}

// Presentation generation
async function generatePresentation(prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, options?: PresentationOptions, referenceImage?: string) {
  const context = buildContext(gradeLevel, subject);
  const numSlides = slideCount || 6;
  const style = options?.style || "textAndImages";
  const layout = options?.layout || "single";
  const imageStyle = options?.imageStyle || "animation";
  const imageQuality = options?.imageQuality || "hd";
  // Premium features
  const transition = options?.transition || "none";
  const transitionDelay = options?.transitionDelay || 0;
  const tapToReveal = options?.tapToReveal || false;
  
  // Determine number of images per slide based on layout
  const imagesPerSlide = layout === "grid" ? 4 : 1;
  
  let contentInstructions = "";
  if (tapToReveal) {
    contentInstructions = `
GAME MODE — TAP TO REVEAL:
This presentation will be played as an interactive classroom game. Each bullet point is revealed ONE AT A TIME when the teacher taps. Design each slide so that the reveal is exciting and makes students think before seeing the answer.

CREATIVE GAME FORMATS — vary the format across slides to keep it fresh:

1. QUIZ: Title = "Round 1: [Topic] Quiz 🎯"
   Bullets = ["❓ Question: [question here]", "💡 Hint: [a clue]", "✅ Answer: [answer] — Well done if you got it!"]

2. CLUE GAME (Guess What/Who): Title = "Guess the [Animal/Country/Person]! 🔍"
   Bullets = ["🔎 Clue 1: [first clue]", "🔎 Clue 2: [second clue]", "🔎 Clue 3: [third clue]", "🎉 Answer: [answer]!"]

3. TRUE OR FALSE: Title = "True or False? 🤔"
   Bullets = ["📢 Statement: [statement]", "⏳ Think... is it TRUE or FALSE?", "✅ Answer: [TRUE/FALSE]! [brief explanation]"]

4. FILL IN THE BLANK: Title = "Complete the Sentence! ✏️"
   Bullets = ["📖 '[sentence with ___]'", "💭 Think of the missing word...", "✅ The answer is: [word]! [fun fact about it]"]

5. CHALLENGE ROUND: Title = "[Number]: Spot the Odd One Out! 🧐"
   Bullets = ["🔵 [item A]", "🔵 [item B]", "🟡 [item C — the odd one]", "🔵 [item D]", "✅ [item C] is the odd one — because [reason]!"]

6. FUN FACT REVEAL: Title = "Did You Know? 🌟"
   Bullets = ["🤔 [intriguing question or surprising fact setup]", "🔮 [another clue or related fact]", "🤯 Mind-blowing answer: [surprising fact]!"]

RULES:
- Every slide MUST be a different game format — do NOT repeat the same format twice in a row
- Use emojis liberally to make it visually exciting
- Make bullet points SHORT — max 10 words each
- The LAST bullet on every slide must be the answer/reveal
- Speaker notes should tell the teacher how to run that game moment (e.g. "Ask class to vote before revealing")
${style !== "textOnly" ? `- Include ${imagesPerSlide} fun, colourful image description(s) per slide that match the game theme` : ""}
- Keep language age-appropriate for the grade level
- The whole presentation should feel like a fun game show, not a normal lesson!
    `;
  } else if (style === "textOnly") {
    contentInstructions = "Each slide should have a title, 3-5 bullet points, and speaker notes. No images needed.";
  } else if (style === "imagesOnly") {
    contentInstructions = `Each slide should have only a title and ${imagesPerSlide} detailed image description(s). No bullet points - the images tell the story. Include speaker notes for the teacher.`;
  } else {
    contentInstructions = `Each slide MUST have a title, 3-5 informative bullet points with the actual educational content, and ${imagesPerSlide} image description(s). The bullet points should contain ALL the key information, facts, and learning points - images are only decorative illustrations. NEVER put educational text, words, sentences, fill-in-the-blank exercises, or written content inside image descriptions. Images should only describe visual scenes (e.g., "children exploring a forest" NOT "a worksheet with sentences to complete").`;
  }
  
  const slideStructure = style === "imagesOnly" 
    ? `{
        "title": "Slide Title",
        "content": [],
        "notes": "Speaker notes for the teacher",
        "imagePrompts": ["Detailed description of image 1"${layout === "grid" ? ', "Image 2", "Image 3", "Image 4"' : ''}]
      }`
    : `{
        "title": "Slide Title",
        "content": ["Bullet point 1", "Bullet point 2"],
        "notes": "Speaker notes for the teacher",
        "imagePrompts": ["Detailed description of image"${layout === "grid" ? ', "Image 2", "Image 3", "Image 4"' : ''}]
      }`;
  
  // Build user message - include reference image if provided
  let userMessage: any = tapToReveal
    ? `Create a fun, interactive TAP TO REVEAL classroom game presentation about: ${prompt}. Create exactly ${numSlides} slides. Each slide is a different game challenge — mix quiz questions, clue games, true/false, fill-in-the-blank, and fun fact reveals. Make it feel like a game show!`
    : `Create an engaging educational presentation about: ${prompt}. Create exactly ${numSlides} slides.`;
  
  if (referenceImage) {
    userMessage = [
      {
        type: "text",
        text: `Analyze this image of a lesson or educational material and create an engaging presentation based on its content and visual style. The user's additional instructions: ${prompt}. Create exactly ${numSlides} slides that match the topic and teaching approach shown in the image.`
      },
      {
        type: "image_url",
        image_url: {
          url: referenceImage,
          detail: "high"
        }
      }
    ];
  }
  
  const mathInstructions = `
CRITICAL MATH & NUMBER ACCURACY RULES:
- All numbers, calculations, equations, and mathematical content MUST be 100% accurate.
- If presenting number sequences (e.g., "numbers 1 to 50"), ensure EVERY SINGLE number is listed in the correct sequential order with NO gaps, NO duplicates, and NO numbers out of order.
- PAY SPECIAL ATTENTION to numbers 40 and above. Common mistakes to avoid:
  * Do NOT skip from 39 to 50, or 40 to 50. List EVERY number: 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50.
  * Do NOT confuse 41-49 with 31-39 or any other decade. Each decade must be complete: 40, 41, 42, 43, 44, 45, 46, 47, 48, 49.
  * After 49 comes 50, after 59 comes 60, after 69 comes 70, etc.
  * The pattern for every decade is: X0, X1, X2, X3, X4, X5, X6, X7, X8, X9 (e.g., 40, 41, 42, 43, 44, 45, 46, 47, 48, 49).
- When distributing numbers across slides, use EXACTLY 10 numbers per slide in sequential groups:
  * Slide 1: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  * Slide 2: 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
  * Slide 3: 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
  * Slide 4: 31, 32, 33, 34, 35, 36, 37, 38, 39, 40
  * Slide 5: 41, 42, 43, 44, 45, 46, 47, 48, 49, 50
  * And so on for higher numbers.
- VERIFY: Count the total numbers across all slides. For "1 to 50" there must be exactly 50 numbers. For "1 to 100" there must be exactly 100 numbers.
- Double-check all arithmetic: addition, subtraction, multiplication, division results must be correct.
- Never skip numbers or put them out of sequence. After writing each slide, verify the sequence continues correctly from where the previous slide ended.
- If showing examples or practice problems, ensure all answers and solutions are mathematically correct.
- For word problems, ensure the numbers and operations described match the expected answer.

CRITICAL SPELLING, GRAMMAR & CLARITY RULES:
- Proofread ALL text for spelling errors before returning. Every word must be spelled correctly.
- Use clear, simple, and complete sentences that are easy for students to understand.
- Avoid vague or ambiguous phrasing. Be specific and direct.
- Bullet points should be concise but grammatically complete (not sentence fragments that trail off).
- Double-check all proper nouns, scientific terms, and subject-specific vocabulary for correct spelling.
- Ensure slide titles are descriptive and properly capitalized.

CRITICAL IMAGE DESCRIPTION RULES:
- Image descriptions (imagePrompts) must ONLY describe visual scenes, characters, objects, or settings.
- NEVER include text, words, sentences, labels, fill-in-the-blank exercises, worksheets, written content, or captions in image descriptions.
- BAD example: "A worksheet showing 'Complete the sentences' with blanks to fill in"
- GOOD example: "Children sitting at desks in a colorful classroom, looking at a globe together"
- The images will be generated by AI and should be purely visual illustrations that complement the text content in the bullet points.
- All educational content (facts, exercises, questions, answers) must go in the "content" array as bullet points, NOT in imagePrompts.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational content creator specializing in engaging presentations for teachers. ${referenceImage ? "Analyze the provided reference image to understand the lesson content, visual style, and teaching approach. Create a presentation that matches and expands on what you see." : "Create presentations that are age-appropriate, visually describable, and include interactive elements."} ${context}
        
        ${mathInstructions}
        
        Return a JSON object with this exact structure:
        {
          "title": "Presentation Title",
          "style": "${style}",
          "layout": "${layout}",
          "slides": [
            ${slideStructure}
          ]
        }
        
        ${contentInstructions}
        IMPORTANT: Create exactly ${numSlides} slides.`
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const presentationData = JSON.parse(content);
  
  // Store options in the result
  presentationData.style = style;
  presentationData.layout = layout;
  presentationData.imageStyle = imageStyle;
  presentationData.imageQuality = imageQuality;
  presentationData.transition = transition;
  presentationData.transitionDelay = transitionDelay;
  presentationData.tapToReveal = tapToReveal;
  
  // Skip image generation for text-only style
  if (style === "textOnly") {
    return presentationData;
  }
  
  // Build style/quality prompts once (not per image)
  const stylePrompt = imageStyle === "reallife" 
    ? "Photorealistic, educational photography style, high quality stock photo look"
    : "Colorful animated style, cartoon-like, Pixar/Disney quality, child-friendly";
  
  const qualityPrompt = imageQuality === "4k" ? "Ultra high definition, 4K quality, extremely detailed" :
    imageQuality === "3d" ? "3D rendered, CGI quality, depth and lighting effects" :
    imageQuality === "2d" ? "Flat 2D illustration, clean simple shapes, minimal shadows" :
    "High definition, crisp and clear, professional quality";

  // Use smaller image size for faster generation (512x512 for slides, 1024x1024 only for 4K)
  const imageSize = imageQuality === "4k" ? "1024x1024" as const : "1024x1024" as const;

  // Collect ALL image generation tasks across all slides for maximum parallelism
  const allImageTasks: { slideIndex: number; promptIndex: number; prompt: string }[] = [];
  
  presentationData.slides.forEach((slide: Slide & { imagePrompts?: string[], images?: string[] }, slideIndex: number) => {
    const prompts = slide.imagePrompts || (slide.imagePrompt ? [slide.imagePrompt] : []);
    const promptsToGenerate = prompts.slice(0, imagesPerSlide);
    promptsToGenerate.forEach((imgPrompt, promptIndex) => {
      allImageTasks.push({ slideIndex, promptIndex, prompt: imgPrompt });
    });
  });

  // Generate ALL images in parallel (across all slides at once)
  const imageResults = await Promise.all(
    allImageTasks.map(async (task) => {
      try {
        const imageResponse = await openai.images.generate({
          model: "gpt-image-1",
          prompt: `${stylePrompt}. ${qualityPrompt}. Educational illustration for children: ${task.prompt}. Suitable for classroom presentation. IMPORTANT: Do NOT include any text, words, letters, numbers, labels, or captions in the image. The image should be purely visual with no written text whatsoever.`,
          n: 1,
          size: imageSize,
        });
        
        const imageData = imageResponse.data?.[0]?.b64_json;
        return { ...task, image: imageData ? `data:image/png;base64,${imageData}` : null };
      } catch (error) {
        console.error(`Failed to generate image for slide ${task.slideIndex}:`, error);
        return { ...task, image: null };
      }
    })
  );

  // Assign generated images back to their respective slides
  const slidesWithImages = presentationData.slides.map((slide: Slide & { imagePrompts?: string[], images?: string[] }, slideIndex: number) => {
    const slideImages = imageResults
      .filter(r => r.slideIndex === slideIndex && r.image)
      .sort((a, b) => a.promptIndex - b.promptIndex)
      .map(r => r.image!);
    
    if (layout === "grid") {
      slide.images = slideImages;
    } else if (slideImages.length > 0) {
      slide.image = slideImages[0];
    }
    return slide;
  }
  );
  
  presentationData.slides = slidesWithImages;
  return presentationData;
}

// Text content generation
async function generateText(prompt: string, gradeLevel?: string, subject?: string, options?: TextOptions) {
  const context = buildContext(gradeLevel, subject);
  const textStyle = options?.style || "story";
  
  const styleInstructions: Record<string, string> = {
    story: "Write an engaging narrative story with characters, plot, and moral/lesson.",
    explanation: "Write a clear, educational explanation that breaks down concepts step-by-step.",
    poem: "Write a fun, memorable poem with rhyme and rhythm that teaches the concept.",
    dialogue: "Write an engaging dialogue/conversation between characters that teaches the concept.",
  };
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational content writer specializing in creating engaging, age-appropriate learning materials for teachers to use in their classrooms. ${context}
        
        CRITICAL MATH & NUMBER ACCURACY: All numbers, calculations, equations, and mathematical content MUST be 100% accurate. Double-check all arithmetic. Number sequences must list EVERY number with no gaps — pay special attention to 40+ (40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, etc.). Every decade must be complete.
        
        Format: ${styleInstructions[textStyle] || styleInstructions.story}
        
        Return a JSON object with this structure:
        {
          "title": "Content Title",
          "content": "The full educational content text",
          "format": "${textStyle}",
          "vocabulary": ["key", "vocabulary", "words"],
          "discussionQuestions": ["Question 1?", "Question 2?"]
        }`
      },
      {
        role: "user",
        content: `Create educational content about: ${prompt}. Make it engaging, clear, and appropriate for the classroom. Use the ${textStyle} format.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const result = JSON.parse(content);
  result.options = { style: textStyle };
  return result;
}

// Activity/Game generation - Enhanced for all subjects
async function generateActivity(prompt: string, gradeLevel?: string, subject?: string, options?: ActivityOptions) {
  const context = buildContext(gradeLevel, subject);
  const gameType = options?.gameType || "luckySpinner";
  
  // Game type descriptions for AI - structures must match the interactive game components
  const gameTypeDescriptions: Record<string, { name: string; description: string; itemCount: number; structure: string }> = {
    luckySpinner: {
      name: "Lucky Spinner",
      description: "A colorful spinning wheel game where students spin to randomly select questions, vocabulary words, or topics. Great for warm-ups and review!",
      itemCount: 8,
      structure: `"wheelSegments": [{ "text": "Short segment label (max 15 chars)", "challenge": "Challenge or question when landed on", "points": 10 }]`
    },
    mysteryBox: {
      name: "Mystery Box",
      description: "A grid of numbered boxes (like Baamboozle) that students tap to reveal hidden questions or challenges. Perfect for team competitions!",
      itemCount: 12,
      structure: `"boxes": [{ "number": 1, "question": "Question text", "answer": "Correct answer", "points": 10 }]`
    },
    memoryMatch: {
      name: "Memory Match",
      description: "Flip cards to find matching pairs (word-definition, image-word, question-answer). Tests memory and knowledge!",
      itemCount: 6,
      structure: `"pairs": [{ "term": "Word or question", "match": "Definition or answer" }]`
    },
    quickCatch: {
      name: "Quick Catch",
      description: "Whack-a-mole style game where correct items pop up and students must quickly tap the right ones!",
      itemCount: 6,
      structure: `"catchItems": { "instruction": "Tap only the correct answers!", "correct": ["Right answer 1", "Right answer 2", "Right answer 3"], "incorrect": ["Wrong 1", "Wrong 2", "Wrong 3"] }`
    },
    factOrFib: {
      name: "Fact or Fib",
      description: "Students decide if statements are TRUE or FALSE. Simple but engaging! Great for testing understanding.",
      itemCount: 8,
      structure: `"statements": [{ "statement": "Statement text", "isTrue": true or false, "explanation": "Why it's true or false" }]`
    },
    wordHunt: {
      name: "Word Hunt",
      description: "Classic word search puzzle where students find hidden vocabulary words in a letter grid. Calming and focused!",
      itemCount: 8,
      structure: `"searchWords": ["WORD1", "WORD2", "WORD3"]`
    },
    letterRescue: {
      name: "Letter Rescue",
      description: "Hangman-style game where students guess letters to reveal hidden words before running out of tries!",
      itemCount: 6,
      structure: `"rescueWords": [{ "word": "ANSWER", "hint": "Clue to help guess", "category": "Category name" }]`
    },
    treasureChest: {
      name: "Treasure Chest",
      description: "Open mystery chests to reveal challenges. Complete the challenge to earn the treasure!",
      itemCount: 9,
      structure: `"chests": [{ "id": 1, "challenge": "Challenge or question", "reward": "Prize or reward description", "points": 10 }]`
    },
    letterScramble: {
      name: "Letter Scramble",
      description: "Anagram game where students unscramble jumbled letters to form the correct vocabulary word!",
      itemCount: 8,
      structure: `"words": [{ "word": "ANSWER", "hint": "Clue to help unscramble", "points": 10 }]`
    },
    popAndLearn: {
      name: "Pop & Learn",
      description: "Balloon pop game where students pop the correct balloon to answer questions!",
      itemCount: 6,
      structure: `"popQuestions": [{ "question": "Question text", "answer": "Correct answer", "options": ["Option A", "Option B", "Correct answer", "Option C"] }]`
    },
    brainBattle: {
      name: "Brain Battle",
      description: "Classic quiz format with points, teams, and competition. Questions with multiple choice answers!",
      itemCount: 8,
      structure: `"questions": [{ "question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0, "points": 10, "explanation": "Why this is correct" }]`
    },
    missingPiece: {
      name: "Missing Piece",
      description: "Fill-in-the-blank challenges where students complete sentences by finding the missing words!",
      itemCount: 8,
      structure: `"blanks": [{ "sentence": "The _____ is the largest planet.", "blank": "Jupiter", "hint": "It has a big red spot" }]`
    },
  };
  
  const gameInfo = gameTypeDescriptions[gameType] || gameTypeDescriptions.luckySpinner;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational game designer creating ONLINE INTERACTIVE games for teachers like those on Wordwall and Baamboozle. ${context}

CRITICAL MATH & NUMBER ACCURACY: All numbers, calculations, equations, and mathematical content MUST be 100% accurate. Double-check all arithmetic. Number sequences must list EVERY number with no gaps — pay special attention to 40+ (40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, etc.). Every decade must be complete. All answers and solutions must be correct.

GAME TYPE: ${gameInfo.name}
DESCRIPTION: ${gameInfo.description}

Create an engaging ${gameInfo.name} game with ${gameInfo.itemCount} items.

Return a JSON object with this structure:
{
  "title": "Creative, Fun Game Title",
  "gameType": "${gameType}",
  "gameName": "${gameInfo.name}",
  "instructions": "How to play this game with your class",
  "teamMode": "individual" | "teams" | "class",
  "estimatedTime": "5-10 min",
  "learningObjectives": ["What students will learn"],
  ${gameInfo.structure},
  "tips": ["Teacher tips for running this game"]
}

Make the content age-appropriate, educational, and FUN! Use colorful descriptions and engaging language.`
      },
      {
        role: "user",
        content: `Create a ${gameInfo.name} game about: ${prompt}

Make it exciting and educational! Teachers should want to use this in their classroom repeatedly.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const result = JSON.parse(content);
  result.options = { gameType };
  return result;
}

// Storyboard generation (for animated videos)
async function generateStoryboard(prompt: string, gradeLevel?: string, subject?: string, videoOptions?: VideoOptions) {
  const context = buildContext(gradeLevel, subject);
  
  // Parse video options
  const length = videoOptions?.length || "5min";
  const style = videoOptions?.style || "animation";
  const quality = videoOptions?.quality || "hd";
  const language = videoOptions?.language || "en";
  
  // Language names for display and prompt
  const languageNames: Record<string, string> = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "pt": "Portuguese",
    "zh": "Mandarin Chinese",
    "hi": "Hindi",
    "ar": "Arabic",
    "sw": "Swahili",
    "zu": "Zulu",
    "lg": "Luganda",
    "vi": "Vietnamese",
  };
  const languageName = languageNames[language] || "English";
  
  // Determine frame count based on length
  const frameCount = {
    "30sec": 3,
    "1min": 6,
    "2min": 10,
    "3min": 12,
    "4min": 15,
    "5min": 18,
    "10min": 25,
    "30min": 50,
  }[length] || 10;
  
  const styleDescription = style === "animation" 
    ? "colorful 2D/3D animated style like Cocomelon, Super Simple Songs, or Pixar" 
    : "real-life footage with actors, props, and real environments like educational documentaries";
  
  const qualityDescription = {
    "2d": "flat 2D animation with bold outlines and bright colors",
    "3d": "3D rendered CGI animation with depth and lighting",
    "hd": "high-definition 1080p quality",
    "4k": "ultra high-definition 4K cinematic quality",
  }[quality] || "high-definition quality";
  
  const durationText = {
    "30sec": "30 seconds",
    "1min": "1 minute",
    "2min": "2 minutes",
    "3min": "3 minutes",
    "4min": "4 minutes",
    "5min": "5 minutes",
    "10min": "10 minutes",
    "30min": "30 minutes",
  }[length] || "2 minutes";
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational video content creator specializing in creating storyboards for ${styleDescription}. ${context}
        
        Video specifications:
        - Duration: ${durationText}
        - Style: ${style === "animation" ? "Animated" : "Real-life/Live-action"}
        - Quality: ${qualityDescription}
        - Language: ${languageName} (all dialogue, narration, songs, and text MUST be in ${languageName})
        
        IMPORTANT: All dialogue, narration, song lyrics, and on-screen text must be written in ${languageName}.
        
        Return a JSON object with this structure:
        {
          "title": "Video Title in ${languageName}",
          "description": "Brief description of the video concept",
          "duration": "${durationText}",
          "style": "${style === "animation" ? "Animation" : "Real Life"}",
          "quality": "${quality.toUpperCase()}",
          "language": "${languageName}",
          "targetAge": "Target age group",
          "frames": [
            {
              "frameNumber": 1,
              "description": "What happens in this scene",
              "dialogue": "Any spoken words or song lyrics in ${languageName}",
              "action": "Animation/movement description",
              "imagePrompt": "Detailed visual description for illustrating this frame in ${styleDescription} with ${qualityDescription}"
            }
          ]
        }
        
        Create exactly ${frameCount} frames that tell a complete educational story with a clear beginning, middle, and end. Include catchy songs or rhymes when appropriate for animated content, or educational narration for real-life content. All dialogue and narration must be in ${languageName}.`
      },
      {
        role: "user",
        content: `Create a ${durationText} ${style === "animation" ? "animated" : "real-life"} educational video storyboard about: ${prompt}. Use ${qualityDescription}. Make it engaging like popular children's educational YouTube videos. All dialogue, songs, and narration must be in ${languageName}.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 6000,
  });

  const jsonContent = response.choices[0]?.message?.content || "{}";
  const storyboardData = JSON.parse(jsonContent);
  
  // Generate images for each frame (limit to first 6 for performance)
  const framesToGenerate = storyboardData.frames?.slice(0, 6) || [];
  const framesWithImages = await Promise.all(
    framesToGenerate.map(async (frame: StoryboardFrame & { image?: string }) => {
      if (frame.imagePrompt) {
        try {
          const stylePrompt = style === "reallife" 
            ? "Photorealistic, educational photography style"
            : "Colorful animated style like Pixar or Cocomelon";
          
          const imageResponse = await openai.images.generate({
            model: "gpt-image-1",
            prompt: `${stylePrompt}: ${frame.imagePrompt}. Child-friendly, educational, vibrant colors. Do NOT include any text, words, or labels in the image.`,
            n: 1,
            size: "1024x1024",
          });
          
          const imageData = imageResponse.data?.[0]?.b64_json;
          if (imageData) {
            frame.image = `data:image/png;base64,${imageData}`;
          }
        } catch (error) {
          console.error("Failed to generate image for frame:", error);
        }
      }
      return frame;
    })
  );
  
  // Merge the frames with images back into the full frames list
  storyboardData.frames = [
    ...framesWithImages,
    ...(storyboardData.frames?.slice(6) || [])
  ];
  
  // Ensure language is always present in the returned data
  storyboardData.language = languageName;
  storyboardData.languageCode = language;
  
  return storyboardData;
}

// Worksheet generation
async function generateWorksheet(prompt: string, gradeLevel?: string, subject?: string, options?: WorksheetOptions) {
  const context = buildContext(gradeLevel, subject);
  const colorMode = options?.colorMode || "colored";
  
  const colorInstructions = colorMode === "blackWhite" 
    ? "Design for black and white printing. Use clear borders, no background colors, high contrast elements."
    : "Use colorful, engaging design with colored backgrounds, borders, and visual elements.";
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational worksheet creator. Create engaging, printable worksheets for teachers. ${context}
        
        ${colorInstructions}
        
        CRITICAL MATH & NUMBER ACCURACY: All numbers, calculations, equations, and mathematical content MUST be 100% accurate. Double-check all arithmetic. Number sequences must list EVERY number with no gaps — pay special attention to 40+ (40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, etc.). Every decade must be complete. All answers in the answer key must be correct.
        
        Return a JSON object with this exact structure:
        {
          "title": "Worksheet Title",
          "instructions": "Clear instructions for students",
          "colorMode": "${colorMode}",
          "sections": [
            {
              "type": "header|questions|fillBlank|matching|multipleChoice|writingPrompt|drawing",
              "title": "Section Title (optional)",
              "content": ["Question or prompt 1", "Question or prompt 2", ...],
              "answers": ["Answer 1", "Answer 2", ...] (optional, for teacher's key)
            }
          ]
        }
        
        Include a variety of section types for an engaging worksheet. Create 4-8 sections with 3-6 items each.
        For multipleChoice, format each content item as: "Question? A) option B) option C) option D) option"
        For matching, use "Left item -> Right item" format in answers.
        For fillBlank, use underscores like "The ___ is blue" in content.`
      },
      {
        role: "user",
        content: `Create an educational worksheet about: ${prompt}. Make it appropriate, engaging, and classroom-ready.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });

  const jsonContent = response.choices[0]?.message?.content || "{}";
  const worksheetData = JSON.parse(jsonContent);
  
  return worksheetData;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/png";
  return `data:${contentType};base64,${base64}`;
}

function buildContext(gradeLevel?: string, subject?: string): string {
  const parts = [];
  if (gradeLevel) parts.push(`Target grade level: ${gradeLevel}`);
  if (subject) parts.push(`Subject area: ${subject}`);
  return parts.length > 0 ? parts.join(". ") + "." : "";
}

function extractTitle(prompt: string): string {
  // Extract a reasonable title from the prompt
  const words = prompt.split(" ").slice(0, 6);
  return words.join(" ") + (prompt.split(" ").length > 6 ? "..." : "");
}

// Helper function to wrap text for PDF
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateMindmap(prompt: string, gradeLevel?: string, subject?: string, mindmapOptions?: { branchCount?: number; imageStyle?: string; imageQuality?: string; contentStyle?: string; layoutStyle?: string; referenceImages?: string[] }) {
  const context = buildContext(gradeLevel, subject);
  const branchCount = mindmapOptions?.branchCount || 5;
  const imageStyle = mindmapOptions?.imageStyle || "animation";
  const contentStyle = mindmapOptions?.contentStyle || "imagesAndText";
  const imageQuality = mindmapOptions?.imageQuality || "2d";
  const layoutStyle = mindmapOptions?.layoutStyle || "radial";
  const referenceImages = mindmapOptions?.referenceImages || [];

  const imageStyleDesc = imageStyle === "reallife" 
    ? "a realistic, high-quality photograph" 
    : "a cute cartoon illustration";
  
  const includeImages = contentStyle !== "textOnly";

  const imagePromptInstruction = includeImages 
    ? `- IMPORTANT: For centralImagePrompt and each branch imagePrompt, write a clear DALL-E prompt for ${imageStyleDesc} that represents the topic. Always specify: white background, no text, no labels, no words${imageStyle === "animation" ? ", educational cartoon style" : ", realistic photographic style"}.`
    : "";

  const jsonStructure = includeImages ? `
        {
          "title": "Mind Map Title",
          "centralTopic": "The main topic in the center",
          "centralImagePrompt": "${imageStyleDesc} of [the central topic], white background, no text or labels",
          "branches": [
            {
              "label": "Main Branch 1",
              "color": "#FF6B6B",
              "imagePrompt": "${imageStyleDesc} of [this branch topic], white background, no text or labels",
              "children": [
                {
                  "label": "Sub-topic 1a",
                  "children": [
                    { "label": "Detail 1" },
                    { "label": "Detail 2" }
                  ]
                }
              ]
            }
          ]
        }` : `
        {
          "title": "Mind Map Title",
          "centralTopic": "The main topic in the center",
          "branches": [
            {
              "label": "Main Branch 1",
              "color": "#FF6B6B",
              "children": [
                {
                  "label": "Sub-topic 1a",
                  "children": [
                    { "label": "Detail 1" },
                    { "label": "Detail 2" }
                  ]
                }
              ]
            }
          ]
        }`;

  const isPictureBoard = layoutStyle === "pictureboard";
  const isYoungLearner = isPictureBoard || (gradeLevel && ["kindergarten", "grade 1", "grade 2", "grade 3", "primary", "nursery", "pre-k", "year 1", "year 2", "year 3", "p1", "p2", "p3"].some(l => gradeLevel.toLowerCase().includes(l)));

  const learnerGuidance = isYoungLearner
    ? `VERY IMPORTANT - This is for YOUNG LEARNERS (ages 3-8). Think like a language teacher introducing new vocabulary visually:
        - Each branch MUST be a concrete, visible THING that a child can see and touch (e.g. for Transport: Car, Bus, Boat, Airplane, Bicycle — not "Road Transport")
        - Labels should be single simple nouns a child can learn (1-2 words max)
        - imagePrompt must describe ONE single clear object a child would instantly recognize (e.g. "a bright red car", "a yellow school bus", "a blue boat on water")
        - Sub-topics should also be simple concrete nouns or actions children can relate to`
    : `Think like a teacher organizing knowledge clearly:
        - Branch labels should be clear category names (2-4 words)
        - imagePrompt should represent the category with a clear, recognizable visual
        - Sub-topics can include more detail and abstract concepts`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational mind map creator for teachers. ${context}
        
        ${learnerGuidance}
        
        CRITICAL: All spelling must be 100% correct. Double-check every word.
        
        Return a JSON object with this exact structure:
        ${jsonStructure}
        
        Guidelines:
        - Create exactly ${branchCount} main branches from the central topic
        - Each main branch should have 2-4 sub-topics
        - Sub-topics can have 1-3 details each
        - Use distinct, vibrant colors for each main branch (hex colors like #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7, #DDA0DD, #FF8C42, #87CEEB)
        - Keep labels concise and age-appropriate
        - Organize information logically and hierarchically
        ${imagePromptInstruction}`
      },
      {
        role: "user",
        content: referenceImages.length > 0
          ? [
              { type: "text" as const, text: `Create an educational mind map about: ${prompt}${referenceImages.length > 0 ? "\n\nI have attached reference image(s) below. Use them to understand the topic, visual context, and relevant details for the mind map." : ""}` },
              ...referenceImages.map((img) => ({ type: "image_url" as const, image_url: { url: img } })),
            ]
          : `Create an educational mind map about: ${prompt}`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const mindmapData = JSON.parse(content);

  if (includeImages) {
    const imagePrompts: { key: string; prompt: string }[] = [];
    
    if (mindmapData.centralImagePrompt) {
      imagePrompts.push({ key: "centralImage", prompt: mindmapData.centralImagePrompt });
    }
    
    if (mindmapData.branches) {
      mindmapData.branches.forEach((branch: any, index: number) => {
        if (branch.imagePrompt) {
          imagePrompts.push({ key: `branch_${index}`, prompt: branch.imagePrompt });
        }
      });
    }

    const imageResults = await Promise.all(
      imagePrompts.map(async (item) => {
        try {
          const styleAddition = imageStyle === "reallife" 
            ? " Realistic photograph, high quality, professional photography." 
            : " Cute cartoon illustration, colorful, educational style, bright colors.";
          const imgResponse = await openai.images.generate({
            model: "gpt-image-1",
            prompt: item.prompt + styleAddition + " IMPORTANT: Do NOT include any text, words, letters, numbers, or labels in the image. Show ONE clear recognizable object or scene.",
            n: 1,
            size: "1024x1024",
          });
          const imageData = imgResponse.data[0];
          if (!imageData) return { key: item.key, url: null };
          if (imageData.b64_json) {
            return { key: item.key, url: `data:image/png;base64,${imageData.b64_json}` };
          } else if (imageData.url) {
            const b64 = await fetchImageAsBase64(imageData.url);
            return { key: item.key, url: b64 };
          }
          return { key: item.key, url: null };
        } catch (err) {
          console.error(`Failed to generate mind map image for ${item.key}:`, err);
          return { key: item.key, url: null };
        }
      })
    );

    for (const result of imageResults) {
      if (result.key === "centralImage") {
        mindmapData.centralImage = result.url;
      } else if (result.key.startsWith("branch_")) {
        const index = parseInt(result.key.split("_")[1]);
        if (mindmapData.branches[index]) {
          mindmapData.branches[index].image = result.url;
        }
      }
    }
  }

  mindmapData.options = { layoutStyle, imageStyle, imageQuality, contentStyle, branchCount };
  return mindmapData;
}

// ============================================
// SUBSCRIPTION & STRIPE ROUTES
// ============================================

export function registerSubscriptionRoutes(app: any) {
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/config", async (req: any, res: any) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Get subscription plans/prices
  app.get("/api/subscription/plans", async (req: any, res: any) => {
    try {
      const rows = await stripeService.listProductsWithPrices();
      
      // Group prices by product
      const productsMap = new Map();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ plans: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  // Get current user subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = req.session?.user?.email || req.user?.claims?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      
      if (isCEO) {
        return res.json({
          tier: "yearly",
          status: "active",
          isPremium: true,
          isCEO: true,
          subscriptionEndsAt: null
        });
      }

      const user = await stripeService.getUser(userId);
      if (!user) {
        return res.json({ 
          tier: "free",
          status: "inactive",
          isPremium: false
        });
      }

      let subscription = null;
      if (user.stripeSubscriptionId) {
        subscription = await stripeService.getSubscription(user.stripeSubscriptionId);
      }

      res.json({
        tier: user.subscriptionTier || "free",
        status: user.subscriptionStatus || "inactive",
        isPremium: user.subscriptionTier !== "free" && user.subscriptionStatus === "active",
        subscriptionEndsAt: user.subscriptionEndsAt,
        subscription
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/subscription/checkout", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;
      const { priceId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      let user = await stripeService.getUser(userId);
      let customerId = user?.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripeService.createCustomer(userEmail || "", userId);
        await stripeService.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      // Create checkout session
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/?checkout=success`,
        `${baseUrl}/pricing?checkout=cancelled`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create customer portal session for managing subscription
  app.post("/api/subscription/portal", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await stripeService.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // ============ PADDLE ROUTES ============

  // Get Paddle client config (public)
  app.get("/api/paddle/config", async (req: any, res: any) => {
    try {
      res.json({
        clientToken: process.env.PADDLE_CLIENT_TOKEN || "",
      });
    } catch (error) {
      console.error("Error fetching Paddle config:", error);
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // Get Paddle price IDs
  app.get("/api/paddle/prices", isAuthenticated, async (req: any, res: any) => {
    try {
      res.json({
        weekly: process.env.PADDLE_WEEKLY_PRICE_ID || "",
        monthly: process.env.PADDLE_MONTHLY_PRICE_ID || "",
        yearly: process.env.PADDLE_YEARLY_PRICE_ID || "",
      });
    } catch (error) {
      console.error("Error fetching Paddle prices:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  // Cancel subscription via Paddle
  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const success = await paddleService.cancelSubscription(userId);
      if (success) {
        res.json({ success: true, message: "Subscription will be cancelled at end of billing period" });
      } else {
        res.status(400).json({ error: "No active subscription found" });
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Paddle webhook handler
  app.post("/api/paddle/webhook", async (req: any, res: any) => {
    try {
      const signature = req.headers["paddle-signature"];
      const rawBody = JSON.stringify(req.body);
      
      // Verify webhook signature if secret is set
      const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        const parts = signature.split(";").reduce((acc: any, part: string) => {
          const [key, value] = part.split("=");
          acc[key] = value;
          return acc;
        }, {});
        
        const timestamp = parts["ts"];
        const receivedHash = parts["h1"];
        
        const signedPayload = `${timestamp}:${rawBody}`;
        const expectedHash = crypto
          .createHmac("sha256", webhookSecret)
          .update(signedPayload)
          .digest("hex");
        
        if (expectedHash !== receivedHash) {
          console.error("Invalid Paddle webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const event = req.body;
      const eventType = event.event_type;
      const data = event.data;

      console.log(`Paddle webhook received: ${eventType}`);

      switch (eventType) {
        case "subscription.created":
          await paddleService.handleSubscriptionCreated(data);
          break;
        case "subscription.updated":
          await paddleService.handleSubscriptionUpdated(data);
          break;
        case "subscription.canceled":
          await paddleService.handleSubscriptionCanceled(data);
          break;
        case "subscription.activated":
          await paddleService.handleSubscriptionUpdated(data);
          break;
        default:
          console.log(`Unhandled Paddle event: ${eventType}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing Paddle webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============ PESAPAL ROUTES ============

  app.get("/api/pesapal/config", async (req: any, res: any) => {
    res.json({ configured: pesapalService.isConfigured() });
  });

  app.get("/api/pricing", async (req: any, res: any) => {
    try {
      const countryCode = (req.query.country as string) || 'US';
      const pricing = pesapalService.getLocalizedPricing(countryCode);
      res.json(pricing);
    } catch (error) {
      console.error("Pricing error:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

  app.get("/api/currencies", async (_req: any, res: any) => {
    res.json(pesapalService.getSupportedCurrencies());
  });

  app.post("/api/pesapal/checkout", async (req: any, res: any) => {
    try {
      const sessionUserId = req.session?.userId;
      const sessionUser = req.session?.user;
      if (!sessionUserId || !sessionUser) {
        return res.status(401).json({ error: "Please sign in to subscribe" });
      }

      const { tier, currency } = req.body;
      if (!tier || !['weekly', 'monthly', 'yearly'].includes(tier)) {
        return res.status(400).json({ error: "Invalid subscription tier" });
      }

      const price = pesapalService.getTierPrice(tier, currency);
      if (!price) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const result = await pesapalService.submitOrder({
        userId: sessionUserId,
        email: sessionUser.email || '',
        firstName: sessionUser.firstName || '',
        lastName: sessionUser.lastName || '',
        amount: price.amount,
        currency: price.currency,
        tier,
        callbackUrl: `${baseUrl}/api/pesapal/callback`,
        ipnUrl: `${baseUrl}/api/pesapal/ipn`,
      });

      res.json({ url: result.redirectUrl, orderTrackingId: result.orderTrackingId });
    } catch (error: any) {
      console.error("PesaPal checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout" });
    }
  });

  app.get("/api/pesapal/callback", async (req: any, res: any) => {
    try {
      const { OrderTrackingId, OrderMerchantReference } = req.query;
      if (!OrderTrackingId) {
        return res.redirect('/pricing?payment=failed');
      }

      const status = await pesapalService.getTransactionStatus(OrderTrackingId as string);

      if (status.paymentStatusDescription === 'Completed') {
        const [payment] = await db.select().from(payments)
          .where(eq(payments.pesapalTrackingId, OrderTrackingId as string))
          .limit(1);

        if (payment) {
          await pesapalService.updatePaymentStatus(
            payment.orderId,
            'completed',
            status.paymentMethod,
            status.confirmationCode,
          );
          await pesapalService.activateSubscription(payment.userId, payment.tier, OrderTrackingId as string);

          const [user] = await db.select().from(users).where(eq(users.id, payment.userId)).limit(1);
          if (user?.email) {
            const { sendPaymentReceiptEmail } = await import("./emailService");
            const endDate = pesapalService.getSubscriptionEndDate(payment.tier);
            await sendPaymentReceiptEmail(user.email, {
              orderId: payment.orderId,
              amount: status.amount,
              currency: status.currency,
              planName: payment.tier.charAt(0).toUpperCase() + payment.tier.slice(1),
              paymentMethod: status.paymentMethod,
              confirmationCode: status.confirmationCode,
              date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              nextBillingDate: endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer',
            });

            await db.update(payments)
              .set({ receiptSentAt: new Date() })
              .where(eq(payments.orderId, payment.orderId));
          }
        }

        res.redirect('/payment/callback?status=success');
      } else if (status.paymentStatusDescription === 'Failed') {
        const [payment] = await db.select().from(payments)
          .where(eq(payments.pesapalTrackingId, OrderTrackingId as string))
          .limit(1);
        if (payment) {
          await pesapalService.updatePaymentStatus(payment.orderId, 'failed');
        }
        res.redirect('/payment/callback?status=failed');
      } else {
        res.redirect('/payment/callback?status=pending');
      }
    } catch (error) {
      console.error("PesaPal callback error:", error);
      res.redirect('/payment/callback?status=failed');
    }
  });

  app.get("/api/pesapal/ipn", async (req: any, res: any) => {
    try {
      const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

      if (!OrderTrackingId) {
        return res.status(400).json({ error: "Missing OrderTrackingId" });
      }

      const status = await pesapalService.getTransactionStatus(OrderTrackingId as string);

      const [payment] = await db.select().from(payments)
        .where(eq(payments.pesapalTrackingId, OrderTrackingId as string))
        .limit(1);

      if (!payment) {
        console.error("IPN: Payment not found for tracking ID:", OrderTrackingId);
        return res.json({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId });
      }

      if (status.paymentStatusDescription === 'Completed' && payment.status !== 'completed') {
        await pesapalService.updatePaymentStatus(
          payment.orderId,
          'completed',
          status.paymentMethod,
          status.confirmationCode,
        );
        await pesapalService.activateSubscription(payment.userId, payment.tier, OrderTrackingId as string);

        const [user] = await db.select().from(users).where(eq(users.id, payment.userId)).limit(1);
        if (user?.email && !payment.receiptSentAt) {
          const { sendPaymentReceiptEmail } = await import("./emailService");
          const endDate = pesapalService.getSubscriptionEndDate(payment.tier);
          await sendPaymentReceiptEmail(user.email, {
            orderId: payment.orderId,
            amount: status.amount,
            currency: status.currency,
            planName: payment.tier.charAt(0).toUpperCase() + payment.tier.slice(1),
            paymentMethod: status.paymentMethod,
            confirmationCode: status.confirmationCode,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            nextBillingDate: endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer',
          });

          await db.update(payments)
            .set({ receiptSentAt: new Date() })
            .where(eq(payments.orderId, payment.orderId));
        }
      } else if (status.paymentStatusDescription === 'Failed') {
        await pesapalService.updatePaymentStatus(payment.orderId, 'failed');
      }

      res.json({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId });
    } catch (error) {
      console.error("PesaPal IPN error:", error);
      res.status(500).json({ error: "IPN processing failed" });
    }
  });

  // ============ PAYMENT HISTORY & USAGE ============

  app.get("/api/payments/history", async (req: any, res: any) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userPayments = await db.select().from(payments)
        .where(eq(payments.userId, sessionUserId))
        .orderBy(desc(payments.createdAt));

      res.json({ payments: userPayments });
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  app.get("/api/usage/breakdown", async (req: any, res: any) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usageByType = await db.select({
        featureType: featureUsage.featureType,
        count: count(),
      })
        .from(featureUsage)
        .where(and(
          eq(featureUsage.userId, sessionUserId),
          gte(featureUsage.createdAt, thirtyDaysAgo),
        ))
        .groupBy(featureUsage.featureType);

      const totalUsage = await db.select({ count: count() })
        .from(featureUsage)
        .where(eq(featureUsage.userId, sessionUserId));

      const subscriptionStatus = await stripeService.getSubscriptionStatus(sessionUserId);

      res.json({
        usageByType,
        totalGenerations: totalUsage[0]?.count || 0,
        isPremium: subscriptionStatus.isPremium,
        tier: subscriptionStatus.tier,
      });
    } catch (error) {
      console.error("Error fetching usage breakdown:", error);
      res.status(500).json({ error: "Failed to fetch usage breakdown" });
    }
  });
}
