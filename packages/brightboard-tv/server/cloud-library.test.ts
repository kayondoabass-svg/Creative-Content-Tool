import test from "node:test";
import assert from "node:assert/strict";
import { libraryRequest, openCloudLesson, saveCloudLesson, CloudLibraryError } from "../src/cloud-library";
import { WorkspaceStorage, type WorkspaceBackend } from "../src/workspace-storage";
import { newLesson } from "../src/types";
import { lessonFromJSON } from "../src/helpers";

test("cloud failures do not alter independent device recovery and exported copies", async () => {
  let records = {};
  const backend: WorkspaceBackend = { read: async () => structuredClone(records), write: async values => { records = { ...records, ...structuredClone(values) }; } };
  const device = new WorkspaceStorage(backend); await device.initialize();
  const lesson = newLesson(); lesson.pages[0].notes = "Offline private notes";
  await device.saveWorkspace(lesson); await device.saveLibrary(lesson);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("Offline"); };
    await assert.rejects(saveCloudLesson(lesson), /offline or timed out/);
    await assert.rejects(openCloudLesson(lesson.id), /offline or timed out/);
    assert.equal(device.library()[0].id, lesson.id);
    assert.deepEqual(lessonFromJSON(JSON.stringify(device.workspace())).pages, lesson.pages);
    const reopened = new WorkspaceStorage(backend); await reopened.initialize();
    assert.deepEqual(reopened.workspace()?.pages, lesson.pages);
    // Standalone local saving stays free, without any account network calls.
    const standalone = newLesson(); await reopened.saveLibrary(standalone);
    assert.equal(reopened.library().length, 2);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Paid plan required." }), { status: 403 });
    await assert.rejects(saveCloudLesson(lesson), error => error instanceof CloudLibraryError && error.status === 403);
    assert.equal(device.workspace()?.id, lesson.id);
  } finally { globalThis.fetch = originalFetch; }
});

test("cloud client uses same-origin authenticated uncached requests, revision checks and lossless imports", async () => {
  const originalFetch = globalThis.fetch, lesson = newLesson();
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, `/api/tv/library/${lesson.id}`);
      assert.equal(init?.credentials, "include");
      assert.equal(init?.cache, "no-store");
      assert.equal((init?.headers as any)["If-Match"], "saved-version");
      assert.equal(init?.method, "PUT");
      assert.deepEqual(JSON.parse(init?.body as string), lesson);
      return new Response(JSON.stringify({ id: lesson.id, revision: "next-version" }));
    };
    assert.equal((await saveCloudLesson(lesson, "saved-version")).revision, "next-version");
    globalThis.fetch = async () => new Response(JSON.stringify({ lesson, revision: "next-version" }));
    assert.deepEqual((await openCloudLesson(lesson.id)).lesson, lesson);
    globalThis.fetch = async () => new Response("<html>offline proxy</html>", { status: 502 });
    await assert.rejects(libraryRequest(), /device copy is unchanged/);
    globalThis.fetch = async () => new Response(JSON.stringify({ lesson: { format: "wrong" } }));
    await assert.rejects(openCloudLesson(lesson.id), /not a valid/);
  } finally { globalThis.fetch = originalFetch; }
});
