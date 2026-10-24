import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { organizationSettingsKey, clearOtherOrganizationSettings } from "./private-settings-cache";

test("account switches never reuse the previous teacher's cached logo, even with infinite freshness", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(["/api/settings"], { logo: "legacy-global-logo" });
  client.setQueryData(organizationSettingsKey("teacher-a"), { logo: "private-a" });
  assert.equal(client.getQueryData(organizationSettingsKey("teacher-b")), undefined);
  clearOtherOrganizationSettings(client, "teacher-b");
  assert.equal(client.getQueryData(["/api/settings"]), undefined);
  assert.equal(client.getQueryData(organizationSettingsKey("teacher-a")), undefined);
  client.setQueryData(organizationSettingsKey("teacher-b"), { logo: "private-b" });
  clearOtherOrganizationSettings(client, "teacher-b");
  assert.deepEqual(client.getQueryData(organizationSettingsKey("teacher-b")), { logo: "private-b" });
  clearOtherOrganizationSettings(client);
  assert.equal(client.getQueryData(organizationSettingsKey("teacher-b")), undefined);
  client.clear();
});
