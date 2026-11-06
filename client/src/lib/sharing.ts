export type ShareKind = "editor" | "tv" | "image" | "text" | "presentation" | "worksheet" | "activity" | "storyboard" | "mindmap" | "studio" | "file";
export type ShareOptions = { audience: "invited" | "link"; allowRequests: boolean; allowDownload: boolean; includePrivate: boolean; expiresAt: string | null };
export type SharedDocument = { id: string; title: string; kind: ShareKind; revision: string; updatedAt: string; role: "owner" | "editor" | "viewer"; pendingRequests: number };
export type SharedDetail = SharedDocument & ShareOptions & {
  content: any; latestRevision: string; enabled: boolean;
  versions: { revision: string; createdAt: string; authorName?: string }[];
  members?: { id: string; email: string; role: "viewer" | "editor" }[];
  requests?: { userId: string; name: string; message: string; status: string }[];
  activity: { action: string; createdAt: string; actorName: string }[];
};

export class SharingError extends Error {
  constructor(message: string, public status: number, public canRequest = false) { super(message); }
}

export async function sharingRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    credentials: "include", cache: "no-store", ...init,
    headers,
  });
  if (response.status === 401) {
    const returnTo = window.location.pathname + window.location.search;
    window.location.assign(`/login?redirect=${encodeURIComponent(returnTo)}`);
    throw new SharingError("Sign in to continue.", 401);
  }
  let body: any = null;
  try { body = response.status === 204 ? null : await response.json(); } catch { /* non-JSON response */ }
  if (!response.ok) {
    const message = response.status === 413
      ? "This snapshot exceeds the 16 MB document limit or remaining account storage (128 MB total). Remove large media and try again."
      : body?.error || `Sharing request failed (${response.status}).`;
    throw new SharingError(message, response.status, body?.canRequest === true);
  }
  return body as T;
}

/**
 * Embed every generated image URL before publishing. External hosts must permit
 * CORS; failing that, sharing stops rather than publishing fragile URLs.
 */
const SHAREABLE_FILE_MIME = /^(?:image\/(?!svg\+xml$)[a-z0-9.+-]+|application\/pdf|application\/vnd\.openxmlformats-officedocument\.(?:wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+)$/i;
const SHAREABLE_FILE_NAME = /\.(?:png|jpe?g|webp|gif|bmp|avif|tiff?|pdf|docx|xlsx|pptx|mp3|wav|m4a|aac|ogg|opus|flac|aiff|wma|mp4|webm|mov|m4v|avi|mkv|mpeg|mpg|3gp)$/i;
function shareImageKey(key: string) {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return /^(?:image|images|image_url|image_urls|imageurl|image_data|image_base64|photo|photos|picture|pictures|thumbnail|thumbnails|src|background|b64_json)$/.test(normalized) ||
    /^(?:cover|profile|slide|card|background|thumbnail)_image(?:_url)?$/.test(normalized);
}
function shareImagePayloadKey(key: string, parentIsImage: boolean) {
  return shareImageKey(key) || (parentIsImage && /^(?:url|href|data|base64)$/i.test(key));
}
export function isPrivateShareKey(key: string) {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return /^(?:answer|answers|answer_key|answer_keys|answerkey|answerkeys|correct_answer|correct_answers|correctanswer|correctanswers|answer_explanation|answer_explanations|solution|solutions|key|keys|note|notes|private|private_note|private_notes|privatenote|privatenotes|teacher_answer|teacher_answers|teacher_note|teacher_notes)$/.test(normalized) ||
    /^(?:answer|private|teacher)_(?:answer|answers|key|keys|note|notes|solution|solutions|explanation|explanations)$/.test(normalized) ||
    /(?:^|_)(?:answer_key|answer_keys|correct_answer|teacher_answer|private_note|teacher_note)$/.test(normalized);
}

export async function prepareShareSnapshot(value: any, kind?: string, includePrivate = true): Promise<any> {
  if (kind === "file") {
    const data = value?.data;
    const match = typeof data === "string" ? data.match(/^data:([^;,]+);base64,/i) : null;
    const mime = String(value?.mime || match?.[1] || "").toLowerCase();
    if (!match || mime !== match[1].toLowerCase() || !SHAREABLE_FILE_MIME.test(mime) || !SHAREABLE_FILE_NAME.test(String(value?.name || ""))) {
      throw new Error("This file type cannot be shared. Use an image, PDF, DOCX, XLSX, PPTX, audio, or video file; SVG, HTML, and environment files are not supported.");
    }
    if (Math.ceil((data.length - match[0].length) * 0.75) > 16 * 1024 * 1024) {
      throw new Error("This file exceeds the 16 MB per-document sharing limit.");
    }
  }
  const visit = async (item: any, key = "", imageContext = false): Promise<any> => {
    if (Array.isArray(item)) return Promise.all(item.map(v => visit(v, key, imageContext)));
    if (item && typeof item === "object") {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(item)) {
        if (!includePrivate && isPrivateShareKey(k)) continue;
        const fieldIsImage = shareImagePayloadKey(k, imageContext);
        result[k] = await visit(v, k, fieldIsImage);
      }
      return result;
    }
    if (typeof item !== "string") return item;
    if (kind === "tv" && key === "src" && /^\/tv-assets\/models\/[a-z0-9-]+\.glb$/.test(item)) {
      const response = await fetch(item, { credentials: "include" });
      if (!response.ok) throw new Error("The complete 3D model could not be embedded. Nothing was shared.");
      const data = await response.arrayBuffer();
      if (data.byteLength > 11 * 1024 * 1024) throw new Error("This 3D model is too large for a 16 MB shared snapshot.");
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not embed the 3D model."));
        reader.readAsDataURL(new Blob([data], { type: "model/gltf-binary" }));
      });
    }
    // Generated-content snapshots store structured JSON as a string in `body`.
    // Inspect and rewrite its image fields without changing the public payload
    // shape expected by existing BrightBoard renderers.
    if (key === "body" && /^[\s]*(\{|\[)/.test(item)) {
      try { return JSON.stringify(await visit(JSON.parse(item), "", imageContext || kind === "image")); } catch (error) {
        if (error instanceof Error && /image|embed|host|share/i.test(error.message)) throw error;
      }
    }
    if (/^data:image\/svg\+xml(?:[;,])/i.test(item)) throw new Error("SVG images cannot be shared. Export the logo as PNG, JPEG, WebP, or GIF first.");
    if (/^data:image\//i.test(item)) return item;
    const isImageBody = kind === "image" && key === "body";
    const isKnownRelativeImagePath = /^(?:\.\/)?\/?(?:generated-images?|uploads?|api)\/[^?#]+/i.test(item);
    const isRelativeImageFilename = /^(?:\.\/)?[\w./-]+\.(?:png|jpe?g|webp|gif|bmp|avif|tiff?)(?:[?#].*)?$/i.test(item);
    const isRemoteImage = /^https?:\/\//i.test(item) && (imageContext || isImageBody);
    const isRelativeImage = (item.startsWith("/") || isKnownRelativeImagePath || isRelativeImageFilename) &&
      (imageContext || isImageBody) && (isKnownRelativeImagePath || isRelativeImageFilename || item.startsWith("/"));
    if (/^blob:/i.test(item)) {
      throw new Error("Temporary image links cannot be shared. Save the image and try again.");
    }
    if (isRemoteImage || isRelativeImage) {
      let url: URL;
      try { url = new URL(item, window.location.origin); } catch { throw new Error(`Could not prepare image in “${key}”.`); }
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Temporary image links cannot be shared. Save the image and try again.");
      try {
        const response = await fetch(url.href, { mode: "cors", credentials: url.origin === window.location.origin ? "include" : "omit" });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        if (!blob.type.startsWith("image/") || blob.type.toLowerCase() === "image/svg+xml") throw new Error();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error());
          reader.readAsDataURL(blob);
        });
      } catch { throw new Error("An image could not be embedded (the image host may block access). Nothing was shared."); }
    }
    return item;
  };
  return visit(value);
}

export function stableShareUrl(id: string, revision?: string) {
  const url = new URL(`/share/${id}`, window.location.origin);
  if (revision) url.searchParams.set("revision", revision);
  return url.href;
}
