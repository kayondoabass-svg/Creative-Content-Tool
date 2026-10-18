import test from "node:test";
import assert from "node:assert/strict";
import { buildBrightboardTVLesson } from "./brightboard-tv";

test("generated text and worksheet content become portable BrightboardTV pages", async () => {
  const lesson = await buildBrightboardTVLesson("text", "Hello presentation");
  assert.equal(lesson.format, "brightboard-tv");
  assert.equal(lesson.pages[0].objects[1].text, "Hello presentation");
  const worksheet = await buildBrightboardTVLesson("worksheet", JSON.stringify({ title: "Practice", gridText: "Keep this grid", guidance: "Keep guidance too" }));
  assert.match(worksheet.pages[0].objects[1].text!, /Keep this grid/);
  assert.match(worksheet.pages[0].objects[1].text!, /Keep guidance too/);
});
test("generated slides preserve speaker notes and reject silent truncation", async () => {
  const lesson = await buildBrightboardTVLesson("presentation", JSON.stringify({ slides: [{ title: "Slide", content: ["First", "Second"], notes: "Private speaker note" }] }));
  assert.equal(lesson.pages[0].notes, "Private speaker note");
  assert.match(lesson.pages[0].objects[1].text!, /First\nSecond/);
  await assert.rejects(buildBrightboardTVLesson("presentation", JSON.stringify({ slides: Array.from({ length: 61 }, () => ({ title: "Page" })) })), /60-page/);
});
test("storyboard frames preserve descriptions, actions and dialogue", async () => {
  const lesson = await buildBrightboardTVLesson("storyboard", JSON.stringify([
    { frameNumber: 1, description: "A classroom", action: "Point to the board", dialogue: "Hello class" },
  ]));
  assert.equal(lesson.pages[0].title, "Frame 1");
  assert.match(lesson.pages[0].objects[1].text!, /A classroom\nAction: Point to the board\nDialogue: Hello class/);
});
