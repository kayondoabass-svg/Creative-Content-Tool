import test from "node:test";
import assert from "node:assert/strict";
import { canSaveTVLibrary, tvPageLimit } from "./tv-library-access";
import { validLesson } from "../packages/brightboard-tv/src/helpers";
import { blankPage, newLesson } from "../packages/brightboard-tv/src/types";

test("server derives 20/50/100 from current verified entitlement, never browser prices", () => {
  const now = Date.now();
  const active = { subscriptionStatus: "active", subscriptionEndsAt: new Date(now + 60_000) };
  assert.equal(tvPageLimit(null, now), 20);
  for (const subscriptionTier of ["weekly", "monthly", "yearly"]) assert.equal(tvPageLimit({ ...active, subscriptionTier }, now), 50);
  assert.equal(tvPageLimit({ ...active, subscriptionTier: "institution" }, now), 100);
  assert.equal(canSaveTVLibrary({ ...active, subscriptionTier: "institution" }, now), true);
  assert.equal(tvPageLimit({ isOwner: true }, now), 100);
  assert.equal(tvPageLimit({ ...active, subscriptionTier: "institution", subscriptionStatus: "cancelled" }, now), 20);
  assert.equal(tvPageLimit({ ...active, subscriptionTier: "monthly", subscriptionEndsAt: new Date(now - 1) }, now), 20);
});
test("lesson validation supports the full business ceiling but not unbounded documents", () => {
  const lesson = newLesson();
  lesson.pages = Array.from({ length: 100 }, (_, i) => blankPage(`Page ${i + 1}`));
  assert.equal(validLesson(lesson), true);
  lesson.pages.push(blankPage("Too many"));
  assert.equal(validLesson(lesson), false);
});
