import { stdin, stdout } from "node:process";

// Only fixed messages cross the logging boundary. Never print caught exceptions,
// HTTP bodies, addresses, cookies, credentials, codes, or email URLs.
export class CheckFailure extends Error {}
export function requireCheck(value: unknown, message: string): asserts value {
  if (!value) throw new CheckFailure(message);
}

export function config(env: NodeJS.ProcessEnv = process.env) {
  requireCheck(env.AUTH_LIVE_TEST_AUTHORIZED === "dedicated-test-accounts-only",
    "BLOCKED: Explicit authorization for dedicated test accounts is required.");
  requireCheck(env.AFRO_AUTH_SECRET_KEY?.trim(),
    "BLOCKED: Configure the rotated AFRO_AUTH_SECRET_KEY securely; the compatibility key is not accepted for this check.");
  const slug = env.AFRO_AUTH_PROJECT_SLUG?.trim();
  requireCheck(slug && /^[a-z0-9][a-z0-9-]*$/.test(slug),
    "BLOCKED: Explicit Afro Auth project slug is required.");
  let base: URL;
  try { base = new URL(env.AUTH_LIVE_TEST_BASE_URL || ""); }
  catch { throw new CheckFailure("BLOCKED: Configure the target app origin."); }
  requireCheck(!base.username && !base.password && !base.search && !base.hash && base.pathname === "/"
    && (base.protocol === "https:" || (base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))),
  "BLOCKED: Target must be a credential-free HTTPS origin (HTTP is permitted only on loopback).");
  const email = env.AUTH_LIVE_TEST_EMAIL?.trim().toLowerCase();
  const legacyEmail = env.AUTH_LIVE_TEST_LEGACY_EMAIL?.trim().toLowerCase();
  const validEmail = (v?: string) => v && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  requireCheck(validEmail(email) && validEmail(legacyEmail) && email !== legacyEmail,
    "BLOCKED: Two distinct, explicitly authorized test inbox addresses are required.");
  const reviewed = env.AUTH_LIVE_TEST_CONTRACT_REVIEWED_ON || "";
  const age = Date.now() - Date.parse(`${reviewed}T00:00:00Z`);
  requireCheck(/^\d{4}-\d{2}-\d{2}$/.test(reviewed) && age >= 0 && age < 7 * 86400_000,
    "BLOCKED: Review this project's current Afro Auth connection examples and set the review date (within seven days).");
  return { base: base.origin, email: email!, legacyEmail: legacyEmail!, slug };
}

// A private local terminal, not chat, shell arguments, stdin pipes, or a recording.
// Input is never echoed; restores the terminal on completion, cancellation or timeout.
export async function privateInput(prompt: string): Promise<string> {
  requireCheck(stdin.isTTY && stdout.isTTY && typeof stdin.setRawMode === "function",
    "BLOCKED: Run in a private interactive terminal with recording disabled.");
  stdout.write(`${prompt}\nInput hidden: `);
  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = stdin.isRaw;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
      value = "";
    };
    const onData = (buffer: Buffer) => {
      for (const char of buffer.toString("utf8")) {
        if (char === "\x03" || char === "\x04") return finish(new CheckFailure("STOPPED: Operator cancelled."));
        if (char === "\r" || char === "\n") return finish();
        if (char === "\x7f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && value.length < 512) value += char;
      }
    };
    const timer = setTimeout(() => finish(new CheckFailure("STOPPED: Operator input timed out.")), 10 * 60_000);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

export async function acknowledge(prompt: string) {
  requireCheck(await privateInput(`${prompt}\nType DONE only after completing this action, or Ctrl-C to stop.`) === "DONE",
    "STOPPED: Required operator action was not confirmed.");
}

export async function password(prompt: string) {
  const value = await privateInput(prompt);
  requireCheck(value.length >= 12 && value.length <= 128,
    "STOPPED: Use a test password of 12–128 characters.");
  requireCheck(value === await privateInput("Repeat that test password."), "STOPPED: Password entries did not match.");
  return value;
}

export class AppClient {
  cookie = "";
  constructor(readonly base: string) {}
  async request(path: string, body?: object) {
    let response: Response;
    try {
      response = await fetch(`${this.base}${path}`, {
        method: body ? "POST" : "GET",
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: "error", signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new CheckFailure("FAIL: App request timed out, redirected, or could not connect; response details suppressed."); }
    for (const value of response.headers.getSetCookie()) {
      if (value.startsWith("connect.sid=")) {
        const pair = value.split(";")[0];
        this.cookie = pair === "connect.sid=" ? "" : pair;
      }
    }
    let data: any;
    try { data = await response.json(); }
    catch { throw new CheckFailure("FAIL: App returned a non-JSON response; body suppressed."); }
    requireCheck(response.status !== 429, "STOPPED: Rate limited. Wait at least 15 minutes; do not automatically retry.");
    requireCheck(!data?.token && !data?.password && !data?.passwordHash && !data?.afroaiToken,
      "FAIL: App exposed an authentication credential; body suppressed.");
    return { status: response.status, data };
  }
}
