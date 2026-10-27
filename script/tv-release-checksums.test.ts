import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChecksumText } from "./tv-release-checksums";

const sums = `${"a".repeat(64)}  BrightboardTV-source-v1.0.0.zip\n${"b".repeat(64)}  BrightboardTV-prebuilt-v1.0.0.zip\n`;

test("checksum comparison accepts Notepad CRLF, BOM and final newline differences", () => {
  assert.equal(normalizeChecksumText(`\uFEFF${sums.replace(/\n/g, "\r\n")}`), normalizeChecksumText(sums));
  assert.equal(normalizeChecksumText(sums.trimEnd()), normalizeChecksumText(sums));
});

test("checksum comparison still rejects changed hashes or filenames", () => {
  assert.notEqual(normalizeChecksumText(sums.replace(/^a/, "c")), normalizeChecksumText(sums));
  assert.notEqual(normalizeChecksumText(sums.replace("source", "other")), normalizeChecksumText(sums));
});
