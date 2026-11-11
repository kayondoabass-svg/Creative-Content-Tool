import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (name: string) => readFileSync(name, "utf8");
const advertising = /adsbygoogle|googlesyndication|ca-pub-|google\.com,\s*pub-/i;

test("application HTML and server HTML injection do not load advertising", () => {
  for (const name of ["client/index.html", "server/static.ts"]) {
    assert.doesNotMatch(read(name), advertising, name);
  }
});

test("publisher authorization is withdrawn rather than returning the app shell", () => {
  const routes = read("server/routes.ts");
  const handler = routes.match(/app\.get\("\/ads\.txt",[\s\S]*?\n  \}\);/)?.[0];
  assert.ok(handler);
  assert.match(handler, /status\(410\)/);
  assert.doesNotMatch(handler, advertising);
  assert.equal(existsSync("client/public/ads.txt"), false);
  assert.equal(existsSync("dist/public/ads.txt"), false);
});

test("other requested services are preserved", () => {
  const html = read("client/index.html");
  assert.match(html, /recaptcha\/enterprise\.js/);
  assert.match(html, /\/fonts\/interface\.css/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /analytics\.ahrefs\.com/);
  assert.match(html, /\/api\/chatbot-widget\.js/);
});

test("production entry HTML contains no advertising loader", () => {
  assert.doesNotMatch(read("dist/public/index.html"), advertising);
});
