import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users, featureUsage, jobPostings, type JobPosting, type InsertJobPosting } from '@shared/schema';
import { eq, sql, desc, count } from 'drizzle-orm';

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
      return { imageCount: 0, presentationCount: 0, videoCount: 0, mindmapCount: 0, worksheetCount: 0, textCount: 0, activityCount: 0, resetDate: new Date() };
    }
    
    // Check if we need to reset counts (daily reset)
    const now = new Date();
    const resetDate = user.usageResetDate ? new Date(user.usageResetDate) : new Date(0);
    const isSameDay = now.toDateString() === resetDate.toDateString();
    
    if (!isSameDay) {
      await db.update(users).set({
        freeImageCount: 0,
        freePresentationCount: 0,
        freeVideoCount: 0,
        freeMindmapCount: 0,
        freeWorksheetCount: 0,
        freeTextCount: 0,
        freeActivityCount: 0,
        usageResetDate: now
      }).where(eq(users.id, userId));
      return { imageCount: 0, presentationCount: 0, videoCount: 0, mindmapCount: 0, worksheetCount: 0, textCount: 0, activityCount: 0, resetDate: now };
    }
    
    return {
      imageCount: user.freeImageCount || 0,
      presentationCount: user.freePresentationCount || 0,
      videoCount: user.freeVideoCount || 0,
      mindmapCount: user.freeMindmapCount || 0,
      worksheetCount: user.freeWorksheetCount || 0,
      textCount: user.freeTextCount || 0,
      activityCount: user.freeActivityCount || 0,
      resetDate
    };
  }

  async incrementUsage(userId: string, type: 'image' | 'presentation' | 'video' | 'mindmap' | 'worksheet' | 'text' | 'activity') {
    if (type === 'image') {
      await db.update(users).set({ freeImageCount: sql`COALESCE(${users.freeImageCount}, 0) + 1` }).where(eq(users.id, userId));
    } else if (type === 'presentation') {
      await db.update(users).set({ freePresentationCount: sql`COALESCE(${users.freePresentationCount}, 0) + 1` }).where(eq(users.id, userId));
    } else if (type === 'video') {
      await db.update(users).set({ freeVideoCount: sql`COALESCE(${users.freeVideoCount}, 0) + 1` }).where(eq(users.id, userId));
    } else if (type === 'mindmap') {
      await db.update(users).set({ freeMindmapCount: sql`COALESCE(${users.freeMindmapCount}, 0) + 1` }).where(eq(users.id, userId));
    } else if (type === 'worksheet') {
      await db.update(users).set({ freeWorksheetCount: sql`COALESCE(${users.freeWorksheetCount}, 0) + 1` }).where(eq(users.id, userId));
    } else if (type === 'text') {
      await db.update(users).set({ freeTextCount: sql`COALESCE(${users.freeTextCount}, 0) + 1` }).where(eq(users.id, userId));
    } else if (type === 'activity') {
      await db.update(users).set({ freeActivityCount: sql`COALESCE(${users.freeActivityCount}, 0) + 1` }).where(eq(users.id, userId));
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

  // CEO Dashboard Analytics
  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats() {
    const allUsers = await db.select().from(users);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalUsers = allUsers.length;
    const newToday = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= today).length;
    const newThisWeek = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= weekAgo).length;
    const newThisMonth = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= monthAgo).length;

    const freeUsers = allUsers.filter(u => !u.subscriptionTier || u.subscriptionTier === 'free').length;
    const premiumUsers = allUsers.filter(u => u.subscriptionTier && u.subscriptionTier !== 'free' && u.subscriptionStatus === 'active').length;
    const weeklySubscribers = allUsers.filter(u => u.subscriptionTier === 'weekly' && u.subscriptionStatus === 'active').length;
    const monthlySubscribers = allUsers.filter(u => u.subscriptionTier === 'monthly' && u.subscriptionStatus === 'active').length;
    const yearlySubscribers = allUsers.filter(u => u.subscriptionTier === 'yearly' && u.subscriptionStatus === 'active').length;

    return {
      totalUsers,
      newToday,
      newThisWeek,
      newThisMonth,
      freeUsers,
      premiumUsers,
      weeklySubscribers,
      monthlySubscribers,
      yearlySubscribers
    };
  }

  async getCountryStats() {
    const allUsers = await db.select().from(users);
    const countryMap: Record<string, number> = {};
    
    for (const user of allUsers) {
      const country = user.country || 'Unknown';
      countryMap[country] = (countryMap[country] || 0) + 1;
    }

    return Object.entries(countryMap)
      .map(([country, userCount]) => ({ country, userCount }))
      .sort((a, b) => b.userCount - a.userCount);
  }

  async getFeatureUsageStats() {
    const result = await db.select({
      featureType: featureUsage.featureType,
      usageCount: count()
    })
    .from(featureUsage)
    .groupBy(featureUsage.featureType);
    
    return result.map(r => ({
      featureType: r.featureType,
      usageCount: Number(r.usageCount)
    }));
  }

  async trackFeatureUsage(userId: string, featureType: string) {
    await db.insert(featureUsage).values({
      userId,
      featureType
    });
  }

  async updateUserCountry(userId: string, country: string) {
    await db.update(users).set({ country, lastActiveAt: new Date() }).where(eq(users.id, userId));
  }

  // Job Postings CRUD
  async getJobPostings(activeOnly = true) {
    if (activeOnly) {
      return await db.select().from(jobPostings).where(eq(jobPostings.isActive, true)).orderBy(desc(jobPostings.createdAt));
    }
    return await db.select().from(jobPostings).orderBy(desc(jobPostings.createdAt));
  }

  async createJobPosting(job: Omit<InsertJobPosting, 'id' | 'createdAt' | 'updatedAt'>) {
    const [created] = await db.insert(jobPostings).values(job).returning();
    return created;
  }

  async updateJobPosting(id: string, job: Partial<InsertJobPosting>) {
    const [updated] = await db.update(jobPostings)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(jobPostings.id, id))
      .returning();
    return updated;
  }

  async deleteJobPosting(id: string) {
    await db.delete(jobPostings).where(eq(jobPostings.id, id));
  }
}

export const stripeService = new StripeService();
