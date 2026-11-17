// Run on the BrightBoard VPS with Node's --env-file=.env. Never prints credentials,
// names, email addresses, document bodies or complete prompts. No writes.
import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
try {
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await client.query("SET LOCAL statement_timeout = '15s'");
  const checks = [
    ["Safety", "SELECT current_setting('transaction_read_only') AS read_only, now() AS checked_at"],
    ["Recent generation ownership", `SELECT type, count(*) AS records, count(*) FILTER (WHERE user_id IS NULL) AS missing_owner,
      min(created_at) AS first_record, max(created_at) AS last_record FROM generated_content
      WHERE created_at >= now() - interval '14 days' GROUP BY type ORDER BY type`],
    ["Identical output across accounts: investigation leads, not proof of exposure", `SELECT md5(content) AS output_fingerprint,
      count(DISTINCT user_id) AS accounts, count(*) AS records, min(created_at) AS first_record, max(created_at) AS last_record
      FROM generated_content WHERE created_at >= now() - interval '14 days' AND length(content) > 200
      GROUP BY md5(content) HAVING count(DISTINCT user_id) > 1 ORDER BY max(created_at) DESC LIMIT 30`],
    ["Reported-topic timeline: pseudonymous owner and prompt/title comparison", `SELECT id, left(md5(user_id),12) AS owner_fingerprint, created_at,
      (prompt ~* 'soldier|uniform') AS requested_soldiers,
      (title ~* 'habitat|animal homes') AS returned_habitats,
      left(md5(content),16) AS output_fingerprint
      FROM generated_content WHERE created_at >= '2026-11-16'::timestamptz AND created_at < '2026-11-19'::timestamptz
      AND (prompt ~* 'soldier|uniform|habitat' OR title ~* 'soldier|uniform|habitat|animal homes')
      ORDER BY created_at LIMIT 50`],
    ["Recent automated expense references", `SELECT category, count(*) AS entries,
      count(*) FILTER (WHERE metadata IS NOT NULL AND metadata LIKE '%"contentId"%') AS has_content_reference,
      max(created_at) AS latest FROM expenses WHERE created_at >= now() - interval '14 days'
      AND is_automatic = true GROUP BY category ORDER BY category`],
  ];
  for (const [check, sql] of checks) console.log(JSON.stringify({ check, rows: (await client.query(sql)).rows }, null, 2));
  await client.query("ROLLBACK");
  console.log("PASS: Read-only audit finished; no data changed. Cached responses not saved in the database may leave no evidence here.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Audit could not finish. Database error code:", error.code || "unknown");
  process.exitCode = 1;
} finally { await client.end(); }
