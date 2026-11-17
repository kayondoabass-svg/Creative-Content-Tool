export async function deviceResponse(response: Response, operation: "list" | "revoke") {
  const messages: Record<number, string> = {
    401: "Your session expired. Please sign in again.",
    403: "You do not have permission to manage these devices.",
    404: "This device is no longer listed. Refresh your devices.",
    409: "Device management is not supported for this sign-in. Sign in through Afro Auth.",
    429: "Too many requests. Wait a moment and refresh your devices.",
  };
  if (!response.ok) throw new Error(messages[response.status] ||
    (operation === "list" ? "The device service is unavailable. Please retry." : "Device sign-out could not be confirmed. Refresh before retrying."));
  const data = await response.json().catch(() => null);
  const invalid = () => new Error("The device service returned an invalid response. Please refresh or try again later.");
  if (operation === "revoke") {
    if (!data || typeof data.signedOut !== "boolean" || data.success !== true) throw invalid();
  } else {
    if (!data || typeof data.supported !== "boolean" || !Array.isArray(data.sessions) ||
        (data.message !== undefined && typeof data.message !== "string") ||
        data.sessions.some((item: any) => !item || typeof item.id !== "string" || !item.id || item.id.length > 256 ||
          ![true, false, null].includes(item.current) ||
          ["userAgent", "createdAt", "expiresAt"].some(key => item[key] !== null && typeof item[key] !== "string"))) throw invalid();
  }
  return data;
}
