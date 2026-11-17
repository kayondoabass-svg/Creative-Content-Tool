// Fast-forward an explicitly scoped, already-verified release onto GitHub main.
// Never push workspace checkpoint history or modify VPS configuration.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, readFile, readdir, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const worksheetOnly = process.argv.includes("--worksheet-only");
const referenceRelease = process.argv.includes("--reference-sharing");
const fileToolsRelease = process.argv.includes("--file-tools");
const pdfPowerPointRelease = process.argv.includes("--pdf-powerpoint");
const privacyRelease = process.argv.includes("--font-privacy");
const isolationRelease = process.argv.includes("--generation-isolation");
const prepareOnly = process.argv.includes("--prepare-only");
const output = path.join(root, isolationRelease ? "generated-artifacts/generation-isolation-release" : privacyRelease ? "generated-artifacts/font-privacy-release" : pdfPowerPointRelease ? "generated-artifacts/pdf-powerpoint-release" : fileToolsRelease ? "generated-artifacts/file-tools-release" : referenceRelease ? "generated-artifacts/reference-sharing-release" : worksheetOnly
  ? "generated-artifacts/worksheet-correction-release"
  : "generated-artifacts/complete-fix-release");
const repo = path.join(output, "repository");
const remote = "https://github.com/kayondoabass-svg/Creative-Content-Tool.git";
const baseline = isolationRelease ? "ac61cbe6460424a1c41b2408627184fe011ef86a" : privacyRelease ? "01ad1a0be25af6bbc837c4d8c19765e8eae9de9f" : pdfPowerPointRelease ? "7c722002db6ba1d699ce3362ca5c17ab5dbed35c" : fileToolsRelease ? "92df80664eb3cfb7fbd61e5e31d769f272ef1b5f" : referenceRelease ? "cdd8aef01d3bffaa388d2a113b70bb21cb596376" : worksheetOnly
  ? "66010cdcb611786cac07a83b6c0e7001049a8cdf"
  : "7054aeb581a2d92e67abccf9d89081b9f1aea48b";
const sources = isolationRelease ? [
  "client/src/components/prompt-input.tsx",
  "client/src/hooks/use-pdf-reference.ts",
  "client/src/lib/device-response.ts",
  "client/src/lib/generation-result.ts",
  "client/src/pages/home.tsx",
  "client/src/pages/account-settings.tsx",
  "client/src/pages/studio.tsx",
  "server/index.ts", "server/routes.ts", "server/jobQueue.ts",
  "server/reference-input.ts", "server/release.ts",
  "server/pdf-reference-text.ts", "server/workers/pdfExtractWorker.ts",
  "server/pdf-extraction.ts", "server/presentation-reference.ts",
  "server/template-analysis.ts", "server/generation-validation.ts",
  "server/pdf-reference.test.ts", "server/generation-isolation.test.ts", "server/reference-sharing.test.ts",
  "shared/schema.ts", "script/build.ts", "script/push-complete-fix-release.mjs",
  "scripts/audit-generation-isolation.mjs", "scripts/check-pdf-worker.cjs",
  "scripts/deploy-reference-release.sh", "scripts/release-manifest.cjs",
  "scripts/verify-release.cjs",
] : privacyRelease ? [
  "client/index.html",
  "client/src/index.css",
  "client/src/pages/legal/privacy-policy.tsx",
  "client/src/pages/legal/regional-notices.tsx",
  "server/routes.ts",
  "server/static.ts",
  "server/advertising-removal.test.ts",
  "server/self-hosted-fonts.test.ts",
  "scripts/self-host-fonts.mjs",
  "scripts/check-font-privacy.mjs",
  "docs/legal-policy-review.md",
  "docs/legal-regional-review.md",
] : pdfPowerPointRelease ? [
  "client/src/lib/file-tool-operations.ts",
  "client/src/lib/pdf-powerpoint.ts",
  "client/src/lib/pdf-powerpoint.test.ts",
  "client/src/lib/local-file-tools.ts",
  "client/src/lib/local-file-tools.test.ts",
  "client/src/pages/file-tools.tsx",
  "scripts/file-tools-browser-check.mjs",
] : fileToolsRelease ? [
  "client/src/App.tsx",
  "client/src/components/file-converter.tsx",
  "client/src/components/document-sharing.tsx",
  "client/src/components/shared-word-preview.tsx",
  "client/src/lib/file-tool-operations.ts",
  "client/src/lib/file-tool-operations.test.ts",
  "client/src/lib/sharing.ts",
  "client/src/lib/sharing-regressions.test.ts",
  "client/src/pages/file-tools.tsx",
  "client/src/pages/shared-document.tsx",
  "client/src/types/mammoth-browser.d.ts",
  "server/routes.ts",
] : referenceRelease ? [
  "client/src/App.tsx",
  "client/src/components/file-converter.tsx",
  "client/src/components/games-launcher.tsx",
  "client/src/components/prompt-input.tsx",
  "client/src/components/puzzle-workshop.tsx",
  "client/src/components/word-search-preview.tsx",
  "client/src/lib/sharing.ts",
  "client/src/lib/reference-upload.ts",
  "client/src/pages/games.tsx",
  "client/src/pages/home.tsx",
  "client/src/pages/shared-document.tsx",
  "client/src/pages/legal/privacy-policy.tsx",
  "client/src/pages/legal/terms-and-conditions.tsx",
  "docs/document-sharing.md",
  "cloudflare/sharing/worker.ts",
  "script/build-sharing.mjs",
  "scripts/update-sharing-worker.ts",
  "scripts/deploy-reference-release.sh",
  "server/cloudflare-sharing-store.ts",
  "server/document-sharing-routes.ts",
  "server/document-sharing-store.ts",
  "server/educationalImageService.ts",
  "server/geminiImageService.ts",
  "server/generation-budget.ts",
  "server/reference-input.ts",
  "server/reference-sharing.test.ts",
  "server/routes.ts",
  "shared/puzzle-validation.ts",
  "shared/reference-policy.ts",
  "shared/reference-file.ts",
  "shared/share-privacy.ts",
  "shared/schema.ts",
  "shared/worksheet-quality.ts",
] : worksheetOnly ? [
  "client/src/components/generated-content-display.tsx",
  "server/educationalImageService.ts",
  "server/routes.ts",
  "server/worksheet-review.ts",
  "server/worksheet-review.test.ts",
  "shared/worksheet-quality.ts",
] : [
  "client/src/components/document-sharing.tsx",
  "client/src/components/generated-content-display.tsx",
  "client/src/components/legal-document.tsx",
  "client/src/components/prompt-input.tsx",
  "client/src/lib/sharing-regressions.test.ts",
  "client/src/lib/sharing.ts",
  "client/src/pages/home.tsx",
  "client/src/pages/legal/privacy-policy.tsx",
  "client/src/pages/legal/refund-information.tsx",
  "client/src/pages/legal/regional-notices.tsx",
  "client/src/pages/legal/terms-and-conditions.tsx",
  "client/src/pages/privacy.tsx",
  "client/src/pages/refund.tsx",
  "client/src/pages/terms.tsx",
  "docs/legal-policy-review.md",
  "docs/legal-regional-review.md",
  "script/legal-policies.test.mjs",
  "server/document-sharing-routes.ts",
  "server/educationalImageService.ts",
  "server/index.ts",
  "server/routes.ts",
  "server/worksheet-export.ts",
  "server/worksheet-quality.test.ts",
  "shared/schema.ts",
  "shared/worksheet-quality.ts",
];
const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
for (const key of Object.keys(env)) {
  if (key.startsWith("GIT_TRACE") || [
    "GIT_CURL_VERBOSE", "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE",
    "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY",
  ].includes(key)) delete env[key];
}
const cleanEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
const binaries = ["dist/index.cjs", "dist/public/index.html",
  ...(isolationRelease ? ["dist/pdfExtractWorker.cjs"] : []),
  ...(referenceRelease ? ["dist/sharing-worker.mjs", "dist/sharing-update.mjs"] : [])];
const removedFiles = privacyRelease ? ["client/public/ads.txt", "dist/public/ads.txt"] : [];
if (privacyRelease) {
  const collect = async directory => {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const filename = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await collect(filename);
      else if (entry.isFile()) sources.push(filename);
      else throw new Error("Font snapshot must contain regular files only");
    }
  };
  for (const directory of ["client/public/fonts", "dist/public/fonts"]) await collect(directory);
}
let step = "prepare isolated repository";
try {
  if (!process.env.GITHUB_PAT) throw new Error("Missing configured GitHub credential");
  await mkdir(output, { recursive: true });
  await chmod(output, 0o700);
  const helper = path.join(output, "credential-helper");
  await writeFile(helper, `#!/bin/sh
set +x
set +v
[ "\${1:-}" = get ] || exit 0
protocol=
host=
while IFS= read -r field && [ -n "$field" ]; do
  case "$field" in protocol=*) protocol=\${field#protocol=} ;; host=*) host=\${field#host=} ;; esac
done
[ "$protocol" = https ] && [ "$host" = github.com ] || exit 0
printf 'username=x-access-token\\npassword=%s\\n\\n' "$GITHUB_PAT"
`, { mode: 0o700 });
  const git = args => run("git", [
    "-c", `url.${remote}.insteadOf=${remote}`,
    "-c", `url.${remote}.pushInsteadOf=${remote}`,
    "-c", "credential.helper=", "-c", `credential.helper=${helper}`, ...args,
  ], { cwd: repo, env, maxBuffer: 8 * 1024 * 1024 });
  const hasTemporaryRepo = await readFile(path.join(repo, ".git/HEAD")).then(() => true, error => {
    if (error.code === "ENOENT") return false;
    throw error;
  });
  if (!hasTemporaryRepo) await run("git", ["clone", "--shared", "--no-checkout", "--quiet", root, repo], { env });
  await git(["remote", "set-url", "origin", remote]);
  await git(["fetch", "--quiet", "origin", "main"]);
  const head = (await git(["rev-parse", "FETCH_HEAD"])).stdout.trim();
  if (head !== baseline) throw new Error("Remote advanced; re-evaluate scope before pushing");
  // Reset only this disposable release clone when resuming a failed validation.
  await git(["checkout", "--quiet", "--force", "--detach", head]);
  // Compare file bytes across both trees: a selectively pushed baseline may
  // exist in the isolated clone but not in workspace checkpoint history.
  const roots = ["client", "server", "shared", "package.json", "package-lock.json"];
  const workspacePaths = (await run("git", ["ls-files", "--", ...roots], { cwd: root, env })).stdout.trim().split("\n").filter(Boolean);
  const remotePaths = (await git(["ls-files", "--", ...roots])).stdout.trim().split("\n").filter(Boolean);
  const readOptional = async file => {
    try { return await readFile(file); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  };
  for (const file of new Set([...workspacePaths, ...remotePaths])) {
    if (sources.includes(file) || removedFiles.includes(file)) continue;
    const local = await readOptional(path.join(root, file));
    const previous = await readOptional(path.join(repo, file));
    if (!local || !previous || !local.equals(previous)) throw new Error(`Unapproved source drift: ${file}`);
  }
  step = "apply approved source and prebuilt website";
  for (const file of [...sources, ...binaries]) {
    await mkdir(path.dirname(path.join(repo, file)), { recursive: true });
    await cp(path.join(root, file), path.join(repo, file));
  }
  // Add new assets; retain every baseline asset for tabs opened before release.
  await cp(path.join(root, "dist/public/assets"), path.join(repo, "dist/public/assets"), { recursive: true });
  if (removedFiles.length) await git(["rm", "--quiet", "--ignore-unmatch", "--", ...removedFiles]);
  await git(["add", "--", ...sources, ...binaries, "dist/public/assets"]);
  const changed = (await git(["diff", "--cached", "--name-only"])).stdout.trim().split("\n").filter(Boolean);
  if (!changed.length || changed.some(file => !(sources.includes(file) ||
      binaries.includes(file) || removedFiles.includes(file) ||
      file.startsWith("dist/public/assets/")))) throw new Error("Unexpected staged paths");
  const deleted = (await git(["diff", "--cached", "--diff-filter=D", "--name-only"])).stdout.trim();
  if (deleted && deleted.split("\n").some(file => !removedFiles.includes(file))) throw new Error("Release must not delete unapproved baseline files");
  for (const file of changed) {
    if (removedFiles.includes(file)) continue;
    if (/(^|\/)(\.env[^/]*|node_modules|\.npmrc)(\/|$)|\.(pem|key|sql)$/.test(file)) throw new Error("Forbidden file");
    const data = await readFile(path.join(repo, file), "utf8");
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-proj-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}/.test(data)) {
      throw new Error("Credential-pattern audit failed");
    }
  }
  step = "check staged source and release integrity";
  // Preserve upstream licence text verbatim, including its original line endings.
  await git(["diff", "--cached", "--check", "--", ...sources.filter(file => !file.includes("/fonts/licenses/"))]);
  await run(process.execPath, ["--check", "dist/index.cjs"], { cwd: repo, env: cleanEnv });
  for (const test of ["scripts/release.test.cjs", "script/legal-policies.test.mjs"]) {
    const result = await run(process.execPath, ["--test", test], { cwd: repo, env: cleanEnv });
    console.log(result.stdout.trim());
  }
  if (privacyRelease) {
    const result = await run(path.join(root, "node_modules/.bin/tsx"), ["--test",
      "server/advertising-removal.test.ts", "server/self-hosted-fonts.test.ts"], { cwd: repo, env: cleanEnv });
    console.log(result.stdout.trim());
    const authDiff = (await git(["diff", "--cached", "--", "server/routes.ts"])).stdout;
    const edits = authDiff.split("\n").filter(line => /^[+-]/.test(line) && !/^(---|\+\+\+)/.test(line));
    if (edits.some(line => !/ads\.txt|Content-Type|text\/plain|pub-8935590092792147|Advertising is not enabled/.test(line))) throw new Error("Unexpected route change outside advertising removal");
  }
  if (fileToolsRelease || pdfPowerPointRelease || privacyRelease || isolationRelease) {
    const result = await run(path.join(root, "node_modules/.bin/tsx"), ["--test",
      "client/src/lib/file-tool-operations.test.ts", "client/src/lib/sharing-regressions.test.ts",
      ...(pdfPowerPointRelease || privacyRelease ? ["client/src/lib/pdf-powerpoint.test.ts", "client/src/lib/local-file-tools.test.ts"] : [])],
      { cwd: repo, env: cleanEnv });
    console.log(result.stdout.trim());
    // An unrelated main-site release must not alter TV/Editor source or artifacts.
    const standaloneChanges = (await git(["diff", "--cached", "--name-only", "--",
      "packages/brightboard-tv", "packages/brightboard-media", "dist/releases",
      "dist/public/tv", "dist/public/media-offline", "dist/public/media-sdk.js",
      "cloudflare", "server/tvRelay.ts"])).stdout.trim();
    if (standaloneChanges) throw new Error("Standalone or Cloudflare changes are outside file-tools scope");
  }
  await run(process.execPath, ["scripts/release-manifest.cjs", head], { cwd: repo, env: cleanEnv });
  const assetNames = await readdir(path.join(repo, "dist/public/assets"));
  const index = await readFile(path.join(repo, "dist/public/index.html"), "utf8");
  const expectedEntry = isolationRelease || privacyRelease || referenceRelease || fileToolsRelease || pdfPowerPointRelease ? (await readFile(path.join(root, "dist/public/index.html"), "utf8")).match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1] : worksheetOnly ? "index-C-vLIhjK.js" : "index-ENfU_HP0.js";
  if (!index.includes(expectedEntry) || !assetNames.includes(expectedEntry)) throw new Error("Unexpected verified browser build");
  step = "commit complete fix release";
  await git(["-c", "user.name=BrightBoard", "-c", "user.email=agent@brightboardapp.com",
    "commit", "--quiet", "-m", isolationRelease ? "Repair generation isolation, PDF references and game-template sources without replacing infrastructure" : privacyRelease ? "Self-host all font families and remove Google AdSense without changing authentication" : pdfPowerPointRelease ? "Process file tools locally with preserved PDF slides, progress and cancellation" : fileToolsRelease ? "Extend file tools with Word conversion, PDF splitting and shareable downloads" : referenceRelease ? "Handle reference intent across tools; add public share viewing and checked playable puzzles" : worksheetOnly
      ? "Preserve worksheet layouts during review and restore original export choices"
      : "Fix document sharing, worksheet exports and accuracy; update legal notices"]);
  const revision = (await git(["rev-parse", "HEAD"])).stdout.trim();
  await run(process.execPath, ["scripts/release-manifest.cjs", revision], { cwd: repo, env: cleanEnv });
  await cp(path.join(repo, ".release.json"), path.join(output, "release-check.json"));
  if (prepareOnly) {
    console.log(JSON.stringify({ revision, baseline, changedPaths: changed, preparedOnly: true, githubPushVerified: false, vpsDeploymentVerified: false }, null, 2));
    process.exit(0);
  }
  step = "fast-forward push and confirm GitHub head";
  await git(["push", "--quiet", "origin", `${revision}:refs/heads/main`]);
  const confirmed = (await git(["ls-remote", "origin", "refs/heads/main"])).stdout.trim().split(/\s+/)[0];
  if (confirmed !== revision) throw new Error("Remote confirmation failed");
  const result = { revision, baseline, changedPaths: changed, githubPushVerified: true,
    vpsDeploymentVerified: false, dependencyChanges: false, databaseMigration: false,
    tvInfrastructureChanged: false, existingAssetsPreserved: true };
  await writeFile(path.join(output, "PUSH-RESULT.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // Never echo credential-bearing Git configuration or raw authentication stderr.
  console.error(`Complete release stopped at: ${step}. No force push used.`);
  console.error(error.code ? `Operation code: ${error.code}` : error.message);
  process.exitCode = 1;
}
