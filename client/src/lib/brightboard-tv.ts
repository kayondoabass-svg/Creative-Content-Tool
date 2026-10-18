import type { Lesson, Page, BoardObject } from "../../../packages/brightboard-tv/src/types";
const object = (text: string, y: number, fontSize = 32): BoardObject =>
  ({ id: crypto.randomUUID(), type: "text", x: .07, y, width: .86, height: .12, text, color: "#183a40", fontSize });
function page(title: string, body = "", notes = ""): Page {
  return { id: crypto.randomUUID(), title, notes, background: "light", ink: [],
    objects: [object(title, .07, 50), ...(body ? [{ ...object(body, .24, 30), height: .68 }] : [])] };
}
async function raster(src: string): Promise<string> {
  if (!src.startsWith("data:") && !src.startsWith("/") && !src.startsWith("https://")) throw new Error("Unsupported image source.");
  const response = await fetch(src, { credentials: new URL(src, location.href).origin === location.origin ? "same-origin" : "omit" });
  if (!response.ok) throw new Error("Could not read an image for this presentation.");
  const blob = await response.blob();
  if (blob.size > 4 * 1024 * 1024 || !/^image\/(png|jpeg|webp)/.test(blob.type)) throw new Error("Use PNG, JPEG or WebP images up to 4 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read presentation image.")); reader.readAsDataURL(blob);
  });
}
function lines(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(lines).filter(Boolean).join("\n");
  if (value && typeof value === "object") return Object.entries(value).filter(([k]) =>
    !/image|logo|prompt|style|quality|color|layout|id|grade|language/i.test(k))
    .map(([k, v]) => `${k}: ${lines(v)}`).join("\n");
  return value === undefined || value === null ? "" : String(value);
}
export async function openInBrightboardTV(type: string, content: string) {
  let data: any;
  try { data = JSON.parse(content); } catch { data = content; }
  const pages: Page[] = [];
  if (type === "image") {
    const images = Array.isArray(data?.images) ? data.images : [data?.imageUrl || (data?.b64_json ? `data:image/png;base64,${data.b64_json}` : typeof data === "string" ? data : "")];
    for (const [i, source] of images.slice(0, 12).entries()) {
      if (typeof source !== "string" || !source) continue;
      const p = page(`Image ${i + 1}`); p.objects = [{ id: crypto.randomUUID(), type: "image", x: .04, y: .04, width: .92, height: .92, color: "#183a40", src: await raster(source) }]; pages.push(p);
    }
    if (!pages.length) throw new Error("No supported image was found in this creation.");
  } else if (type === "presentation") {
    const slides = Array.isArray(data) ? data : data?.slides;
    if (!Array.isArray(slides) || !slides.length) throw new Error("This presentation has no supported slides.");
    for (const slide of slides.slice(0, 60)) {
      const text = lines(slide.content || slide.facts || slide.tableRows || slide.stats || "");
      const p = page(slide.title || "Slide", text, slide.notes || "");
      const src = slide.image || slide.images?.[0];
      if (src) {
        const image = await raster(src); p.objects[1] && (p.objects[1].width = .48);
        p.objects.push({ id: crypto.randomUUID(), type: "image", x: .58, y: .24, width: .36, height: .65, color: "#183a40", src: image });
      }
      pages.push(p);
    }
  } else {
    // Preserve all text by paginating it instead of clipping an entire worksheet
    // or mind map into a single slide.
    const full = lines(data);
    if (!full.trim()) throw new Error("This creation has no supported content.");
    const title = data?.title || (type === "mindmap" ? data?.centralTopic : "") || "BrightBoard creation";
    const chunks = full.match(/[\s\S]{1,900}(?:\n|$)|[\s\S]{1,900}/g) || [full];
    if (chunks.length > 60) throw new Error("This creation exceeds the 60-page presentation limit.");
    chunks.forEach((chunk, i) => pages.push(page(i ? `${title} · ${i + 1}` : title, chunk)));
  }
  const lesson: Lesson = { format: "brightboard-tv", version: 1, id: crypto.randomUUID(), title: pages[0].title, pages, updatedAt: new Date().toISOString() };
  try { localStorage.setItem("brightboard-tv-import", JSON.stringify({ lesson })); }
  catch { throw new Error("This presentation is too large for the transfer buffer. Download its images or PDF and import them in BrightboardTV."); }
  location.assign("/tv/?import=brightboard");
}
