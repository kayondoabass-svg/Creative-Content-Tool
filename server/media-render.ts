import sharp from "sharp";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { encodeWAV, renderSVG, type Project } from "../packages/brightboard-media/src/engine";

export const videoAvailable = () => spawnSync("ffmpeg", ["-version"], { timeout: 3000, stdio: "ignore" }).status === 0;
export async function renderMediaImage(p: Project, format: "png" | "jpeg" | "svg", time: number) {
  const svg = Buffer.from(renderSVG(p, time));
  if (format === "svg") return svg;
  const image = sharp(svg, { limitInputPixels: 2_100_000 });
  return format === "png" ? image.png().toBuffer() : image.flatten({ background: p.background }).jpeg({ quality: 92 }).toBuffer();
}
export async function renderMediaVideo(p: Project, signal?: AbortSignal) {
  if (!videoAvailable()) throw new Error("VIDEO_UNAVAILABLE");
  const directory = await mkdtemp(path.join(tmpdir(), "brightboard-media-"));
  const file = path.join(directory, "clip.mp4");
  let process: ReturnType<typeof spawn> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const kill = () => { process?.kill("SIGKILL"); };
  try {
    if (signal?.aborted) throw new Error("Recording cancelled.");
    if (p.audio.enabled) await writeFile(path.join(directory, "audio.wav"), encodeWAV(p.audio, p.duration));
    const args = ["-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", "12", "-i", "pipe:0"];
    if (p.audio.enabled) args.push("-i", path.join(directory, "audio.wav"), "-c:a", "aac", "-b:a", "96k");
    args.push("-c:v", "libx264", "-preset", "ultrafast", "-threads", "1", "-pix_fmt", "yuv420p", "-t", String(p.duration), "-movflags", "+faststart", "-y", file);
    process = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
    let detail = "";
    process.stderr?.on("data", d => { if (detail.length < 2000) detail += String(d); });
    const completed = new Promise<void>((resolve, reject) => {
      process!.on("error", reject);
      process!.on("close", code => code === 0 ? resolve() : reject(new Error("Video encoding failed. Check the host FFmpeg H.264/AAC installation.")));
    });
    // A process can fail before frame rendering has finished; handle immediately.
    void completed.catch(() => {});
    timeout = setTimeout(kill, 30_000);
    signal?.addEventListener("abort", kill, { once: true });
    process.stdin?.on("error", () => {});
    for (let i = 0; i < Math.ceil(p.duration * 12); i++) {
      if (signal?.aborted) throw new Error("Recording cancelled.");
      if (process.exitCode !== null || process.killed) throw new Error("Video encoding stopped.");
      const frame = await sharp(Buffer.from(renderSVG(p, i / 12))).jpeg({ quality: 80 }).toBuffer();
      if (!process.stdin!.write(frame)) await Promise.race([once(process.stdin!, "drain"), completed.then(() => { throw new Error("Encoder stopped before receiving all frames."); })]);
    }
    process.stdin!.end();
    await completed;
    const data = await readFile(file);
    if (data.length > 12_000_000) throw new Error("Encoded video exceeds the 12 MB API output limit.");
    return data;
  } finally {
    if (timeout) clearTimeout(timeout);
    signal?.removeEventListener("abort", kill);
    kill();
    await rm(directory, { recursive: true, force: true });
  }
}
