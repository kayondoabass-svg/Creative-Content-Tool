import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceStorage, type WorkspaceBackend } from "../src/workspace-storage";
import { freshLesson } from "../src/helpers";
import { writeLessonFile, type LocalLessonFile } from "../src/local-files";

function fixtureBackend() {
  let records = {};
  let fail = false;
  const backend: WorkspaceBackend = {
    read: async () => structuredClone(records),
    write: async values => {
      if (fail) { fail = false; throw new Error("Simulated storage failure"); }
      records = { ...records, ...structuredClone(values) };
    },
  };
  return { backend, failNext: () => { fail = true; } };
}

test("large drafts survive reopening without localStorage writes", async () => {
  const { backend } = fixtureBackend(), store = new WorkspaceStorage(backend);
  await store.initialize();
  const lesson = freshLesson();
  lesson.pages[0].notes = "Private speaker notes";
  lesson.pages[0].objects.push({ id: "large", type: "text", text: "x".repeat(6 * 1024 * 1024), x: 0, y: 0, width: 1, height: 1, color: "#183a40" });
  await store.saveWorkspace(lesson);
  const reopened = new WorkspaceStorage(backend); await reopened.initialize();
  assert.equal(reopened.workspace()?.pages[0].objects[0].text?.length, 6 * 1024 * 1024);
  assert.equal(reopened.workspace()?.pages[0].notes, "Private speaker notes");
});

test("legacy migration removes old copies only after a successful durable commit", async () => {
  const fixture = fixtureBackend(), lesson = freshLesson();
  const legacy = new Map([["brightboard-tv-workspace", JSON.stringify(lesson)], ["brightboard-tv-library", JSON.stringify([lesson])], ["brightboard-tv-names", "Avery\nSam"]]);
  const api = { getItem: (key: string) => legacy.get(key) || null, removeItem: (key: string) => { legacy.delete(key); } };
  fixture.failNext();
  const failed = new WorkspaceStorage(fixture.backend);
  await assert.rejects(failed.initialize(api));
  assert.equal(legacy.size, 3);
  assert.equal(failed.workspace()?.id, lesson.id);
  await assert.rejects(failed.saveWorkspace(freshLesson()), /not ready/);
  const migrated = new WorkspaceStorage(fixture.backend); await migrated.initialize(api);
  assert.equal(legacy.size, 0);
  assert.equal(migrated.library()[0].id, lesson.id);
  assert.equal(migrated.names(), "Avery\nSam");
});

test("failed writes preserve saved state, subsequent writes recover, reset follows old autosaves", async () => {
  const fixture = fixtureBackend(), store = new WorkspaceStorage(fixture.backend);
  await store.initialize();
  const old = freshLesson(); await store.saveWorkspace(old); await store.saveLibrary(old);
  fixture.failNext();
  await assert.rejects(store.saveWorkspace(freshLesson()));
  assert.equal(store.workspace()?.id, old.id);
  const fresh = freshLesson();
  await Promise.all([store.saveWorkspace(old), store.clear(fresh)]);
  assert.equal(store.workspace()?.id, fresh.id);
  assert.equal(store.library().length, 0);
  const reopened = new WorkspaceStorage(fixture.backend); await reopened.initialize();
  assert.equal(reopened.workspace()?.id, fresh.id);
  assert.equal(reopened.library().length, 0);
});

test("opening a new lesson preserves the current draft and library deletion preserves the editor", async () => {
  const fixture = fixtureBackend(), store = new WorkspaceStorage(fixture.backend);
  await store.initialize();
  const old = freshLesson(), selected = freshLesson();
  await store.switchWorkspace(selected, old);
  assert.equal(store.library()[0].id, old.id);
  await store.deleteLibrary(old.id);
  assert.equal(store.library().length, 0);
  assert.equal(store.workspace()?.id, selected.id);
});

test("native file saving commits on close and aborts without closing after failed writes", async () => {
  let committed = false, aborted = false, contents = "";
  const handle: LocalLessonFile = {
    name: "test.bbtv",
    getFile: async () => { throw new Error("not needed"); },
    createWritable: async () => ({
      write: async blob => { contents = await blob.text(); },
      close: async () => { committed = true; },
      abort: async () => { aborted = true; },
    }),
  };
  const lesson = freshLesson();
  await writeLessonFile(handle, lesson);
  assert.equal(JSON.parse(contents).id, lesson.id);
  assert.equal(committed, true); assert.equal(aborted, false);
  committed = false;
  handle.createWritable = async () => ({
    write: async () => { throw new Error("Permission denied"); },
    close: async () => { committed = true; },
    abort: async () => { aborted = true; },
  });
  await assert.rejects(writeLessonFile(handle, lesson), /Permission denied/);
  assert.equal(committed, false); assert.equal(aborted, true);
});
