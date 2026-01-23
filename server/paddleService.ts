import { Paddle } from "@paddle/paddle-node-sdk";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

export interface PaddlePrice {
  id: string;
  name: string;
  amount: string;
  currency: string;
  interval: "week" | "month" | "year";
}

export const PADDLE_PRICES: Record<string, PaddlePrice> = {
  weekly: {
    id: process.env.PADDLE_WEEKLY_PRICE_ID || "",
    name: "Weekly",
    amount: "4.99",
    currency: "USD",
    interval: "week",
  },
  monthly: {
    id: process.env.PADDLE_MONTHLY_PRICE_ID || "",
    name: "Monthly",
    amount: "14.99",
    currency: "USD",
    interval: "month",
  },
  yearly: {
    id: process.env.PADDLE_YEARLY_PRICE_ID || "",
    name: "Yearly",
    amount: "99.99",
    currency: "USD",
    interval: "year",
  },
};

export async function getSubscriptionStatus(userId: string): Promise<{
  isPremium: boolean;
  tier: string | null;
  expiresAt: Date | null;
  paddleSubscriptionId: string | null;
}> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { isPremium: false, tier: null, expiresAt: null, paddleSubscriptionId: null };
    }

    const isPremium = !!(user.subscriptionStatus === "active" && 
      user.subscriptionEndsAt && 
      new Date(user.subscriptionEndsAt) > new Date());

    return {
      isPremium,
      tier: user.subscriptionTier,
      expiresAt: user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null,
      paddleSubscriptionId: user.paddleSubscriptionId,
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return { isPremium: false, tier: null, expiresAt: null, paddleSubscriptionId: null };
  }
}

export async function handleSubscriptionCreated(data: any) {
  const customerId = data.custom_data?.user_id;
  if (!customerId) {
    console.error("No user_id in subscription custom_data");
    return;
  }

  const subscriptionId = data.id;
  const status = data.status;
  const priceId = data.items?.[0]?.price?.id;

  let tier = "monthly";
  if (priceId === PADDLE_PRICES.weekly.id) tier = "weekly";
  else if (priceId === PADDLE_PRICES.yearly.id) tier = "yearly";

  const currentPeriodEnd = data.current_billing_period?.ends_at 
    ? new Date(data.current_billing_period.ends_at) 
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({
      paddleSubscriptionId: subscriptionId,
      paddleCustomerId: data.customer_id,
      subscriptionStatus: status === "active" ? "active" : "inactive",
      subscriptionTier: tier,
      subscriptionEndsAt: currentPeriodEnd,
    })
    .where(eq(users.id, customerId));

  console.log(`Subscription created for user ${customerId}: ${tier}`);
}

export async function handleSubscriptionUpdated(data: any) {
  const subscriptionId = data.id;
  const status = data.status;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    console.error("No user found for subscription:", subscriptionId);
    return;
  }

  const priceId = data.items?.[0]?.price?.id;
  let tier = user.subscriptionTier;
  if (priceId === PADDLE_PRICES.weekly.id) tier = "weekly";
  else if (priceId === PADDLE_PRICES.monthly.id) tier = "monthly";
  else if (priceId === PADDLE_PRICES.yearly.id) tier = "yearly";

  const currentPeriodEnd = data.current_billing_period?.ends_at 
    ? new Date(data.current_billing_period.ends_at) 
    : user.subscriptionEndsAt;

  await db
    .update(users)
    .set({
      subscriptionStatus: status === "active" ? "active" : "inactive",
      subscriptionTier: tier,
      subscriptionEndsAt: currentPeriodEnd,
    })
    .where(eq(users.id, user.id));

  console.log(`Subscription updated for user ${user.id}: ${status}`);
}

export async function handleSubscriptionCanceled(data: any) {
  const subscriptionId = data.id;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    console.error("No user found for subscription:", subscriptionId);
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: "canceled",
    })
    .where(eq(users.id, user.id));

  console.log(`Subscription canceled for user ${user.id}`);
}

export async function cancelSubscription(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.paddleSubscriptionId) {
      return false;
    }

    await paddle.subscriptions.cancel(user.paddleSubscriptionId, {
      effectiveFrom: "next_billing_period",
    });

    return true;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return false;
  }
}

export { paddle };
