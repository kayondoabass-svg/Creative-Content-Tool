// Update code only. Existing D1/R2 bindings and VPS signing keys are preserved.
import { readFile, mkdir, writeFile } from "node:fs/promises";
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN?.trim().replace(/^Bearer\s+/i, "");
const stage = process.argv.includes("--production") ? "production" : process.argv.includes("--preview") ? "preview" : "";
if (!stage || !account || !/^[a-f0-9]{32}$/.test(account) || !token) throw new Error("Choose a stage and configure Cloudflare account/token securely.");
const name = stage === "production" ? "brightboard-sharing" : "brightboard-sharing-preview";
async function api(path: string, method = "GET", body?: FormData) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    method, headers: { Authorization: `Bearer ${token}` }, body,
    signal: AbortSignal.timeout(60_000),
  });
  const result: any = await response.json();
  if (!response.ok || !result.success) throw new Error(`Cloudflare Worker update failed: HTTP ${response.status}. No credentials are printed.`);
  return result.result;
}
const settings = await api(`/workers/scripts/${name}/settings`);
const bindings = settings.bindings;
if (!Array.isArray(bindings) || bindings.length !== 3 ||
    !bindings.some((b: any) => b.name === "DB" && b.type === "d1" && b.id) ||
    !bindings.some((b: any) => b.name === "FILES" && b.type === "r2_bucket" && b.bucket_name === name) ||
    !bindings.some((b: any) => b.name === "TRUSTED_KEYS" && b.type === "plain_text" && JSON.parse(b.text).length)) {
  throw new Error("Unexpected existing bindings. Refusing to replace storage or signing configuration.");
}
const code = await readFile("dist/sharing-worker.mjs", "utf8");
if (!code.includes("publicGet") || !code.includes("anonymousLinkViewing")) throw new Error("Build the updated sharing Worker first.");
const metadata: any = { main_module: "worker.mjs", bindings, compatibility_date: settings.compatibility_date || "2026-11-01" };
for (const key of ["compatibility_flags", "observability", "logpush", "tail_consumers", "limits", "placement", "tags"]) {
  if (settings[key] !== undefined) metadata[key] = settings[key];
}
await mkdir("generated-artifacts/sharing-worker-backups", { recursive: true, mode: 0o700 });
const backup = `generated-artifacts/sharing-worker-backups/${name}-${Date.now()}`;
await writeFile(`${backup}-settings.json`, JSON.stringify(settings), { mode: 0o600 });
const old = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${name}`, {
  headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000),
});
if (!old.ok) throw new Error("Could not back up the existing Worker. No update performed.");
await writeFile(`${backup}-source.txt`, await old.text(), { mode: 0o600 });
const form = new FormData();
form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.set("worker.mjs", new Blob([code], { type: "application/javascript+module" }), "worker.mjs");
await api(`/workers/scripts/${name}`, "PUT", form);
const after = await api(`/workers/scripts/${name}/settings`);
for (const binding of bindings) {
  const saved = after.bindings.find((b: any) => b.name === binding.name);
  for (const key of ["type", "id", "bucket_name", "text"]) {
    if (binding[key] !== saved?.[key]) throw new Error("Post-update binding verification failed. Stop and inspect; do not restart the VPS.");
  }
}
console.log(JSON.stringify({ worker: name, updated: true, bindingsPreserved: true, databaseMigration: false, vpsRestartRequired: true, backup }, null, 2));
