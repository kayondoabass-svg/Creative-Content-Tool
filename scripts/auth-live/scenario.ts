import {
  afroaiLogin, afroaiLogout, afroaiVerifySession, matchesAfroEmail,
} from "../../server/afroaiAuthService";
import { AppClient, acknowledge, password, privateInput, requireCheck } from "./support";

const pass = (name: string) => console.log(`PASS: ${name}`);

async function denied(client: AppClient) {
  requireCheck((await client.request("/api/content")).status === 401,
    "FAIL: A signed-out or revoked session accessed protected content.");
  const me = await client.request("/api/auth/me");
  requireCheck(me.status === 200 && me.data?.user === null, "FAIL: Expected no signed-in profile.");
}

async function login(client: AppClient, email: string, value: string) {
  const result = await client.request("/api/auth/login", { email, password: value });
  requireCheck(result.status === 200 && result.data?.user?.email?.toLowerCase() === email && client.cookie,
    "FAIL: Provider-backed app login did not establish the expected test identity.");
  const me = await client.request("/api/auth/me");
  requireCheck(me.status === 200 && me.data?.user?.email?.toLowerCase() === email,
    "FAIL: Signed-in profile could not be verified.");
  requireCheck((await client.request("/api/content")).status === 200,
    "FAIL: Confirmed login could not access protected content.");
}

async function rejectedLogin(client: AppClient, email: string, value: string) {
  const result = await client.request("/api/auth/login", { email, password: value });
  requireCheck([400, 401, 403].includes(result.status) && !result.data?.user,
    "FAIL: Invalid or unconfirmed login was not rejected.");
  await denied(client);
}

async function logout(client: AppClient) {
  const replay = new AppClient(client.base);
  replay.cookie = client.cookie;
  requireCheck((await client.request("/api/auth/logout", {})).status === 200, "FAIL: App logout failed.");
  await denied(client);
  await denied(replay);
}

async function confirmation(client: AppClient, email: string, value: string) {
  await denied(client);
  await rejectedLogin(client, email, value);
  pass("no app session or protected access before email confirmation");
  await acknowledge("Open ONLY the new confirmation email in the authorized test inbox. In a private browser with recording disabled, open the real link and submit Afro Auth's hosted confirmation form. Merely previewing the link does not confirm it. Do not paste the link here.");
  await denied(client);
  await login(client, email, value);
  pass("real inbox confirmation followed by provider-backed app login and protected access");
}

export async function runScenario(settings: { base: string; email: string; legacyEmail: string }) {
  const { base, email, legacyEmail } = settings;
  const clients: AppClient[] = [];
  let providerToken: string | undefined;
  const fresh = () => { const c = new AppClient(base); clients.push(c); return c; };
  const started = Date.now();
  try {
    const client = fresh();
    await denied(client);
    const oldPassword = await password("Choose an initial password for the NEW dedicated signup test account. Remember it only for this run.");
    const signup = await client.request("/api/auth/signup", {
      email, password: oldPassword, firstName: "Integration", lastName: "Test",
    });
    requireCheck(signup.status === 200 && signup.data?.verificationRequired === true,
      "FAIL: Signup did not require confirmation. If delivery failed, the provider may have retained the account; inspect only this test account before retrying.");
    await confirmation(client, email, oldPassword);

    const beforeRevocation = fresh();
    beforeRevocation.cookie = client.cookie;
    await acknowledge("In this project's Afro Auth dashboard, revoke all sessions for ONLY the signup test account. Do not rotate the project key or revoke any customer session.");
    await denied(beforeRevocation);
    pass("provider-side revocation denies a previously authenticated app cookie");
    await login(client, email, oldPassword);
    await logout(client);
    pass("app logout clears local access and rejects replay of its former cookie");

    // A second independent app session must also be invalidated by password reset.
    await login(client, email, oldPassword);
    const second = fresh();
    await login(second, email, oldPassword);
    const newPassword = await password("Choose a DIFFERENT new password for the signup test account. Enter this same new password in the real hosted reset form when prompted.");
    requireCheck(newPassword !== oldPassword, "STOPPED: Recovery must change the password.");
    const recovery = await client.request("/api/auth/forgot-password", { email });
    requireCheck(recovery.status === 200 && recovery.data?.verificationMethod === "link",
      "FAIL: App did not acknowledge provider recovery.");
    await acknowledge("Wait for the NEW reset email in the authorized test inbox. Open the real link privately and submit the hosted reset form using the new password you just chose. Do not paste the link here.");
    await denied(client);
    await denied(second);
    await rejectedLogin(fresh(), email, oldPassword);
    await login(client, email, newPassword);
    // Direct provider checks distinguish an actual provider password change from
    // a change made only in BrightBoard's local password hash.
    const oldProvider = await afroaiLogin(email, oldPassword);
    if (oldProvider.token) providerToken = oldProvider.token;
    requireCheck(!oldProvider.ok && [400, 401, 403].includes(oldProvider.status),
      "FAIL: Provider did not reject the old password after recovery.");
    const newProvider = await afroaiLogin(email, newPassword);
    providerToken = newProvider.token;
    requireCheck(newProvider.ok && providerToken
      && matchesAfroEmail(await afroaiVerifySession(providerToken), email),
    "FAIL: Rotated server key could not verify a real login with the new provider password.");
    requireCheck((await afroaiLogout(providerToken)).ok, "FAIL: Provider logout failed.");
    const revoked = await afroaiVerifySession(providerToken);
    requireCheck(revoked.ok && revoked.valid === false, "FAIL: Provider logout did not invalidate its live session.");
    providerToken = undefined;
    await logout(client);
    pass("real reset changes the provider password, rejects old password, revokes two app sessions, and provider logout invalidates its token");

    // Legacy fixture must be local-only and explicitly created for this run.
    // BrightBoard permits 10 auth attempts per 15-minute IP window. Do not
    // disable this protection or turn a 429 into an automatic retry loop.
    const remaining = Math.max(0, 15 * 60_000 + 1000 - (Date.now() - started));
    if (remaining) {
      await acknowledge("The next phase needs a new 15-minute authentication rate-limit window. Type DONE to wait out the remaining window once (up to 15 minutes), or cancel. No requests will be made during this pause.");
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
    // A local recovery code must not overwrite an already-provider-backed
    // account, even when the caller controls that account's inbox.
    const conflictClient = fresh();
    const existingRecovery = await conflictClient.request("/api/auth/forgot-password", { email, legacy: true });
    requireCheck(existingRecovery.status === 200 && existingRecovery.data?.verificationMethod === "code",
      "FAIL: Existing-account legacy recovery could not be requested.");
    const conflictCode = await privateInput("Read the NEW BrightBoard legacy recovery code sent to the SIGNUP test inbox. This checks that legacy recovery cannot overwrite its existing Afro Auth account.");
    requireCheck(/^\d{6}$/.test(conflictCode), "STOPPED: Expected the six-digit inbox recovery code.");
    const conflict = await conflictClient.request("/api/auth/reset-password", {
      email, code: conflictCode, newPassword: oldPassword,
    });
    requireCheck(conflict.status === 400, "FAIL: Legacy recovery overwrote an existing provider account.");
    await denied(conflictClient);
    await rejectedLogin(fresh(), email, oldPassword);
    await login(conflictClient, email, newPassword);
    await logout(conflictClient);
    pass("legacy recovery cannot overwrite an existing provider account or restore its old password");

    await acknowledge("Confirm the legacy address is a dedicated local-only BrightBoard test fixture, created with --seed-legacy against this app's database, with NO existing Afro Auth account. Never use an existing customer's profile.");
    const legacy = fresh();
    const legacyPassword = await password("Choose a password for the recovered legacy test account (not a customer password).");
    const requested = await legacy.request("/api/auth/forgot-password", { email: legacyEmail, legacy: true });
    requireCheck(requested.status === 200 && requested.data?.verificationMethod === "code",
      "FAIL: Legacy recovery did not acknowledge the email-code path.");
    const invalid = await legacy.request("/api/auth/reset-password", {
      email: legacyEmail, code: "invalid-test-code", newPassword: legacyPassword,
    });
    requireCheck(invalid.status === 400, "FAIL: Invalid legacy recovery code was accepted.");
    await denied(legacy);
    const code = await privateInput("Read the NEW recovery code from the authorized legacy test inbox and enter it privately here (not in chat).");
    requireCheck(/^\d{6}$/.test(code), "STOPPED: Expected the six-digit inbox recovery code.");
    const body = { email: legacyEmail, code, newPassword: legacyPassword };
    const migrated = await legacy.request("/api/auth/reset-password", body);
    requireCheck(migrated.status === 200 && migrated.data?.verificationMethod === "link",
      "FAIL: Legacy recovery did not provision Afro Auth and require its confirmation.");
    const replay = await legacy.request("/api/auth/reset-password", body);
    requireCheck(replay.status === 400, "FAIL: A used legacy recovery code was accepted again.");
    await confirmation(legacy, legacyEmail, legacyPassword);
    await logout(legacy);
    pass("real legacy recovery email, single-use code, provider confirmation, login and protected access");
    console.log("LIVE CHECK COMPLETE: All required operator-assisted checks passed. No credentials or inbox links were recorded. Remove only the dedicated test accounts using the runbook.");
  } finally {
    if (providerToken) await afroaiLogout(providerToken);
    // Best-effort cleanup does not turn a failed run into a pass.
    for (const client of clients) {
      if (client.cookie) {
        try { await client.request("/api/auth/logout", {}); } catch {}
      }
    }
  }
}
