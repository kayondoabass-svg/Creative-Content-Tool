import JSZip from "jszip";
import { blankPage, type BoardObject, type Page } from "./types";
import { MAX_FILE } from "./helpers";
import { assertPageLimit } from "./page-limits";

const MAX_EXPANDED = 128 * 1024 * 1024;
const MAX_XML = 2 * 1024 * 1024;
type Options = { maxPages: number; existingPages?: number; signal?: AbortSignal; progress?: (message: string) => void };
export function assertPowerPointPageCount(imported: number, existing: number, limit: number) {
  assertPageLimit(imported + existing, limit);
}
const elements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS("*", name));
const first = (node: Document | Element, name: string) => elements(node, name)[0];
const relationshipId = (node: Element, name: string) =>
  node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", name) || node.getAttribute(`r:${name}`);

// Inspect sizes before JSZip allocates decompressed slide or image buffers.
export function inspectPowerPointArchive(bytes: ArrayBuffer) {
  const v = new DataView(bytes);
  let end = -1;
  for (let i = v.byteLength - 22; i >= Math.max(0, v.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error("This is not a valid .pptx archive.");
  const count = v.getUint16(end + 10, true);
  let offset = v.getUint32(end + 16, true), expanded = 0;
  if (!count || count > 4096 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true)) throw new Error("This PowerPoint archive is too complex or uses an unsupported ZIP format.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || v.getUint32(offset, true) !== 0x02014b50) throw new Error("The PowerPoint archive is damaged.");
    const size = v.getUint32(offset + 24, true);
    expanded += size;
    if (size > MAX_FILE || expanded > MAX_EXPANDED || (v.getUint16(offset + 8, true) & 1)) throw new Error("This PowerPoint expands beyond the safe import size or is encrypted.");
    offset += 46 + v.getUint16(offset + 28, true) + v.getUint16(offset + 30, true) + v.getUint16(offset + 32, true);
  }
}

function xml(text: string): Document {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("PowerPoint XML declarations are not supported.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (elements(doc, "parsererror").length) throw new Error("The PowerPoint contains damaged XML.");
  return doc;
}
function resolvePart(from: string, target: string) {
  if (/^[a-z]+:|[\\?#]/i.test(target)) throw new Error("Unsupported PowerPoint resource path.");
  const result = target.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!result.length) throw new Error("Invalid PowerPoint resource path."); result.pop(); }
    else result.push(part);
  }
  return result.join("/");
}
const relsPath = (part: string) => part.replace(/([^/]+)$/, "_rels/$1.rels");
type Relation = { path: string; type: string };

export async function importPowerPoint(file: File, options: Options): Promise<{ pages: Page[]; warnings: string[] }> {
  if (/\.ppt$/i.test(file.name)) throw new Error("Older .ppt files must first be saved as .pptx or exported as PDF in PowerPoint or LibreOffice.");
  if (!/\.pptx$/i.test(file.name)) throw new Error("Choose a .pptx PowerPoint file.");
  if (file.size > MAX_FILE) throw new Error("PowerPoint files must be 25 MB or smaller.");
  const check = () => { if (options.signal?.aborted) throw new Error("PowerPoint import cancelled. Your presentation was not changed."); };
  check();
  const bytes = await file.arrayBuffer();
  inspectPowerPointArchive(bytes);
  const zip = await JSZip.loadAsync(bytes);
  const warnings = new Set<string>(["PowerPoint import preserves supported text, images and basic shape outlines, not exact slide styling. Master-slide artwork, backgrounds, fills, fonts, rotation and image cropping may differ. Export as PDF for faithful appearance."]);
  const textPart = async (path: string, required = true) => {
    check();
    const entry = zip.file(path);
    if (!entry) { if (required) throw new Error(`Missing PowerPoint component: ${path}`); return null; }
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (size === undefined || size > MAX_XML) throw new Error("A PowerPoint XML component exceeds the safe size.");
    const text = await entry.async("string");
    check();
    if (text.length > MAX_XML) throw new Error("A PowerPoint XML component exceeds the safe size.");
    return xml(text);
  };
  const relations = async (part: string) => {
    const doc = await textPart(relsPath(part), false), map = new Map<string, Relation>();
    if (doc) for (const rel of elements(doc, "Relationship")) {
      if (rel.getAttribute("TargetMode") === "External") { warnings.add("External links and linked media were not loaded."); continue; }
      map.set(rel.getAttribute("Id") || "", { path: resolvePart(part, rel.getAttribute("Target") || ""), type: rel.getAttribute("Type") || "" });
    }
    return map;
  };
  options.progress?.("Reading PowerPoint slide order…");
  const presentation = await textPart("ppt/presentation.xml");
  const links = await relations("ppt/presentation.xml");
  const slideIds = elements(presentation!, "sldId");
  if (!slideIds.length) throw new Error("This PowerPoint contains no slides.");
  assertPowerPointPageCount(slideIds.length, options.existingPages || 0, options.maxPages);
  const size = first(presentation!, "sldSz");
  const slideW = Number(size?.getAttribute("cx") || 12192000), slideH = Number(size?.getAttribute("cy") || 6858000);
  if (!(slideW > 0 && slideH > 0 && Number.isFinite(slideW) && Number.isFinite(slideH))) throw new Error("Invalid PowerPoint slide dimensions.");
  if (Math.abs(slideW / slideH - 16 / 9) > .05) warnings.add("This presentation is not widescreen; positions are fitted to BrightboardTV’s 16:9 canvas.");
  const pages: Page[] = [];
  let imageBytes = 0;
  const imageCache = new Map<string, string>();
  for (const [index, id] of slideIds.entries()) {
    check();
    options.progress?.(`Importing PowerPoint slide ${index + 1} of ${slideIds.length}…`);
    // Yield so cancellation and progress remain interactive.
    await new Promise(resolve => setTimeout(resolve, 0));
    const link = links.get(relationshipId(id, "id") || "");
    if (!link?.type.endsWith("/slide") || !/^ppt\/slides\/[^/]+\.xml$/.test(link.path)) throw new Error("Invalid PowerPoint slide relationship.");
    const doc = await textPart(link.path), media = await relations(link.path);
    const page = blankPage(`${file.name.replace(/\.pptx$/i, "")} · ${index + 1}`.slice(0, 200));
    const tree = first(doc!, "spTree");
    for (const shape of Array.from(tree?.children || [])) {
      check();
      if (!["sp", "pic", "cxnSp", "nvGrpSpPr", "grpSpPr"].includes(shape.localName)) { warnings.add("Groups, charts, tables and embedded media were skipped. Use PDF to preserve their appearance."); continue; }
      if (!["sp", "pic", "cxnSp"].includes(shape.localName)) continue;
      const transform = first(shape, "xfrm"), off = transform && first(transform, "off"), ext = transform && first(transform, "ext");
      if (!off || !ext) { warnings.add("Some master-layout placeholders could not be positioned and were skipped."); continue; }
      const x = Number(off.getAttribute("x")) / slideW, y = Number(off.getAttribute("y")) / slideH;
      const width = Number(ext.getAttribute("cx")) / slideW, height = Number(ext.getAttribute("cy")) / slideH;
      if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height < 0 || x >= 1 || y >= 1) continue;
      const base = { id: crypto.randomUUID(), x: Math.max(0, x), y: Math.max(0, y), width: Math.min(1 - Math.max(0, x), width), height: Math.min(1 - Math.max(0, y), height), color: "#183a40" };
      if (base.width <= 0 || base.height < 0) continue;
      const paragraphs = elements(shape, "p").map(p => elements(p, "t").map(t => t.textContent || "").join("")).filter(Boolean);
      const text = paragraphs.join("\n");
      const color = first(shape, "srgbClr")?.getAttribute("val");
      if (color && /^[0-9a-f]{6}$/i.test(color)) base.color = `#${color}`;
      if (shape.localName === "pic") {
        const blip = first(shape, "blip"), rel = blip && media.get(relationshipId(blip, "embed") || "");
        if (!rel || !rel.type.endsWith("/image")) { warnings.add("Linked or unsupported images were skipped."); continue; }
        const extension = rel.path.split(".").pop()?.toLowerCase();
        const mime = ({ png: "png", jpg: "jpeg", jpeg: "jpeg", gif: "gif", webp: "webp" } as Record<string, string>)[extension || ""];
        if (!mime) { warnings.add("Vector/unsupported images were skipped. Export as PDF to preserve them."); continue; }
        let src = imageCache.get(rel.path);
        if (!src) {
          const entry = zip.file(rel.path);
          if (!entry) throw new Error("A PowerPoint image is missing.");
          const data = await entry.async("uint8array");
          imageBytes += data.length;
          if (data.length > 8 * 1024 * 1024 || imageBytes > 40 * 1024 * 1024) throw new Error("PowerPoint images exceed the import budget. Compress images or export a smaller PDF.");
          src = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read a PowerPoint image."));
            reader.readAsDataURL(new Blob([data as BlobPart], { type: `image/${mime}` }));
          });
          imageCache.set(rel.path, src);
        }
        page.objects.push({ ...base, type: "image", src });
      } else if (text) {
        if (text.length > 20000) throw new Error("A PowerPoint text box exceeds the safe text limit.");
        const points = Number(first(shape, "rPr")?.getAttribute("sz") || 2400) / 100;
        page.objects.push({ ...base, type: "text", text, fontSize: Math.min(400, Math.max(8, points * 12700 / slideH * 900)) });
      } else {
        const preset = first(shape, "prstGeom")?.getAttribute("prst");
        const type: BoardObject["type"] | undefined = shape.localName === "cxnSp" || preset === "line" ? "line" : preset === "ellipse" ? "ellipse" : preset === "rect" || preset === "roundRect" ? "rect" : undefined;
        if (type) page.objects.push({ ...base, type });
        else warnings.add("Unsupported decorative shapes were skipped.");
      }
      if (page.objects.length > 1000) throw new Error("A PowerPoint slide exceeds the 1,000-object limit.");
    }
    if (elements(doc!, "timing").length || elements(doc!, "transition").length) warnings.add("Animations and transitions are not imported.");
    const notes = [...media.values()].find(r => r.type.endsWith("/notesSlide"));
    if (notes) {
      const noteDoc = await textPart(notes.path);
      page.notes = elements(noteDoc!, "sp").filter(sp => {
        const placeholder = first(sp, "ph")?.getAttribute("type");
        return !["sldImg", "sldNum", "hdr", "ftr", "dt"].includes(placeholder || "");
      }).flatMap(sp => elements(sp, "t").map(t => t.textContent || "")).join("\n");
      if (page.notes.length > 20000) throw new Error("A PowerPoint slide exceeds the 20,000-character presenter-notes limit. No pages were imported.");
    }
    pages.push(page);
  }
  check();
  return { pages, warnings: [...warnings] };
}
