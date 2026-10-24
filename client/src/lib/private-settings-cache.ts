import type { QueryClient } from "@tanstack/react-query";

export const organizationSettingsKey = (userId?: string) => ["/api/settings", userId] as const;

export function clearOtherOrganizationSettings(client: QueryClient, userId?: string) {
  client.removeQueries({
    queryKey: ["/api/settings"],
    predicate: query => !userId || query.queryKey[1] !== userId,
  });
}
