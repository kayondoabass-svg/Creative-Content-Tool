import { AppClient, CheckFailure, acknowledge, config, password, requireCheck } from "./auth-live/support";
import { runScenario } from "./auth-live/scenario";

async function seedLegacy(email: string) {
  await acknowledge("This creates ONE new local-only free test profile in the runtime DATABASE_URL database. Confirm this is the target app's database and that the legacy inbox is dedicated to testing and absent from Afro Auth. Existing profiles will never be overwritten.");
  const value = await password("Choose a temporary password for the new local-only test fixture. Recovery will not need this password.");
  // Load the database only after all authorization/configuration gates.
  const { pool, db } = await import("../server/db");
  try {
    const { users } = await import("../shared/schema");
    const { default: bcrypt } = await import("bcryptjs");
    const rows = await db.insert(users).values({
      email, passwordHash: await bcrypt.hash(value, 10),
      firstName: "Integration", lastName: "Legacy Test",
      emailVerified: true, isOwner: false,
      subscriptionTier: "free", subscriptionStatus: "inactive",
    }).onConflictDoNothing().returning({ id: users.id });
    requireCheck(rows.length === 1, "STOPPED: Fixture already exists. Nothing was overwritten. Use a fresh dedicated legacy inbox.");
    console.log("PASS: Created one local-only test fixture. No provider signup or email was sent.");
  } finally { await pool.end(); }
}

try {
  const settings = config();
  requireCheck(process.argv.slice(2).every(arg => arg === "--seed-legacy" || arg === "--preflight"),
    "BLOCKED: Unknown command option. Credentials must never be supplied as arguments.");
  if (process.argv.includes("--preflight")) {
    // No network, database, terminal prompts, or account mutations.
    console.log("PREFLIGHT ONLY: Runtime settings are present. No emails, credentials, sessions, or provider connectivity have been verified.");
  } else if (process.argv.includes("--seed-legacy")) {
    await seedLegacy(settings.legacyEmail);
  } else {
    await acknowledge("This live check sends real emails and changes passwords/revokes sessions for TWO dedicated test accounts. Confirm both inboxes are authorized, signup is a fresh address, and current project connection examples match this adapter's versioned tenant endpoints. Disable terminal/browser recording; never paste links or credentials in chat.");
    // A non-mutating protected endpoint detects an incorrect target before signup.
    requireCheck((await new AppClient(settings.base).request("/api/content")).status === 401,
      "BLOCKED: Target app did not deny anonymous protected access.");
    await runScenario(settings);
  }
} catch (error) {
  console.error(error instanceof CheckFailure ? error.message : "FAIL: Unexpected failure; diagnostic details suppressed to protect test credentials. Inspect configuration privately.");
  console.error("NOT VERIFIED: This run is not proof of real email delivery or a completed authentication flow.");
  process.exitCode = 1;
}
