/** Development-only browser fixtures. Never creates provider accounts or emails. */
import { pool } from "../server/db";
import { randomUUID, createHmac } from "node:crypto";
import { writeFile, readFile, unlink } from "node:fs/promises";
const file = "/tmp/brightboard-sharing-ui-fixtures.json";
if (process.env.NODE_ENV === "production") throw new Error("Development fixtures must never run in production.");
if (process.argv.includes("--cleanup")) {
  const fixture = JSON.parse(await readFile(file, "utf8"));
  for (const user of fixture.users) {
    await pool.query("DELETE FROM sessions WHERE sid=$1", [user.sid]);
    await pool.query("DELETE FROM users WHERE id=$1 AND email LIKE '%@example.invalid'", [user.id]);
  }
  await unlink(file);
  console.log("Sharing browser fixtures removed.");
} else {
  if (!process.env.SESSION_SECRET) throw new Error("Existing session configuration is required.");
  const users = [];
  for (const name of ["Owner", "Recipient"]) {
    const id = randomUUID(), sid = randomUUID(), email = `sharing-${id}@example.invalid`;
    await pool.query("INSERT INTO users(id,email,first_name,last_name,email_verified,subscription_tier) VALUES($1,$2,$3,'Test',true,'free')", [id, email, name]);
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await pool.query("INSERT INTO sessions(sid,sess,expire) VALUES($1,$2,$3)", [sid, JSON.stringify({
      cookie: { originalMaxAge: 7200000, expires: expires.toISOString(), httpOnly: true, secure: false, sameSite: "lax", path: "/" },
      userId: id,
    }), expires]);
    const signed = `${sid}.${createHmac("sha256", process.env.SESSION_SECRET).update(sid).digest("base64").replace(/=+$/, "")}`;
    users.push({ id, name, email, sid, cookie: encodeURIComponent(`s:${signed}`) });
  }
  await writeFile(file, JSON.stringify({ users }), { mode: 0o600 });
  console.log(`Development fixture credentials saved privately to ${file}. Values are not logged.`);
}
await pool.end();
