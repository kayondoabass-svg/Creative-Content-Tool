import { db } from './db';
import { users, featureUsage } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
}

export async function getSubscriptionStatus(userId: string) {
  const user = await getUser(userId);
  if (!user) return { isPremium: false, tier: 'free', status: 'inactive' };
  const isPremium = user.subscriptionTier !== 'free' && user.subscriptionStatus === 'active';
  return {
    isPremium,
    tier: user.subscriptionTier || 'free',
    status: user.subscriptionStatus || 'inactive',
  };
}

export async function getUserUsage(userId: string) {
  const user = await getUser(userId);
  if (!user) {
    return { imageCount: 0, presentationCount: 0, videoCount: 0, mindmapCount: 0, worksheetCount: 0, textCount: 0, activityCount: 0, resetDate: new Date() };
  }

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
      usageResetDate: now,
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
    resetDate,
  };
}

export async function incrementUsage(userId: string, type: 'image' | 'presentation' | 'video' | 'mindmap' | 'worksheet' | 'text' | 'activity') {
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

export async function trackFeatureUsage(userId: string, featureType: string) {
  await db.insert(featureUsage).values({ userId, featureType });
}
