import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import express from "express";
import { randomUUID, createHash } from "node:crypto";
import { validateReferenceImage, analyseReferences, verifyImageResult } from "./reference-input";
import { referenceInstructions } from "../shared/reference-policy";
import { generateContentSchema } from "../shared/schema";
import { validateWorksheet } from "../shared/worksheet-quality";
import { SharingService, authenticated } from "../cloudflare/sharing/worker";
import { sharingSignature, sharingPublicKey } from "./sharing-signature";
import { registerDocumentSharing } from "./document-sharing-routes";
import { ShareError } from "./document-sharing-store";
import { prepareSharedContent } from "./document-sharing-store";
import { buildWordSearch } from "../shared/worksheet-quality";
import { validateWordSearchPuzzle } from "../shared/puzzle-validation";
import { withoutPrivateShareFields } from "../shared/share-privacy";
import { referenceMime } from "../shared/reference-file";

const image = async (background = "#aabbcc", format: "png" | "webp" = "png") =>
  sharp({ create: { width: 48, height: 48, channels: 3, background } }).toFormat(format).toBuffer();
const dataUrl = (b: Buffer, format = "png") => `data:image/${format};base64,${b.toString("base64")}`;

test("reference inputs validate real bytes, format, animation and supported purposes", async () => {
  assert.equal(referenceMime(new Uint8Array((await image()).subarray(0, 12))), "image/png");
  assert.throws(() => referenceMime(new Uint8Array(Buffer.from("<svg>fake</svg>"))));
  assert.equal((await validateReferenceImage(dataUrl(await image()))).mimeType, "image/png");
  await assert.rejects(validateReferenceImage("https://private.invalid/image.png"));
  await assert.rejects(validateReferenceImage(dataUrl(Buffer.from("not an image"))));
  await assert.rejects(validateReferenceImage(dataUrl(await image(), "jpeg")));
  assert.throws(() => referenceInstructions("invalid" as any));
  assert.equal(generateContentSchema.safeParse({ type: "text", prompt: "Travel", referencePurpose: "edit" }).success, false);
  assert.equal(generateContentSchema.safeParse({ type: "worksheet", prompt: "Travel", referencePurpose: "style" }).success, true);
  assert.equal(generateContentSchema.safeParse({ type: "image", prompt: "Travel", referencePurpose: "invalid" }).success, false);
});

test("reference analysis transmits the actual image and user's request, not a text URL", async () => {
  const before = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "unit-test-placeholder";
  try {
    let calls = 0;
    const result = await analyseReferences([dataUrl(await image())], "content", "Create a new Hanoi transport lesson", (async (_url: any, init: any) => {
      calls++;
      const body = JSON.parse(init.body);
      assert.match(body.contents[0].parts[0].text, /Create a new Hanoi/);
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/png");
      assert.ok(body.contents[0].parts[1].inlineData.data.length);
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: "Transport illustration: bus, boat, cyclo.", uncertain: [] }) }] } }] });
    }) as typeof fetch);
    assert.equal(calls, 1);
    assert.match(result, /Transport illustration/);
    let retries = 0;
    await assert.rejects(analyseReferences([dataUrl(await image())], "content", "Read this", (async () => {
      retries++; return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: "Unclear", uncertain: ["unreadable question"] }) }] } }] });
    }) as typeof fetch), /clearer image/);
    assert.equal(retries, 1);
    let failures = 0;
    await assert.rejects(analyseReferences([dataUrl(await image())], "style", "New lesson", (async () => {
      failures++; return Response.json({ error: "Unavailable" }, { status: 503 });
    }) as typeof fetch), /not ignored/);
    assert.equal(failures, 2);
  } finally {
    if (before === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = before;
  }
});

test("identical pixels are rejected across formats; near-identical grid variants fail", async () => {
  const png = (await image()).toString("base64");
  const webp = await sharp(Buffer.from(png, "base64")).webp({ lossless: true }).toBuffer();
  await assert.rejects(verifyImageResult(webp.toString("base64"), dataUrl(Buffer.from(png, "base64"))), /unchanged/);
  await assert.rejects(verifyImageResult(png, undefined, [png]), /variation/);
  await verifyImageResult((await image("#112233")).toString("base64"), dataUrl(Buffer.from(png, "base64")));
});

test("exercise validation catches incomplete keys, ambiguous matches and missing word-bank answers", () => {
  assert.throws(() => validateWorksheet({ title: "Travel", layout: "mixed", sections: [{ type: "fillBlank", content: ["Travel by ___", "Ride a ___"], answers: ["bus"] }] }), /corresponding answer/);
  assert.throws(() => validateWorksheet({ title: "Travel", layout: "matching", pairs: [{ left: "Bus", right: "vehicle" }, { left: "Taxi", right: "vehicle" }] }), /ambiguous/);
  assert.throws(() => validateWorksheet({ title: "Travel", layout: "fillBlank", wordBank: ["boat"], questions: [{ textBeforeBlank: "Ride a", answer: "bus" }] }), /word bank/);
});

test("puzzles verify actual letters, boundaries, coverage and parity before sharing", () => {
  const puzzle = { title: "Travel", layout: "wordSearch", ...buildWordSearch(["BUS", "TRAIN", "TAXI"]) };
  validateWordSearchPuzzle(puzzle);
  const bad = structuredClone(puzzle);
  const first = bad.answerKey[0];
  bad.grid[first.row][first.column] = first.word[0] === "Z" ? "A" : "Z";
  assert.throws(() => validateWordSearchPuzzle(bad), /does not spell/);
  assert.throws(() => prepareSharedContent("worksheet", { body: JSON.stringify(bad) }, false), /does not spell/);
  assert.throws(() => validateWordSearchPuzzle({ ...puzzle, answerKey: puzzle.answerKey.slice(1) }), /placements/);
  assert.throws(() => validateWordSearchPuzzle({ ...puzzle, answerKey: puzzle.answerKey.map((p: any) => ({ ...p, row: -1 })) }), /invalid/);
  const { answerKey, ...student } = puzzle;
  assert.doesNotThrow(() => validateWordSearchPuzzle(student, false));
  assert.doesNotThrow(() => prepareSharedContent("worksheet", { body: JSON.stringify(student) }, false));
});

test("old shared snapshots cannot expose private answer fields when private content is excluded", () => {
  const result = withoutPrivateShareFields({ body: JSON.stringify({ title: "Lesson", sections: [{ content: ["Question"], answers: ["PRIVATE"] }], presenterNotes: "PRIVATE", answerKey: ["PRIVATE"] }) });
  assert.ok(!JSON.stringify(result).includes("PRIVATE"));
  assert.ok(JSON.stringify(result).includes("Question"));
});

test("signed anonymous reads cannot become signed anonymous mutations", async () => {
  const secret = "unit-test-sharing-key";
  const env: any = { TRUSTED_KEYS: JSON.stringify([sharingPublicKey(secret)]) };
  const request = (op: string) => {
    const body = JSON.stringify({ op, actor: null });
    return new Request("https://storage.invalid/rpc", { method: "POST", body, headers: sharingSignature(body, secret) });
  };
  assert.equal((await authenticated(request("publicGet"), env)).actor, null);
  for (const op of ["get", "list", "save", "configure", "remove", "request"]) {
    await assert.rejects(authenticated(request(op), env), (e: any) => e.status === 400);
  }
  await assert.rejects(authenticated(new Request("https://storage.invalid/rpc", { method: "POST", body: '{"op":"publicGet","actor":null}' }), env), (e: any) => e.status === 401);
});

test("Worker allows only live link snapshots anonymously and never exposes owner management", async () => {
  const id = randomUUID(), revision = randomUUID(), bytes = new Uint8Array([1, 2, 3]);
  const doc: any = { id, owner_id: "owner", audience: "link", enabled: 1, allow_requests: 1, revision, expires_at: null };
  const version = { revision, object_key: "private/object", sha256: createHash("sha256").update(bytes).digest("hex"), title: "Public lesson" };
  const env: any = {
    DB: { prepare(sql: string) { return { bind() { return this; }, first: async () => sql.includes("FROM documents") ? doc : version, all: async () => ({ results: [{ revision }] }) }; } },
    FILES: { get: async () => ({ arrayBuffer: async () => bytes.buffer }) },
  };
  const service = new SharingService(env);
  const result = await service.get(null, id);
  assert.equal(result.role, "viewer");
  assert.deepEqual(result.members, []);
  assert.deepEqual(result.requests, []);
  assert.deepEqual(result.activity, []);
  doc.audience = "invited";
  await assert.rejects(service.get(null, id), (e: any) => e.status === 403);
  doc.audience = "link"; doc.enabled = 0;
  await assert.rejects(service.get(null, id), (e: any) => e.status === 410);
  doc.enabled = 1; doc.expires_at = "invalid";
  await assert.rejects(service.get(null, id), (e: any) => e.status === 410);
});

test("HTTP public viewing works without a session; list, edit and downloads remain permission checked", async () => {
  const app = express();
  const store: any = { publicGet: async (id: string) => {
    if (id === "private") throw new ShareError(403, "Private document.");
    return { id, revision: "version", role: "viewer", title: "Shared lesson", content: { body: "Visible" }, allowDownload: false };
  } };
  registerDocumentSharing(app, null as any, async () => null, store);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/sharing/documents`;
  try {
    assert.equal((await fetch(`${base}/public`)).status, 200);
    assert.equal((await fetch(`${base}/private`)).status, 403);
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(`${base}/public/export`)).status, 403);
    for (const method of ["PUT", "PATCH", "DELETE"]) assert.equal((await fetch(`${base}/public`, { method })).status, 401);
    assert.equal((await fetch(`${base}/public/requests`, { method: "POST" })).status, 401);
  } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});
