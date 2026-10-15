// Server-only Afro Auth REST adapter. Never return provider tokens to the browser.
const ORIGIN = "https://afroaigroup.com";
const DEFAULT_SLUG = "brighboardapp-gj40q9";
const TIMEOUT_MS = 10_000;

export interface AfroUser {
  email?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  email_verified?: boolean;
}

export interface AfroResult {
  ok: boolean;
  status: number;
  token?: string;
  user?: AfroUser;
  verificationRequired?: boolean;
  valid?: boolean;
  error?: string;
}

function tenantBase() {
  const slug = process.env.AFRO_AUTH_PROJECT_SLUG?.trim() || DEFAULT_SLUG;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error("Invalid Afro Auth project configuration");
  }
  return `${ORIGIN}/cf-auth/v1/t/${encodeURIComponent(slug)}`;
}

export function isAfroAuthConfigured(): boolean {
  return Boolean(getSecret());
}

function getSecret(): string | undefined {
  return process.env.AFRO_AUTH_SECRET_KEY?.trim()
    || process.env.AFROAI_AUTH_API_SECRET?.trim();
}

async function request(url: string, body: object, bearer?: string): Promise<AfroResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    if (response.status === 204) return { ok: true, status: 204 };
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, status: 502, error: "Authentication provider returned an invalid response" };
    }
    if (!response.ok) {
      // Do not expose arbitrary provider payloads (which may contain diagnostic secrets).
      const verificationRequired = data.verificationRequired === true
        || /(?:verify|confirm).*(?:email)|email.*(?:not verified|unverified|confirmation)/i.test(
          typeof data.message === "string" ? data.message : "",
        );
      return {
        ok: false,
        status: response.status,
        verificationRequired,
        error: verificationRequired
          ? "Please verify your email using the confirmation link before signing in."
          : response.status === 429
            ? "Too many authentication attempts. Please try again later."
            : response.status >= 500
              ? "Authentication provider is temporarily unavailable. Please try again."
              : "Authentication request was rejected. Check your details or use Forgot Password.",
      };
    }
    return {
      ok: true,
      status: response.status,
      token: typeof data.token === "string" && data.token ? data.token : undefined,
      user: data.user && typeof data.user === "object" ? data.user : undefined,
      verificationRequired: data.verificationRequired === true,
      valid: data.valid === true,
    };
  } catch {
    return { ok: false, status: 503, error: "Authentication provider is temporarily unavailable. Please try again." };
  }
}

function tenantRequest(path: string, body: object, bearer?: string): Promise<AfroResult> {
  try {
    return request(`${tenantBase()}${path}`, body, bearer);
  } catch {
    return Promise.resolve({ ok: false, status: 503, error: "Authentication is not configured correctly." });
  }
}

export async function afroaiSignup(email: string, password: string, firstName?: string, lastName?: string): Promise<AfroResult> {
  const result = await tenantRequest("/signup", { email, password, firstName, lastName });
  // Signup NEVER authenticates a session, even if a legacy response contains a token.
  if (result.ok) return { ...result, token: undefined, verificationRequired: true };
  return result;
}

export async function afroaiLogin(email: string, password: string): Promise<AfroResult> {
  const result = await tenantRequest("/login", { email, password });
  const unconfirmed = result.verificationRequired
    || result.user?.emailVerified === false || result.user?.email_verified === false;
  if (result.ok && (!result.token || unconfirmed)) {
    return {
      ok: false,
      status: unconfirmed ? 403 : 502,
      verificationRequired: unconfirmed,
      error: unconfirmed
        ? "Please verify your email using the confirmation link before signing in."
        : "Authentication provider did not return a confirmed login session.",
    };
  }
  return result;
}

export function afroaiSendVerification(email: string): Promise<AfroResult> {
  return tenantRequest("/send-verification", { email });
}

export function afroaiForgotPassword(email: string): Promise<AfroResult> {
  return tenantRequest("/forgot-password", { email });
}

export function afroaiLogout(token: string): Promise<AfroResult> {
  return tenantRequest("/logout", {}, token);
}

export function afroaiVerifySession(token: string): Promise<AfroResult> {
  const secret = getSecret();
  if (!secret) return Promise.resolve({ ok: false, status: 503, error: "Authentication server key is not configured." });
  return request(`${ORIGIN}/cf-auth/v1/sessions/verify`, { token }, secret);
}

export function matchesAfroEmail(result: AfroResult, email: string): boolean {
  return result.ok && result.valid === true
    && Boolean(email.trim())
    && typeof result.user?.email === "string"
    && result.user.email.trim().toLowerCase() === email.trim().toLowerCase()
    && result.user.emailVerified !== false && result.user.email_verified !== false;
}
