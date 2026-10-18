import { z } from "zod";

export const policySchema = z.object({
  active: z.boolean(),
  confirmed: z.literal(true),
  mode: z.enum(["percentage", "fixed"]),
  percent: z.number().min(0).max(100),
  fixedCurrency: z.string().regex(/^[A-Z]{3}$/),
  fixedRates: z.object({
    weekly: z.number().int().min(0).max(100000000),
    monthly: z.number().int().min(0).max(100000000),
    institution: z.number().int().min(0).max(100000000),
  }),
  holdDays: z.number().int().min(0).max(365),
  minimumByCurrency: z.record(z.string().regex(/^[A-Z]{3}$/), z.number().int().min(1).max(100000000)),
  attributionDays: z.literal(90).default(90),
});

export const draftReferralPolicy = {
  active: false, mode: "percentage" as "percentage" | "fixed", percent: 30,
  fixedCurrency: "USD", fixedRates: { weekly: 100, monthly: 200, institution: 500 },
  holdDays: 30, minimumByCurrency: { USD: 5000 } as Record<string, number>, attributionDays: 90,
};

export function calculateCommission(
  payment: { amount: number; currency: string; tier: string },
  policy: typeof draftReferralPolicy,
) {
  if (!policy.active) return null;
  if (policy.mode === "fixed") {
    const amount = policy.fixedRates[payment.tier as keyof typeof policy.fixedRates];
    return amount > 0 ? { amount, currency: policy.fixedCurrency } : null;
  }
  const amount = Math.round(payment.amount * policy.percent / 100);
  return amount > 0 ? { amount, currency: payment.currency } : null;
}

export function affiliateOwnedBy(
  user: { email?: string | null; emailVerified?: boolean | null; isOwner?: boolean | null },
  affiliate: { email: string },
) {
  return Boolean(user.isOwner || (user.emailVerified && user.email &&
    user.email.toLowerCase() === affiliate.email.toLowerCase()));
}

export function safeCsv(value: unknown): string {
  const text = String(value ?? "");
  // Prevent spreadsheet formula execution when founders open an export.
  return `"${(/^(?:\s*[=+\-@]|[\t\r])/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
}
