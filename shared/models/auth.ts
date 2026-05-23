import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, boolean, integer } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Custom auth fields
  passwordHash: varchar("password_hash"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Subscription fields
  subscriptionTier: varchar("subscription_tier").default("free"), // free, weekly, monthly, yearly
  subscriptionStatus: varchar("subscription_status").default("inactive"), // inactive, active, cancelled
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Paddle subscription fields
  paddleCustomerId: varchar("paddle_customer_id"),
  paddleSubscriptionId: varchar("paddle_subscription_id"),
  // PesaPal payment fields
  pesapalCustomerId: varchar("pesapal_customer_id"),
  pesapalOrderTrackingId: varchar("pesapal_order_tracking_id"),
  // Free tier usage tracking
  freeImageCount: integer("free_image_count").default(0),
  freePresentationCount: integer("free_presentation_count").default(0),
  freeVideoCount: integer("free_video_count").default(0),
  freeMindmapCount: integer("free_mindmap_count").default(0),
  freeWorksheetCount: integer("free_worksheet_count").default(0),
  freeTextCount: integer("free_text_count").default(0),
  freeActivityCount: integer("free_activity_count").default(0),
  usageResetDate: timestamp("usage_reset_date").defaultNow(),
  // Analytics fields
  country: varchar("country"),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  // Owner/Admin fields
  isOwner: boolean("is_owner").default(false),
  referredBy: varchar("referred_by"),
  // Social login fields
  socialProvider: varchar("social_provider"), // 'facebook' | 'tiktok' | 'google'
  socialId: varchar("social_id"), // provider's user ID
  // Engagement tracking
  activationEmailSentAt: timestamp("activation_email_sent_at"),
});

// Email verification codes table
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code").notNull(),
  token: varchar("token", { length: 64 }), // for magic-link verification
  type: varchar("type").notNull(), // 'email_verification' or 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Subscription tier type
export type SubscriptionTier = "free" | "weekly" | "monthly" | "yearly";

// Login event tracking (for owner analytics)
export const loginEvents = pgTable("login_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LoginEvent = typeof loginEvents.$inferSelect;

// Page view tracking (anonymous + authenticated visitors)
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),       // null = anonymous
  path: varchar("path"),
  ipHash: varchar("ip_hash"),       // anonymized visitor fingerprint (sha256 of IP+salt)
  isBot: boolean("is_bot").default(false), // true if User-Agent matches bot patterns
  createdAt: timestamp("created_at").defaultNow(),
});

export type PageView = typeof pageViews.$inferSelect;

// Feature usage tracking table
export const featureUsage = pgTable("feature_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  featureType: varchar("feature_type").notNull(), // image, presentation, text, activity, storyboard, worksheet
  createdAt: timestamp("created_at").defaultNow(),
});

export type FeatureUsage = typeof featureUsage.$inferSelect;

// Job postings table for hiring
export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  department: varchar("department").notNull(),
  location: varchar("location").notNull(),
  type: varchar("type").notNull(), // full-time, part-time, contract, remote
  description: varchar("description"),
  requirements: varchar("requirements"),
  salary: varchar("salary"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = typeof jobPostings.$inferInsert;

export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(),
  website: varchar("website"),
  socialMedia: varchar("social_media"),
  audience: varchar("audience"),
  reason: varchar("reason"),
  referralCode: varchar("referral_code").notNull().unique(),
  status: varchar("status").default("pending").notNull(),
  totalReferrals: integer("total_referrals").default(0).notNull(),
  totalEarnings: integer("total_earnings").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedReason: varchar("rejected_reason"),
});

export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = typeof affiliates.$inferInsert;

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  name: varchar("name"),
  status: varchar("status").default("active").notNull(),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
