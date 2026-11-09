import { referenceMime } from "@shared/reference-file";

export async function readReferenceUpload(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Image too large. Please use an image under 10MB.");
  const mime = referenceMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read this image. Please try another file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(new Blob([file], { type: mime }));
  });
}
