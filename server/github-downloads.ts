export interface GitHubDownloads {
  available: boolean;
  total: number | null;
  checkedAt: string;
  assets: { name: string; release: string; downloads: number }[];
  error?: string;
}

// GitHub exposes release asset downloads, not source archives, clones or installs.
// Cache both successes and failures so dashboard polling cannot exhaust its API.
export function createGitHubDownloadReader(fetcher: typeof fetch = fetch) {
  let cached: GitHubDownloads | undefined;
  let expires = 0;
  let pending: Promise<GitHubDownloads> | undefined;
  return async function read(): Promise<GitHubDownloads> {
    if (cached && Date.now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const assets: GitHubDownloads["assets"] = [];
        for (let page = 1; page <= 5; page++) {
          const response = await fetcher(`https://api.github.com/repos/kayondoabass-svg/Brightboard-TV/releases?per_page=100&page=${page}`, {
            headers: { Accept: "application/vnd.github+json", "User-Agent": "BrightboardTV-download-report", "X-GitHub-Api-Version": "2022-11-28" },
            signal: AbortSignal.timeout(6000), redirect: "error",
          });
          if (!response.ok) throw new Error("GitHub download totals are temporarily unavailable.");
          const releases = await response.json();
          if (!Array.isArray(releases)) throw new Error("GitHub returned an unexpected response.");
          for (const release of releases) {
            if (release.draft || release.prerelease) continue;
            for (const asset of release.assets || []) {
              // Notes/checksums and GitHub's automatic source archives are not
              // software downloads. Support existing unversioned ZIPs as well.
              if (!/^BrightboardTV-(?:source|prebuilt)(?:-v\d+\.\d+\.\d+)?\.zip$/.test(asset.name)) continue;
              if (!Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
                throw new Error("GitHub returned an invalid download count.");
              }
              assets.push({ name: String(asset.name), release: String(release.tag_name), downloads: asset.download_count });
            }
          }
          if (releases.length < 100) break;
          if (page === 5) throw new Error("GitHub release history is too large to report completely.");
        }
        cached = { available: true, total: assets.reduce((sum, asset) => sum + asset.downloads, 0), assets, checkedAt: new Date().toISOString() };
        expires = Date.now() + 15 * 60_000;
      } catch (error) {
        cached = { available: false, total: null, assets: [], checkedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Could not fetch GitHub totals." };
        expires = Date.now() + 60_000;
      }
      return cached;
    })().finally(() => { pending = undefined; });
    return pending;
  };
}

export const readGitHubDownloads = createGitHubDownloadReader();
