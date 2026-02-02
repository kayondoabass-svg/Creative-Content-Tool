import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface SubscriptionStatus {
  isPremium: boolean;
  tier: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();

  const { data: status, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  // Owner always gets premium access
  const isOwner = user?.isOwner === true;

  return {
    isPremium: isOwner || (status?.isPremium ?? false),
    tier: isOwner ? "yearly" : (status?.tier ?? null),
    status: isOwner ? "active" : (status?.status ?? null),
    currentPeriodEnd: status?.currentPeriodEnd ?? null,
    isLoading,
  };
}
