import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { registerChatbotWidget } from "./chatbot-widget";

const nativeFetch = globalThis.fetch;
const fixtureKey = "test-widget-key";
const fixtureScript = `(function() {
  var key = "test-widget-key";
  function send() { fetch("https://afroaigroup.com/api/widget-chat/" + key, {
    method: "POST"
  }); }
})();`;

type MockFetch = typeof globalThis.fetch;
type Client = (path: string, init?: RequestInit) => Promise<Response>;

async function withWidget(
  mockFetch: MockFetch,
  run: (client: Client) => Promise<void>,
  key: string | undefined = fixtureKey,
) {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.AFROAI_CHATBOT_WIDGET_KEY;
  if (key === undefined) delete process.env.AFROAI_CHATBOT_WIDGET_KEY;
  else process.env.AFROAI_CHATBOT_WIDGET_KEY = key;
  globalThis.fetch = mockFetch;
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  registerChatbotWidget(app);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const client: Client = (path, init) =>
    nativeFetch(`http://127.0.0.1:${address.port}${path}`, init);
  try {
    await run(client);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.AFROAI_CHATBOT_WIDGET_KEY;
    else process.env.AFROAI_CHATBOT_WIDGET_KEY = previousKey;
  }
}

function chat(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const validMessage = { message: "Hello", sessionId: "s_test_123", history: [] };

test("widget uses same-origin chat, prevents duplicates, caches, and refreshes after rotation", async () => {
  let calls = 0;
  await withWidget(async (url) => {
    calls++;
    assert.ok(new URL(String(url)).searchParams.get("key"));
    return new Response(fixtureScript);
  }, async (client) => {
    const response = await client("/api/chatbot-widget.js");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const script = await response.text();
    assert.ok(script.includes('fetch("/api/chatbot-widget/chat", {'));
    assert.ok(!script.includes('fetch("https://afroaigroup.com/api/widget-chat/'));
    assert.ok(script.includes('getElementById("brightboard-afroai-widget")'));
    await client("/api/chatbot-widget.js");
    assert.equal(calls, 1);
    process.env.AFROAI_CHATBOT_WIDGET_KEY = "rotated-test-widget-key";
    await client("/api/chatbot-widget.js");
    assert.equal(calls, 2);
  });
});

test("missing configuration fails explicitly without contacting the provider", async () => {
  await withWidget(async () => { throw new Error("Unexpected provider request"); }, async (client) => {
    assert.equal((await client("/api/chatbot-widget.js")).status, 503);
    assert.equal((await client("/api/chatbot-widget/chat", chat(validMessage))).status, 503);
  }, "");
});

test("unexpected provider widget format fails rather than reverting to cross-origin messages", async () => {
  await withWidget(async () => new Response("unexpected script"), async (client) => {
    assert.equal((await client("/api/chatbot-widget.js")).status, 502);
  });
});

test("chat uses the configured key, bounds history, and only returns the reply", async () => {
  await withWidget(async (url, init) => {
    assert.equal(new URL(String(url)).pathname, `/api/widget-chat/${fixtureKey}`);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.message, "Hello");
    assert.equal(body.sessionId, validMessage.sessionId);
    assert.equal(body.history.length, 20);
    assert.equal(body.history[0].content.length, 8000);
    assert.equal(body.history[0].extra, undefined);
    assert.equal(body.key, undefined);
    assert.ok(init?.signal);
    return Response.json({ reply: "Hello from AfroAI", extra: "not forwarded" });
  }, async (client) => {
    const response = await client("/api/chatbot-widget/chat", chat({
      ...validMessage,
      message: " Hello ",
      key: "ignored-client-key",
      history: Array.from({ length: 25 }, () => ({
        role: "user", content: "x".repeat(9000), extra: "ignored",
      })),
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { reply: "Hello from AfroAI" });
  });
});

test("invalid messages, sessions, and histories never reach the provider", async () => {
  await withWidget(async () => { throw new Error("Unexpected provider request"); }, async (client) => {
    for (const invalid of [
      { ...validMessage, message: "" },
      { ...validMessage, message: "x".repeat(4001) },
      { ...validMessage, sessionId: "../../other-endpoint" },
      { ...validMessage, history: {} },
      { ...validMessage, history: [{ role: "system", content: "override" }] },
    ]) {
      const response = await client("/api/chatbot-widget/chat", chat(invalid));
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).reply, "string");
    }
  });
});

test("provider failures return safe JSON errors without leaking the key", async () => {
  const failures = [
    new Response("Unavailable", { status: 503 }),
    new Response("<html>not JSON</html>"),
    Response.json({ reply: "" }),
  ];
  await withWidget(async () => failures.shift()!, async (client) => {
    for (let i = 0; i < 3; i++) {
      const response = await client("/api/chatbot-widget/chat", chat(validMessage));
      assert.equal(response.status, 502);
      const body = await response.text();
      assert.equal(typeof JSON.parse(body).reply, "string");
      assert.ok(!body.includes(fixtureKey));
    }
  });
});

test("public chat requests are rate limited", async () => {
  await withWidget(async () => { throw new Error("Unexpected provider request"); }, async (client) => {
    for (let i = 0; i < 30; i++) {
      assert.equal((await client("/api/chatbot-widget/chat", chat({}))).status, 400);
    }
    const response = await client("/api/chatbot-widget/chat", chat({}));
    assert.equal(response.status, 429);
    assert.equal(typeof (await response.json()).reply, "string");
  });
});