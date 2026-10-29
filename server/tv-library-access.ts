export function canSaveTVLibrary(user: {
  isOwner?: boolean | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: Date | string | null;
} | null | undefined, now = Date.now()): boolean {
  if (!user) return false;
  if (user.isOwner === true) return true;
  return !!user.subscriptionTier && ["weekly", "monthly", "yearly"].includes(user.subscriptionTier) &&
    user.subscriptionStatus === "active" &&
    !!user.subscriptionEndsAt && new Date(user.subscriptionEndsAt).getTime() > now;
}
