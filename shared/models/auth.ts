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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Subscription fields
  subscriptionTier: varchar("subscription_tier").default("free"), // free, weekly, monthly, yearly
  subscriptionStatus: varchar("subscription_status").default("inactive"), // inactive, active, cancelled
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Free tier usage tracking
  freeImageCount: integer("free_image_count").default(0),
  freePresentationCount: integer("free_presentation_count").default(0),
  freeVideoCount: integer("free_video_count").default(0),
  usageResetDate: timestamp("usage_reset_date").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Subscription tier type
export type SubscriptionTier = "free" | "weekly" | "monthly" | "yearly";
