import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { expenseProviderLabels, ownerReportRefreshOptions } from "./owner-reporting";

test("owner options override infinite freshness without changing global defaults", () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false } } });
  const options = client.defaultQueryOptions({ ...ownerReportRefreshOptions, queryKey: ["/api/owner/stats"] });
  assert.equal(options.staleTime, 30_000);
  assert.equal(options.refetchInterval, 60_000);
  assert.equal(options.refetchIntervalInBackground, false);
  assert.equal(options.refetchOnMount, "always");
  assert.equal(options.refetchOnWindowFocus, "always");
  assert.equal(options.refetchOnReconnect, "always");
  assert.equal(client.defaultQueryOptions({ queryKey: ["/api/settings"] }).staleTime, Infinity);
  client.clear();
});

test("stale owner totals reload instead of remaining cached indefinitely", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  const key = ["/api/owner/stats"];
  client.setQueryData(key, { users: { total: 90 } }, { updatedAt: Date.now() - 31_000 });
  let reads = 0;
  const updated = await client.fetchQuery({
    ...ownerReportRefreshOptions,
    queryKey: key,
    queryFn: async () => { reads++; return { users: { total: 91 } }; },
  });
  assert.equal(reads, 1);
  assert.equal(updated.users.total, 91);
  client.clear();
});

test("recent report data is cached until invalidation rather than fetched on every render", async () => {
  const client = new QueryClient();
  const key = ["/api/owner/expenses/summary"];
  client.setQueryData(key, { total: 160 });
  let reads = 0;
  const options = {
    ...ownerReportRefreshOptions,
    queryKey: key,
    queryFn: async () => { reads++; return { total: 170 }; },
  };
  assert.equal((await client.fetchQuery(options)).total, 160);
  assert.equal(reads, 0);
  await client.invalidateQueries({ queryKey: key });
  assert.equal((await client.fetchQuery(options)).total, 170);
  assert.equal(reads, 1);
  client.clear();
});

test("provider labels distinguish Gemini, AfroAI and legacy OpenAI", () => {
  assert.equal(expenseProviderLabels.gemini, "Google Gemini API");
  assert.equal(expenseProviderLabels.afroai, "AfroAI Emails");
  assert.equal(expenseProviderLabels.openai, "OpenAI API");
});

test("refresh is wired only to the requested reports and expense queries remain owner-gated", () => {
  const dashboard = readFileSync(new URL("../pages/owner-dashboard.tsx", import.meta.url), "utf8");
  const expenses = readFileSync(new URL("../pages/owner-expenses.tsx", import.meta.url), "utf8");
  for (const [source, endpoint] of [
    [dashboard, "/api/owner/stats"], [dashboard, "/api/owner/trends"],
    [expenses, "/api/owner/expenses"], [expenses, "/api/owner/expenses/summary"],
  ]) {
    const body = source.slice(source.indexOf(`queryKey: ["${endpoint}"]`) - 50).split("});")[0];
    assert.match(body, /ownerReportRefreshOptions/);
    assert.match(body, /enabled: !!user\?\.isOwner/);
  }
  assert.match(expenses, /gemini: \{ label: expenseProviderLabels\.gemini/);
  assert.match(expenses, /afroai: \{ label: expenseProviderLabels\.afroai, icon: Mail/);
  assert.match(expenses, /Object.entries\(categoryInfo\)/);
  assert.match(expenses, /Emails sent directly by AfroAI Auth do not automatically create/);
  assert.match(expenses, /Zero-value email entries record activity/);
});
