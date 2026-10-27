// Notepad may add a UTF-8 BOM and CRLF line endings. Neither changes the
// checksums; preserve every other character so altered hashes still fail.
export function normalizeChecksumText(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
}
