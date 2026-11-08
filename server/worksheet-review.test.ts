import test from "node:test";
import assert from "node:assert/strict";
import { checkedWorksheetReview, reviewWorksheet } from "./worksheet-review";
import { worksheetLines } from "../shared/worksheet-quality";

const mixed = {
  title: "Hanoi transport",
  sections: [{ type: "questions", title: "Travel", content: ["Name a form of transport."], answers: ["Bus"], imagePrompt: "A bus without text" }],
};

test("mixed worksheets survive missing or changed AI labels without losing images or answers", () => {
  for (const layout of [undefined, "Mixed", "worksheet", "matching"]) {
    const original = { ...mixed, layout };
    const result = checkedWorksheetReview(original, "mixed", "blackWhite");
    assert.equal(result.layout, "mixed");
    assert.equal(result.colorMode, "blackWhite");
    assert.deepEqual(result.sections, mixed.sections);
    assert.equal(original.layout, layout);
  }
});

test("a different exercise structure is not accepted by simply relabelling it", () => {
  assert.throws(() => checkedWorksheetReview({
    title: "Matching", layout: "matching", pairs: [{ left: "Bus", right: "Transport" }],
  }, "mixed", "colored"));
});

test("all existing selected worksheet types retain their exercise structure", () => {
  const layouts = [
    ["mixed", mixed],
    ["pictureGrid", { questions: [{ textBeforeBlank: "Ride a", answer: "bus", imagePrompt: "Bus" }] }],
    ["fillBlank", { questions: [{ textBeforeBlank: "Ride a", answer: "bus" }] }],
    ["multipleChoice", { questions: [{ question: "Which is transport?", options: ["Bus", "Tree"], answer: "A" }] }],
    ["matching", { pairs: [{ left: "Bus", right: "Transport" }] }],
    ["trueOrFalse", { statements: [{ text: "Buses carry passengers.", answer: true }] }],
    ["writing", { prompts: [{ text: "Describe your journey.", lines: 4 }] }],
    ["wordSearch", { words: ["BUS", "TRAIN", "TAXI"] }],
  ] as const;
  for (const [layout, content] of layouts) {
    const result = checkedWorksheetReview({ title: "Travel", ...content }, layout, "colored");
    assert.equal(result.layout, layout);
    assert.equal(result.colorMode, "colored");
  }
});

test("an incompatible review receives one bounded repair attempt with the error", async () => {
  const errors: (string | undefined)[] = [];
  const result = await reviewWorksheet("mixed", "colored", async error => {
    errors.push(error);
    return errors.length === 1
      ? { title: "Wrong", layout: "matching", pairs: [{ left: "Bus", right: "Transport" }] }
      : mixed;
  });
  assert.equal(result.layout, "mixed");
  assert.equal(errors.length, 2);
  assert.ok(errors[1]);
});

test("malformed reviews never save unchecked originals or retry forever", async () => {
  let calls = 0;
  await assert.rejects(reviewWorksheet("mixed", "colored", async () => {
    calls++;
    throw new Error("Malformed provider JSON");
  }), /after a repair attempt/);
  assert.equal(calls, 2);
});

test("copy can include the original mixed answer keys without leaking into student exports", () => {
  const data = { ...mixed, layout: "mixed" };
  assert.match(worksheetLines(data, true).join("\n"), /Answer Key:\n1\. Bus/);
  assert.doesNotMatch(worksheetLines(data).join("\n"), /Answer Key:/);
});
