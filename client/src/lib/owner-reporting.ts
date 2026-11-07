// Override the app-wide infinite cache only for these read-only owner reports.
// No polling while the page is hidden: this VPS hosts other sites too.
export const ownerReportRefreshOptions = {
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  refetchOnMount: "always",
  refetchOnWindowFocus: "always",
  refetchOnReconnect: "always",
} as const;

export const expenseProviderLabels = {
  openai: "OpenAI API",
  gemini: "Google Gemini API",
  afroai: "AfroAI Emails",
} as const;
