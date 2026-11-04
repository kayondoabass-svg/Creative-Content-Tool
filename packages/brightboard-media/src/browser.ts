import { renderSVG, encodeWAV, audioSamples, SAMPLE_RATE, validateProject, type Project } from "./engine";
export function download(data: Blob, filename: string) {
  const url = URL.createObjectURL(data), a = document.createElement("a");
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export function supportedVideo() {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) return null;
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(m => MediaRecorder.isTypeSupported(m)) || null;
}
export async function drawScene(canvas: HTMLCanvasElement, project: Project, time: number) {
  const image = new Image(), url = URL.createObjectURL(new Blob([renderSVG(project, time, canvas.width, canvas.height)], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("This browser could not render the composition.")); image.src = url; });
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas rendering is unavailable.");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally { URL.revokeObjectURL(url); }
}
function exportCanvas(p: Project, width: number, height: number) {
  validateProject({ ...p, width, height });
  if (width > 4096 && typeof navigator !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent)) throw new Error("8K allocation is not offered on this device. Choose 4K or Full HD explicitly.");
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  if (!canvas.getContext("2d") || canvas.width !== width || canvas.height !== height) throw new Error("This device cannot allocate that canvas. Choose a smaller size.");
  return canvas;
}
export async function exportImage(p: Project, format: "png" | "jpeg", width: number, height: number, time: number, quality: number) {
  const canvas = exportCanvas(p, width, height);
  try {
    await drawScene(canvas, p, time);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image encoding failed. Choose a smaller size.")), `image/${format}`, quality));
    if (blob.type !== `image/${format}`) throw new Error(`This browser did not encode ${format}.`);
    return blob;
  } finally { canvas.width = canvas.height = 1; }
}
export async function playAudio(p: Project) {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    await context.resume();
    const samples = audioSamples(p.audio, p.duration), buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
    const close = () => { if (context.state !== "closed") void context.close().catch(() => {}); };
    source.onended = close; source.start();
    return () => { try { source.stop(); } catch {} close(); };
  } catch (e) { await context.close(); throw e; }
}
export function audioFile(p: Project) { return new Blob([encodeWAV(p.audio, p.duration)], { type: "audio/wav" }); }
export async function recordVideo(p: Project, options: { width: number; height: number; fps: number; bitrate: number; signal: AbortSignal; progress: (n: number) => void }) {
  const mime = supportedVideo(); if (!mime) throw new Error("Video recording is unsupported here. Try a recent desktop Chrome, Edge or Firefox.");
  const canvas = exportCanvas(p, options.width, options.height);
  let context: AudioContext | undefined, source: AudioBufferSourceNode | undefined, recorder: MediaRecorder | undefined;
  const tracks: MediaStreamTrack[] = [];
  try {
    if (p.audio.enabled) { context = new AudioContext({ sampleRate: SAMPLE_RATE }); await context.resume(); }
    await drawScene(canvas, p, 0);
    const stream = canvas.captureStream(options.fps); tracks.push(...stream.getTracks());
    if (context) {
      const samples = audioSamples(p.audio, p.duration), buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.copyToChannel(samples, 0); source = context.createBufferSource(); source.buffer = buffer;
      const destination = context.createMediaStreamDestination(); source.connect(destination); source.connect(context.destination);
      destination.stream.getAudioTracks().forEach(t => { stream.addTrack(t); tracks.push(t); });
    }
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: options.bitrate });
    const chunks: Blob[] = [], active = recorder;
    const completed = new Promise<Blob>((resolve, reject) => {
      active.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      active.onerror = () => reject(new Error("Recording failed. Try a smaller canvas or another browser."));
      active.onstop = () => options.signal.aborted ? reject(new DOMException("Recording cancelled; no file was saved.", "AbortError"))
        : resolve(new Blob(chunks, { type: active.mimeType }));
    });
    void completed.catch(() => {});
    if (options.signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const cancel = () => { if (active.state !== "inactive") active.stop(); };
    options.signal.addEventListener("abort", cancel, { once: true });
    try {
      active.start(500); source?.start();
      const start = performance.now();
      while (!options.signal.aborted && active.state === "recording") {
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed >= p.duration) break;
        if (document.hidden) throw new Error("Recording interrupted because the app was hidden. Keep the editor visible while recording.");
        await drawScene(canvas, p, elapsed); options.progress(Math.min(1, elapsed / p.duration));
        await new Promise(resolve => setTimeout(resolve, 1000 / options.fps));
      }
      if (active.state !== "inactive") active.stop();
      const blob = await completed;
      if (!blob.size) throw new Error("No video frames were recorded.");
      options.progress(1);
      return { blob, extension: blob.type.includes("mp4") ? "mp4" : "webm" };
    } finally { options.signal.removeEventListener("abort", cancel); }
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    try { source?.stop(); } catch {}
    tracks.forEach(t => t.stop()); if (context && context.state !== "closed") await context.close();
    canvas.width = canvas.height = 1;
  }
}
