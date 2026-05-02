// AfroAI Auth Service for BrightBoard
// Handles session tokens via AfroAI's hosted auth API

const AFROAI_TENANT_URL = "https://afroaigroup.com/cf-auth/t/brighboardapp-gj40q9";
const AFROAI_VERIFY_URL = "https://afroaigroup.com/cf-auth/v1/sessions/verify";

export async function afroaiSignup(email: string, password: string): Promise<{ token?: string; user?: any; error?: string }> {
  try {
    const response = await fetch(`${AFROAI_TENANT_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json() as any;
    if (!response.ok) return { error: data.message || "AfroAI signup failed" };
    return { token: data.token, user: data.user };
  } catch (error) {
    console.error("AfroAI signup error:", error);
    return { error: "AfroAI signup unavailable" };
  }
}

export async function afroaiLogin(email: string, password: string): Promise<{ token?: string; user?: any; error?: string }> {
  try {
    const response = await fetch(`${AFROAI_TENANT_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json() as any;
    if (!response.ok) return { error: data.message || "AfroAI login failed" };
    return { token: data.token, user: data.user };
  } catch (error) {
    console.error("AfroAI login error:", error);
    return { error: "AfroAI login unavailable" };
  }
}

export async function afroaiVerifySession(token: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const apiSecret = process.env.AFROAI_AUTH_API_SECRET;
    if (!apiSecret) {
      console.warn("AFROAI_AUTH_API_SECRET not set — skipping verification");
      return { valid: false };
    }
    const response = await fetch(AFROAI_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json() as any;
    return { valid: data.valid === true, user: data.user };
  } catch (error) {
    console.error("AfroAI session verify error:", error);
    return { valid: false };
  }
}
