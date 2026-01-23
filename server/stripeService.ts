import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class StripeService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getSubscriptionStatus(userId: string) {
    const user = await this.getUser(userId);
    if (!user) {
      return { isPremium: false, tier: 'free', status: 'inactive' };
    }
    const isPremium = user.subscriptionTier !== 'free' && user.subscriptionStatus === 'active';
    return {
      isPremium,
      tier: user.subscriptionTier || 'free',
      status: user.subscriptionStatus || 'inactive'
    };
  }

  async getUserUsage(userId: string) {
    const user = await this.getUser(userId);
    if (!user) {
      return { imageCount: 0, presentationCount: 0, videoCount: 0, resetDate: new Date() };
    }
    
    // Check if we need to reset counts (daily reset)
    const now = new Date();
    const resetDate = user.usageResetDate ? new Date(user.usageResetDate) : new Date(0);
    const isSameDay = now.toDateString() === resetDate.toDateString();
    
    if (!isSameDay) {
      // Reset counters for a new day
      await db.update(users).set({
        freeImageCount: 0,
        freePresentationCount: 0,
        freeVideoCount: 0,
        usageResetDate: now
      }).where(eq(users.id, userId));
      return { imageCount: 0, presentationCount: 0, videoCount: 0, resetDate: now };
    }
    
    return {
      imageCount: user.freeImageCount || 0,
      presentationCount: user.freePresentationCount || 0,
      videoCount: user.freeVideoCount || 0,
      resetDate
    };
  }

  async incrementUsage(userId: string, type: 'image' | 'presentation' | 'video') {
    const column = type === 'image' ? 'freeImageCount' : 
                   type === 'presentation' ? 'freePresentationCount' : 'freeVideoCount';
    
    if (type === 'image') {
      await db.update(users).set({
        freeImageCount: sql`COALESCE(${users.freeImageCount}, 0) + 1`
      }).where(eq(users.id, userId));
    } else if (type === 'presentation') {
      await db.update(users).set({
        freePresentationCount: sql`COALESCE(${users.freePresentationCount}, 0) + 1`
      }).where(eq(users.id, userId));
    } else {
      await db.update(users).set({
        freeVideoCount: sql`COALESCE(${users.freeVideoCount}, 0) + 1`
      }).where(eq(users.id, userId));
    }
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    subscriptionEndsAt?: Date;
  }) {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user;
  }
}

export const stripeService = new StripeService();
