import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Download, ImageDown, LoaderCircle, WandSparkles } from "lucide-react";
import type { Lesson, StageState } from "./types";
import { hasOversizedRelayAsset, lessonBlob, presentationSizes, formatBytes, MAX_RELAY_BYTES } from "./presentation-size";
import { MAX_LESSON_FILE, downloadBlob, safeName } from "./helpers";
import { optimizeLessonImages } from "./image-optimization";

type Props = {
  lesson: Lesson;
  relayState: StageState;
  onOpenCopy: (copy: Lesson) => Promise<void>;
};

type ImageObject = Lesson["pages"][number]["objects"][number];

function imagesOnPage(lesson: Lesson, pageIndex: number): ImageObject[] {
  return (lesson.pages[pageIndex]?.objects || []).filter((object) => object.type === "image" && typeof object.src === "string");
}

function sizeTone(bytes: number, limit: number) {
  return bytes > limit ? "over" : bytes >= limit * .85 ? "near" : "ok";
}

export function PresentationSize({ lesson, relayState, onOpenCopy }: Props) {
  const [maxDimension, setMaxDimension] = useState(1920);
  const [quality, setQuality] = useState(.85);
  const [copy, setCopy] = useState<Lesson | null>(null);
  const [changed, setChanged] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const runId = useRef(0);

  useEffect(() => {
    runId.current += 1;
    setCopy(null);
    setChanged(0);
    setSkipped(0);
    setSelectedPage(0);
    setBusy(false);
    setOpening(false);
    setError("");
    setMessage("");
  }, [lesson]);
  useEffect(() => () => { runId.current += 1; }, []);

  const originalBytes = useMemo(() => lessonBlob(lesson).size, [lesson]);
  const copyBlob = useMemo(() => copy ? lessonBlob(copy) : null, [copy]);
  const copyBytes = copyBlob?.size ?? null;
  const relayBytes = useMemo(() => presentationSizes(lesson, relayState).relay, [lesson, relayState]);
  const copyRelayBytes = useMemo(() => copy ? presentationSizes(copy, relayState).relay : 0, [copy, relayState]);
  const originalImages = imagesOnPage(lesson, selectedPage);
  const copyImages = copy ? imagesOnPage(copy, selectedPage) : [];
  const imageCount = Math.max(originalImages.length, copyImages.length);
  const reduction = copyBytes === null ? null : originalBytes - copyBytes;
  const downloadAllowed = !!copyBlob && copyBlob.size <= MAX_LESSON_FILE;

  const generatePreview = async () => {
    const thisRun = ++runId.current;
    setBusy(true);
    setError("");
    setMessage("");
    setCopy(null);
    try {
      const result = await optimizeLessonImages(lesson, { maxDimension, quality });
      if (thisRun !== runId.current) return;
      setCopy({ ...result.lesson, id: crypto.randomUUID(), title: `${lesson.title.slice(0, 180)} (optimized)`, updatedAt: new Date().toISOString() });
      setChanged(result.changed);
      setSkipped(result.skipped);
      if (result.changed === 0 || lessonBlob(result.lesson).size >= originalBytes) {
        setMessage("No size reduction was achieved. The original remains unchanged; try a smaller image setting.");
      } else {
        setMessage(`${result.changed} image${result.changed === 1 ? "" : "s"} optimized${result.skipped ? `; ${result.skipped} skipped` : ""}. This is a separate copy.`);
      }
    } catch (cause) {
      if (thisRun === runId.current) {
        setError(cause instanceof Error ? cause.message : "Image optimization failed. The original lesson is unchanged.");
      }
    } finally {
      if (thisRun === runId.current) setBusy(false);
    }
  };

  const openOptimizedCopy = async () => {
    if (!copy) return;
    setOpening(true);
    setError("");
    try {
      await onOpenCopy(copy);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open the optimized copy. Your original lesson is unchanged.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <section className="phone-card stack" aria-labelledby="presentation-size-title">
      <div className="row spread">
        <div>
          <h2 id="presentation-size-title" style={{ margin: 0, fontSize: 15 }}>Presentation size</h2>
          <p className="notice" style={{ margin: "4px 0 0" }}>A .bbtv copy is measured before it is shared or saved.</p>
        </div>
        <ImageDown size={19} aria-hidden="true" />
      </div>

      <div className="stack" aria-label="Presentation file size">
        <div className="row spread">
          <span className="notice">Original .bbtv</span>
          <strong>{formatBytes(originalBytes)}</strong>
        </div>
        <div className="row spread">
          <span className="notice">12 MB sharing limit</span>
          <strong>{formatBytes(MAX_RELAY_BYTES)}</strong>
        </div>
        <div className="row spread">
          <span className="notice">64 MB lesson file limit</span>
          <strong>{formatBytes(MAX_LESSON_FILE)}</strong>
        </div>
        <div className="row spread">
          <span className="notice">Current relay state</span>
          <strong>{formatBytes(relayBytes)} <span className="notice">/ {formatBytes(MAX_RELAY_BYTES)}</span></strong>
        </div>
      </div>

      <div className="notice" role="status">
        {sizeTone(relayBytes, MAX_RELAY_BYTES) === "over"
          ? "This lesson exceeds the 12 MB sharing limit. Image compression can create a smaller, separate copy."
          : sizeTone(relayBytes, MAX_RELAY_BYTES) === "near"
            ? "This lesson is close to the 12 MB sharing limit."
            : "This lesson is within the 12 MB sharing limit."}
        {originalBytes > MAX_LESSON_FILE && " It also exceeds the 64 MB .bbtv file limit."}
        {relayBytes > MAX_RELAY_BYTES && " The current relay state is over its size limit."}
        {" Each encoded image or model must also fit the relay’s 8 MB per-asset limit."}
        {hasOversizedRelayAsset(lesson) && " An image or model exceeds that limit; sharing is disabled until it is reduced."}
      </div>

      <div className="stack">
        <strong style={{ fontSize: 13 }}>Optimize a copy</strong>
        <p className="notice" style={{ margin: 0 }}>Generating a preview never changes your original or linked file. Still images may lose fine detail; review them before using the copy. GIFs, unsupported images, unreadable images, and images that would grow are kept unchanged.</p>
        <label className="field-label" htmlFor="presentation-max-dimension">Maximum image dimension</label>
        <select
          id="presentation-max-dimension"
          className="select"
          value={maxDimension}
          onChange={(event) => { setMaxDimension(Number(event.target.value)); setCopy(null); setMessage(""); }}
          disabled={busy}
        >
          {[1920, 1280].map((dimension) => (
            <option key={dimension} value={dimension}>{dimension}px</option>
          ))}
        </select>
        <label className="field-label" htmlFor="presentation-image-quality">Image quality</label>
        <select
          id="presentation-image-quality"
          className="select"
          value={quality}
          onChange={(event) => { setQuality(Number(event.target.value)); setCopy(null); setMessage(""); }}
          disabled={busy}
        >
          {[.85, .7].map((value) => (
            <option key={value} value={value}>{Math.round(value * 100)}%</option>
          ))}
        </select>
        <button className="button primary" type="button" onClick={() => void generatePreview()} disabled={busy}>
          {busy ? <LoaderCircle size={16} aria-hidden="true" /> : <WandSparkles size={16} aria-hidden="true" />}
          {busy ? "Preparing preview…" : "Generate optimized preview"}
        </button>
      </div>

      {error && <div className="notice" role="alert"><AlertTriangle size={15} aria-hidden="true" /> {error}</div>}
      {message && <div className="notice" role="status">{message}</div>}

      {copy && (
        <div className="stack" aria-label="Optimized presentation copy">
          <div className="row spread">
            <strong style={{ fontSize: 13 }}>Preview copy</strong>
            <span className="notice">{changed} changed · {skipped} skipped</span>
          </div>
          <div className="row spread">
            <span className="notice">Optimized .bbtv</span>
            <strong>{formatBytes(copyBytes || 0)}</strong>
          </div>
          <div className="row spread">
            <span className="notice">Difference</span>
            <strong>{reduction !== null && reduction > 0 ? `−${formatBytes(reduction)}` : "No reduction"}</strong>
          </div>
          <div className="row spread"><span className="notice">Optimized relay state</span><strong>{formatBytes(copyRelayBytes)}</strong></div>
          {copyRelayBytes > MAX_RELAY_BYTES && <p className="notice" style={{ margin: 0 }}>This copy still exceeds the 12 MB sharing limit. Try a smaller image setting or split the presentation; models are not compressed.</p>}
          {hasOversizedRelayAsset(copy) && <p className="notice" style={{ margin: 0 }}>This copy still has an image or model above the 8 MB encoded-asset sharing limit. Models must be reduced separately.</p>}
          {copyBytes !== null && copyBytes > MAX_LESSON_FILE && <p className="notice" style={{ margin: 0 }}>This copy exceeds the 64 MB .bbtv file limit and cannot be downloaded as a lesson file.</p>}

          <label className="field-label" htmlFor="preview-page">Preview page</label>
          <select
            id="preview-page"
            className="select"
            value={selectedPage}
            onChange={(event) => setSelectedPage(Number(event.target.value))}
          >
            {lesson.pages.map((page, index) => (
              <option key={page.id} value={index}>{index + 1}. {page.title || `Page ${index + 1}`}</option>
            ))}
          </select>

          <div className="stack" aria-label="Original and optimized page images">
            {imageCount ? Array.from({ length: imageCount }, (_, index) => (
              <div key={index} className="phone-card" style={{ margin: 0, padding: 10 }}>
                <div className="row spread"><strong style={{ fontSize: 12 }}>Image {index + 1}</strong></div>
                <div className="split" style={{ marginTop: 8 }}>
                  {[{ label: "Original", image: originalImages[index] }, { label: "Optimized copy", image: copyImages[index] }].map(({ label, image }) => (
                    <div key={label} className="stack">
                      <span className="notice">{label}</span>
                      {image?.src
                        ? <img src={image.src} alt={`${label} image ${index + 1}`} loading="lazy" style={{ width: "100%", height: 132, objectFit: "contain", background: "#edf3ef", border: "1px solid var(--line)", borderRadius: 8 }} />
                        : <div className="empty" style={{ minHeight: 132, display: "grid", placeItems: "center" }}>No image</div>}
                    </div>
                  ))}
                </div>
              </div>
            )) : <div className="empty">This page has no embedded images to compare.</div>}
          </div>

          <div className="notice">
            Page order and content, ink, private notes, object positions, backgrounds, and 3D models are unchanged. Only eligible embedded images may differ.
          </div>
          <div className="row wrap">
            <button
              className="button"
              type="button"
              disabled={!downloadAllowed}
              aria-label="Download optimized copy as a .bbtv file"
              onClick={() => copyBlob && downloadBlob(copyBlob, `${safeName(lesson.title)}-optimized.bbtv`)}
            >
              <Download size={16} aria-hidden="true" /> Download optimized copy
            </button>
            <button className="button primary" type="button" onClick={() => void openOptimizedCopy()} disabled={opening}>
              {opening ? <LoaderCircle size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
              {opening ? "Opening…" : "Open optimized copy"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
