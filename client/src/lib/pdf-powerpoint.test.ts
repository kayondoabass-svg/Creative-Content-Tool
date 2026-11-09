import test from "node:test";
import assert from "node:assert/strict";
import { abortable } from "./pdf-powerpoint";

test("a stalled conversion can be cancelled without waiting for the worker", async () => {
  const controller = new AbortController();
  const result = abortable(new Promise<string>(() => {}), controller.signal);
  controller.abort(new Error("Conversion cancelled."));
  await assert.rejects(result, /Conversion cancelled/);
});
test("an already cancelled operation cannot start waiting", async () => {
  const controller = new AbortController();
  controller.abort(new Error("Stop"));
  await assert.rejects(abortable(Promise.resolve("unused"), controller.signal), /Stop/);
});
test("ordinary completion and worker errors are preserved", async () => {
  const controller = new AbortController();
  assert.equal(await abortable(Promise.resolve("complete"), controller.signal), "complete");
  await assert.rejects(abortable(Promise.reject(new Error("Damaged PDF")), controller.signal), /Damaged PDF/);
});
