import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface SubscriptionStatus {
  isPremium: boolean;
  tier: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();

  const { data: status, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  return {
    isPremium: status?.isPremium ?? false,
    tier: status?.tier ?? null,
    status: status?.status ?? null,
    currentPeriodEnd: status?.currentPeriodEnd ?? null,
    isLoading,
  };
}
