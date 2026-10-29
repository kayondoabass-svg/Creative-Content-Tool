import { BUSINESS_PAGE_LIMIT, FREE_PAGE_LIMIT, PAID_PAGE_LIMIT } from "../packages/brightboard-tv/src/page-limits";
type TVUser = {
  isOwner?: boolean | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: Date | string | null;
} | null | undefined;
export function canSaveTVLibrary(user: TVUser, now = Date.now()): boolean {
  if (!user) return false;
  if (user.isOwner === true) return true;
  return !!user.subscriptionTier && ["weekly", "monthly", "yearly", "institution"].includes(user.subscriptionTier) &&
    user.subscriptionStatus === "active" &&
    !!user.subscriptionEndsAt && new Date(user.subscriptionEndsAt).getTime() > now;
}
export function tvPageLimit(user: TVUser, now = Date.now()): number {
  if (!canSaveTVLibrary(user, now)) return FREE_PAGE_LIMIT;
  // Owner access uses the bounded business ceiling, not an unlimited bypass.
  return user?.isOwner === true || user?.subscriptionTier === "institution" ? BUSINESS_PAGE_LIMIT : PAID_PAGE_LIMIT;
}
