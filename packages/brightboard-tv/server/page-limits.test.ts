import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { assertPageLimit, FREE_PAGE_LIMIT, PAID_PAGE_LIMIT, BUSINESS_PAGE_LIMIT, replacesEmptyStarter } from "../src/page-limits";
import { mergeLessonPages, validLesson } from "../src/helpers";
import { initialState, newLesson, blankPage } from "../src/types";
import { createTvRelay } from "./relay";

for (const limit of [FREE_PAGE_LIMIT, PAID_PAGE_LIMIT, BUSINESS_PAGE_LIMIT]) {
  test(`${limit}-page boundary permits exactly the limit and rejects overflow without truncation`, () => {
    assert.doesNotThrow(() => assertPageLimit(limit, limit));
    assert.throws(() => assertPageLimit(limit + 1, limit), new RegExp(`${limit}-page`));
    const current = newLesson(), imported = newLesson();
    current.pages = Array.from({ length: limit - 1 }, (_, i) => blankPage(`Page ${i}`));
    assert.equal(mergeLessonPages(current, imported, undefined, limit).pages.length, limit);
    current.pages.push(blankPage("Last"));
    assert.throws(() => mergeLessonPages(current, imported, undefined, limit), new RegExp(`${limit}-page`));
    assert.equal(current.pages.length, limit);
    assert.equal(imported.pages.length, 1);
  });
}

test("legacy documents remain readable and only an unused starter is replaced by PDF imports", () => {
  const legacy = newLesson();
  assert.equal(replacesEmptyStarter(legacy), true);
  legacy.pages[0].notes = "Do not discard my notes";
  assert.equal(replacesEmptyStarter(legacy), false);
  legacy.pages = Array.from({ length: 60 }, (_, i) => blankPage(`Old ${i}`));
  assert.equal(validLesson(legacy), true);
  assert.throws(() => assertPageLimit(legacy.pages.length, PAID_PAGE_LIMIT));
  assert.equal(legacy.pages.length, 60);
});

test("relay enforces verified free/paid limits and rejects forged limits or state-update overflow", async () => {
  const service = createTvRelay({ hostedLibrary: true, pageLimitForRequest: async req => req.headers["x-test-paid"] === "business" ? BUSINESS_PAGE_LIMIT : req.headers["x-test-paid"] === "yes" ? PAID_PAGE_LIMIT : FREE_PAGE_LIMIT });
  const app = express(); app.use(express.json()); app.use("/api/tv", service.router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/tv`;
  const state = (pages: number) => {
    const value = initialState(); value.lesson.pages = Array.from({ length: pages }, (_, i) => blankPage(`Page ${i}`)); return value;
  };
  const create = (pages: number, paid: boolean | "business" = false) => fetch(`${base}/sessions`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(paid ? { "x-test-paid": paid === "business" ? "business" : "yes" } : {}) },
    body: JSON.stringify({ state: state(pages), maxPages: 999, isPaid: true }),
  });
  try {
    assert.equal((await create(21)).status, 403);
    assert.equal((await create(51, true)).status, 403);
    const free = await create(20); assert.equal(free.status, 201);
    const freeRoom = await free.json();
    assert.equal((await create(50, true)).status, 201);
    const business = await create(100, "business"); assert.equal(business.status, 201);
    const businessRoom = await business.json();
    const lastPage = await fetch(`${base}/sessions/${businessRoom.id}/state`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${businessRoom.hostKey}` },
      body: JSON.stringify({ state: { ...state(100), pageIndex: 99 } }),
    });
    assert.equal(lastPage.status, 200);
    assert.notEqual((await create(101, "business")).status, 201);
    const update = await fetch(`${base}/sessions/${freeRoom.id}/state`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${freeRoom.hostKey}` },
      body: JSON.stringify({ state: state(21), maxPages: 100 }),
    });
    assert.equal(update.status, 403);
    const after = await fetch(`${base}/sessions/${freeRoom.id}/state`, { headers: { Authorization: `Bearer ${freeRoom.hostKey}` } });
    assert.equal((await after.json()).state.lesson.pages.length, 20);
  } finally { service.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
