import test from "node:test";
import assert from "node:assert/strict";
import { freshLesson, mergeLessonPages } from "../src/helpers";

test("merging lesson files appends pages without replacing work or duplicating IDs", () => {
  const current = freshLesson();
  current.title = "My current presentation";
  const imported = freshLesson();
  imported.pages[0].notes = "Imported private notes";
  imported.pages[0].objects.push({ id: "original-object", type: "text", x: 0, y: 0, width: .3, height: .1, color: "#183a40", text: "Imported text" });
  imported.pages[0].ink.push({ id: "original-ink", color: "#183a40", width: 3, points: [{ x: .1, y: .2 }] });
  let id = 0;
  const merged = mergeLessonPages(current, imported, () => `fresh-${++id}`);
  assert.equal(merged.title, current.title);
  assert.equal(merged.id, current.id);
  assert.equal(merged.pages.length, current.pages.length + imported.pages.length);
  assert.equal(merged.pages[0], current.pages[0]);
  const page = merged.pages[current.pages.length];
  assert.notEqual(page.id, imported.pages[0].id);
  assert.notEqual(page.objects[0].id, "original-object");
  assert.notEqual(page.ink[0].id, "original-ink");
  assert.equal(page.notes, "Imported private notes");
  assert.equal(page.objects[0].text, "Imported text");
  assert.equal(current.pages.length, 1);
  assert.equal(imported.pages[0].objects[0].id, "original-object");
});
test("an oversized merge rejects the whole operation without changing either lesson", () => {
  const current = freshLesson();
  const imported = freshLesson();
  imported.pages = Array.from({ length: 60 }, () => ({ ...imported.pages[0] }));
  assert.throws(() => mergeLessonPages(current, imported), /20-page/);
  assert.equal(current.pages.length, 1);
  assert.equal(imported.pages.length, 60);
});
