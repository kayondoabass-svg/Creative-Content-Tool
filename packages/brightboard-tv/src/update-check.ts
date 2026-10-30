declare const __TV_VERSION__: string;
declare const __TV_BUILD_ID__: string;

export type BuildInfo = { schema: 1; product: "BrightboardTV"; version: string; buildId: string };
export type UpdateReport = {
  checkedAt: string;
  server: { status: "current" | "different" | "older" | "unavailable"; available?: BuildInfo; message: string };
  release: { status: "current" | "newer" | "unavailable"; version?: string; url?: string; message: string };
};
export const CURRENT_BUILD: BuildInfo = {
  schema: 1, product: "BrightboardTV",
  version: typeof __TV_VERSION__ === "string" ? __TV_VERSION__ : "0.0.0",
  buildId: typeof __TV_BUILD_ID__ === "string" ? __TV_BUILD_ID__ : "development",
};
const stable = /^\d+\.\d+\.\d+$/;
const releaseBase = "https://github.com/kayondoabass-svg/Brightboard-TV/releases/tag/";

export function compareVersions(a: string, b: string) {
  if (!stable.test(a) || !stable.test(b)) throw new Error("Invalid version");
  const left = a.split(".").map(BigInt), right = b.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
export function parseBuild(value: unknown): BuildInfo {
  const v = value as Partial<BuildInfo> | null;
  if (!v || v.schema !== 1 || v.product !== "BrightboardTV" ||
      typeof v.version !== "string" || !stable.test(v.version) ||
      typeof v.buildId !== "string" || !/^[a-f0-9]{20}$/.test(v.buildId)) {
    throw new Error("This server does not provide valid BrightboardTV version information.");
  }
  return { schema: 1, product: "BrightboardTV", version: v.version, buildId: v.buildId };
}
async function jsonRequest(url: string, credentials: RequestCredentials, request: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await request(url, { cache: "no-store", credentials, signal: controller.signal,
      headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Version check failed (HTTP ${response.status}).`);
    if (!(response.headers.get("content-type") || "").includes("json")) throw new Error("Version information is unavailable.");
    const text = await response.text();
    if (text.length > 256_000) throw new Error("Unexpected version response.");
    return JSON.parse(text) as unknown;
  } finally { clearTimeout(timeout); }
}
export function serverResult(available: BuildInfo, current: BuildInfo): UpdateReport["server"] {
  if (compareVersions(available.version, current.version) < 0) return {
    status: "older", available, message: "This server offers an older version than the running app. No downgrade will be applied.",
  };
  if (available.version === current.version && available.buildId === current.buildId) return {
    status: "current", available, message: "You are running the build currently deployed on this server.",
  };
  return { status: "different", available,
    message: "A different build is deployed on this server. Save your work before reloading to use it." };
}
export function releaseResult(value: unknown, currentVersion: string): UpdateReport["release"] {
  const release = value as { draft?: unknown; prerelease?: unknown; tag_name?: unknown } | null;
  if (!release || release.draft !== false || release.prerelease !== false ||
      typeof release.tag_name !== "string" || !/^v\d+\.\d+\.\d+$/.test(release.tag_name)) {
    throw new Error("No valid stable release information.");
  }
  const version = release.tag_name.slice(1);
  return {
    status: compareVersions(version, currentVersion) > 0 ? "newer" : "current", version,
    url: releaseBase + release.tag_name,
    message: `Latest published download: ${version}. GitHub downloads do not automatically update this server or an extracted installation.`,
  };
}
export async function checkForUpdates(
  request: typeof fetch = fetch,
  current: BuildInfo = CURRENT_BUILD,
  base: string = document.baseURI,
): Promise<UpdateReport> {
  const [server, release] = await Promise.all([
    jsonRequest(new URL("version.json", base).href, "same-origin", request)
      .then(value => serverResult(parseBuild(value), current))
      .catch((): UpdateReport["server"] => ({ status: "unavailable",
        message: "Could not verify this server. You may be offline, or the server may still run an older build without version information." })),
    jsonRequest("https://api.github.com/repos/kayondoabass-svg/Brightboard-TV/releases/latest", "omit", request)
      .then(value => releaseResult(value, current.version))
      .catch((): UpdateReport["release"] => ({ status: "unavailable",
        message: "Could not check GitHub. Network access or GitHub's public request limit may prevent this check. No update status is assumed." })),
  ]);
  return { checkedAt: new Date().toISOString(), server, release };
}

function waitForActivation(worker: ServiceWorker) {
  return new Promise<void>((resolve, reject) => {
    const done = (error?: Error) => {
      clearTimeout(timeout); worker.removeEventListener("statechange", changed);
      error ? reject(error) : resolve();
    };
    const changed = () => {
      if (worker.state === "activated") done();
      else if (worker.state === "redundant") done(new Error("The update could not be activated. Your presentation remains open."));
      else if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
    };
    const timeout = setTimeout(() => done(new Error("The update is not ready. Keep this presentation open and try again.")), 15_000);
    worker.addEventListener("statechange", changed);
    changed();
  });
}
/** Called only after explicit user consent. Never deletes saved data or reloads. */
export async function prepareServerReload() {
  const available = parseBuild(await jsonRequest(new URL("version.json", document.baseURI).href, "same-origin", fetch));
  if (compareVersions(available.version, CURRENT_BUILD.version) < 0) throw new Error("The server offers an older version. Your app will not be downgraded.");
  if (!("serviceWorker" in navigator)) return;
  const scope = new URL("./", document.baseURI).href;
  const registration = await navigator.serviceWorker.getRegistration(scope);
  // Never change the separate BrightBoard application's service worker.
  if (!registration || registration.scope !== scope) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([registration.update(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Could not prepare the app update. Your presentation remains open.")), 15_000);
    })]);
  } finally { clearTimeout(timer); }
  const worker = registration.installing || registration.waiting;
  if (worker) await waitForActivation(worker);
}
