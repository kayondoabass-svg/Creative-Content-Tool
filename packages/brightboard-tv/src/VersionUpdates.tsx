import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { checkForUpdates, CURRENT_BUILD, type UpdateReport } from "./update-check";
import "./version-updates.css";

type VersionUpdatesProps = {
  onApplyUpdate: () => Promise<boolean>;
};

function checkedTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function VersionUpdates({ onApplyUpdate }: VersionUpdatesProps) {
  const [report, setReport] = useState<UpdateReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    setChecking(true);
    setError("");
    try {
      setReport(await checkForUpdates());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not check for updates. Try again.");
    } finally {
      setChecking(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    setError("");
    try {
      if (!await onApplyUpdate()) {
        setError("Update was not prepared. Your presentation remains open.");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not prepare the server update. Your presentation remains open.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="version-updates">
      <div className="version-updates-current">
        <span className="version-updates-label">BrightboardTV version</span>
        <strong>{CURRENT_BUILD.version}</strong>
        <span className="version-updates-build">Build {CURRENT_BUILD.buildId.slice(0, 8)}</span>
      </div>
      <button className="button small version-updates-check" type="button" disabled={checking || applying} onClick={() => void check()}>
        <RefreshCw size={14} aria-hidden="true" className={checking ? "version-updates-spin" : undefined} />
        {checking ? "Checking…" : "Check for updates"}
      </button>
      <p className="version-updates-note">A linked lesson file stays separate; this update check never clears browser data.</p>

      {checking && <div className="version-updates-loading" role="status" aria-live="polite"><span />Checking this server and published downloads…</div>}
      {error && <p className="version-updates-error" role="alert">{error}</p>}
      {report && !checking && (
        <div className="version-updates-report" aria-live="polite" aria-atomic="true">
          <p className="version-updates-checked">Last checked <time dateTime={report.checkedAt}>{checkedTime(report.checkedAt)}</time></p>
          <div className="version-updates-result">
            <strong>This server</strong>
            <span>{report.server.message}</span>
            {report.server.available && <span className="version-updates-detail">Available: {report.server.available.version} · build {report.server.available.buildId.slice(0, 8)}</span>}
            {report.server.status === "different" && (
              <button className="button small primary" type="button" disabled={applying} onClick={() => void apply()}>
                {applying ? "Preparing update…" : "Save & reload"}
              </button>
            )}
          </div>
          <div className="version-updates-result">
            <strong>GitHub release</strong>
            <span>{report.release.message}</span>
            {report.release.status === "newer" && report.release.url && (
              <a className="version-updates-link" href={report.release.url} target="_blank" rel="noopener noreferrer">
                View release{report.release.version ? ` ${report.release.version}` : ""}<ArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}
          </div>
          {report.release.status === "newer" && <p className="version-updates-note">A GitHub release is a downloadable release, not a deployment of the hosted site.</p>}
        </div>
      )}
    </div>
  );
}
