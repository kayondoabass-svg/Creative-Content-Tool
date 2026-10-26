import assert from "node:assert/strict";
import { test } from "node:test";
import { withBrightBoardBranding } from "./emailBranding";

test("brands fragment emails without altering their content", () => {
  const content = '<div><a href="https://example.com/confirm?token=example">Confirm</a></div>';
  const result = withBrightBoardBranding(content);
  assert.ok(result.endsWith(content));
  assert.ok(result.includes('alt="BrightBoard"'));
  assert.ok(result.includes("https://www.brightboardapp.com/brand-logo.png"));
});
test("inserts branding inside document body, retaining its attributes", () => {
  const result = withBrightBoardBranding('<html><head><title>Email</title></head><body style="margin:0"><p>Hello</p></body></html>');
  assert.match(result, /<body style="margin:0"><div data-brightboard-email-brand/);
  assert.ok(result.endsWith("<p>Hello</p></body></html>"));
});
test("does not duplicate an existing branded header", () => {
  const once = withBrightBoardBranding("<p>Welcome</p>");
  assert.equal(withBrightBoardBranding(once), once);
});
