import { useQuery } from "@tanstack/react-query";
import type { OrganizationSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { organizationSettingsKey } from "@/lib/private-settings-cache";

export function useOrganizationSettings(enabled = true) {
  const { user } = useAuth();
  return useQuery<OrganizationSettings>({
    queryKey: organizationSettingsKey(user?.id),
    queryFn: async () => (await apiRequest("GET", "/api/settings")).json(),
    enabled: enabled && !!user,
    staleTime: 0,
  });
}
