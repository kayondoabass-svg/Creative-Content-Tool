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
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Paddle subscription fields
  paddleCustomerId: varchar("paddle_customer_id"),
  paddleSubscriptionId: varchar("paddle_subscription_id"),
  // Free tier usage tracking
  freeImageCount: integer("free_image_count").default(0),
  freePresentationCount: integer("free_presentation_count").default(0),
  freeVideoCount: integer("free_video_count").default(0),
  usageResetDate: timestamp("usage_reset_date").defaultNow(),
  // Analytics fields
  country: varchar("country"),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  // Owner/Admin fields
  isOwner: boolean("is_owner").default(false),
});

// Email verification codes table
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code").notNull(),
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
