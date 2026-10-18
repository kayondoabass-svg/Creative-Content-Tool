import { pgTable, integer, jsonb, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

// Kept in the schema registry so future schema pushes preserve the additive
// referral tables. Runtime initialization supports the prebuilt VPS deployment.
export const referralPolicy = pgTable("referral_policy", {
  id: integer("id").primaryKey(), config: jsonb("config").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const referralProfiles = pgTable("referral_profiles", {
  affiliateId: varchar("affiliate_id").primaryKey(),
  payoutMethod: text("payout_method"), payoutDetails: text("payout_details"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
});
export const referralPayouts = pgTable("referral_payouts", {
  id: text("id").primaryKey(), affiliateId: varchar("affiliate_id").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(), amount: integer("amount").notNull(),
  status: text("status").default("requested").notNull(), method: text("method").notNull(),
  details: text("details").notNull(), reference: text("reference"), note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const referralCommissions = pgTable("referral_commissions", {
  id: text("id").primaryKey(), affiliateId: varchar("affiliate_id").notNull(),
  paymentId: integer("payment_id").unique().notNull(), orderId: text("order_id").notNull(),
  amount: integer("amount").notNull(), currency: varchar("currency", { length: 3 }).notNull(),
  status: text("status").notNull(), availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
  payoutId: text("payout_id"), policySnapshot: jsonb("policy_snapshot").notNull(), note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const referralActivityLog = pgTable("referral_activity", {
  id: text("id").primaryKey(), affiliateId: varchar("affiliate_id").notNull(),
  actorId: text("actor_id"), action: text("action").notNull(), note: text("note"),
  internal: boolean("internal").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const referralNotifications = pgTable("referral_notifications", {
  id: text("id").primaryKey(), eventKey: text("event_key").unique().notNull(),
  recipient: text("recipient").notNull(), subject: text("subject").notNull(),
  html: text("html").notNull(), bodyText: text("body_text").notNull(),
  status: text("status").default("pending").notNull(), attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }), sentAt: timestamp("sent_at", { withTimezone: true }),
});
export const referralLinkVisits = pgTable("referral_link_visits", {
  id: text("id").primaryKey(), affiliateId: varchar("affiliate_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
