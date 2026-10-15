import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import express from "express";
import { registerChatbotWidget } from "./chatbot-widget";

const nativeFetch = globalThis.fetch;
const fixtureKey = "test-widget-key";
const fixtureScript = `(function() {
  var key = "test-widget-key";
  globalThis.sendWidgetMessage = function() { return fetch("https://afroaigroup.com/api/v1/widget-chat/" + key, {
    method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({message: "Hello", sessionId: "s_test_123", history: []})
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
    assert.ok(!script.includes("https://afroaigroup.com/api/"));
    assert.ok(script.includes('getElementById("brightboard-afroai-widget")'));
    await client("/api/chatbot-widget.js");
    assert.equal(calls, 1);
    process.env.AFROAI_CHATBOT_WIDGET_KEY = "rotated-test-widget-key";
    await client("/api/chatbot-widget.js");
    assert.equal(calls, 2);
  });
});

test("supported provider versions and formatting changes execute only same-origin chat", async () => {
  const expressions = [
    ['fetch("https://afroaigroup.com/api/widget-chat/" + key, {', "/api/widget-chat/"],
    ['fetch("https://afroaigroup.com/api/v1/widget-chat/" + key, {', "/api/v1/widget-chat/"],
    ["fetch (\n 'https://afroaigroup.com/api/v1/widget-chat/'\n + key , {", "/api/v1/widget-chat/"],
    ["fetch(`https://afroaigroup.com/api/v1/widget-chat/${ key }`, {", "/api/v1/widget-chat/"],
    ['window.fetch("https://afroaigroup.com/api/v1/widget-chat/" + key, {', "/api/v1/widget-chat/"],
  ];
  for (const [expression, endpoint] of expressions) {
    const source = fixtureScript.replace(
      'fetch("https://afroaigroup.com/api/v1/widget-chat/" + key, {', expression,
    );
    let providerPosts = 0;
    await withWidget(async (url, init) => {
      const parsed = new URL(String(url));
      if (parsed.pathname === "/widget.js") return new Response(source);
      assert.equal(parsed.pathname, endpoint + fixtureKey);
      assert.equal(init?.method, "POST");
      providerPosts++;
      return Response.json({ reply: "A real reply contract" });
    }, async (client) => {
      const response = await client("/api/chatbot-widget.js");
      assert.equal(response.status, 200, expression);
      const script = await response.text();
      let markers = 0;
      let requests = 0;
      const sandbox = {
        document: {
          getElementById: () => markers ? {} : null,
          createElement: () => ({}),
          head: { appendChild: () => { markers++; } },
        },
        fetch: async (url: string, init: RequestInit) => {
          assert.equal(url, "/api/chatbot-widget/chat");
          requests++;
          return client(url, init);
        },
        window: {} as Record<string, unknown>,
        sendWidgetMessage: undefined as undefined | (() => Promise<Response>),
      };
      sandbox.window.fetch = sandbox.fetch;
      runInNewContext(script, sandbox);
      runInNewContext(script, sandbox);
      assert.equal(markers, 1);
      assert.ok(sandbox.sendWidgetMessage);
      assert.deepEqual(await (await sandbox.sendWidgetMessage()).json(), { reply: "A real reply contract" });
      assert.equal(requests, 1);
      assert.equal(providerPosts, 1);
    });
  }
});

test("missing configuration fails explicitly without contacting the provider", async () => {
  await withWidget(async () => { throw new Error("Unexpected provider request"); }, async (client) => {
    assert.equal((await client("/api/chatbot-widget.js")).status, 503);
    assert.equal((await client("/api/chatbot-widget/chat", chat(validMessage))).status, 503);
  }, "");
});

test("unknown, partial, and ambiguous provider migrations fail closed for script and chat", async () => {
  for (const source of [
    "unexpected script",
    fixtureScript.replace("/api/v1/", "/api/v2/"),
    fixtureScript.replace("+ key", "+ renamedKey"),
    fixtureScript + '\nfetch("https://afroaigroup.com/api/v2/widget-chat/" + key, {});',
    fixtureScript + '\nfetch("https://afroaigroup.com/api/widget-chat/" + key, {});',
  ]) {
    await withWidget(async (url) => {
      assert.equal(new URL(String(url)).pathname, "/widget.js");
      return new Response(source);
    }, async (client) => {
      const response = await client("/api/chatbot-widget.js");
      assert.equal(response.status, 502);
      assert.ok(!(await response.text()).includes("https://afroaigroup.com"));
      assert.equal((await client("/api/chatbot-widget/chat", chat(validMessage))).status, 502);
    });
  }
});

test("all matching chat call sites are rewritten", async () => {
  await withWidget(async () => new Response(fixtureScript + fixtureScript), async (client) => {
    const response = await client("/api/chatbot-widget.js");
    assert.equal(response.status, 200);
    const script = await response.text();
    assert.equal(script.match(/fetch\("\/api\/chatbot-widget\/chat",/g)?.length, 2);
    assert.ok(!script.includes("https://afroaigroup.com/api/"));
  });
});

test("expired cache refreshes provider contract and does not serve stale scripts on failure", async (t) => {
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  let calls = 0;
  await withWidget(async () => {
    calls++;
    return new Response(calls === 1 ? fixtureScript : "unsupported update");
  }, async (client) => {
    assert.equal((await client("/api/chatbot-widget.js")).status, 200);
    now += 5 * 60_000 + 1;
    assert.equal((await client("/api/chatbot-widget.js")).status, 502);
    assert.equal(calls, 2);
  });
});

test("widget network and HTTP failures are safe and retried rather than cached", async () => {
  let calls = 0;
  await withWidget(async () => {
    calls++;
    if (calls === 1) throw new Error(`private URL ${fixtureKey}`);
    if (calls === 2) return new Response("Unavailable", { status: 503 });
    return new Response(fixtureScript);
  }, async (client) => {
    for (let i = 0; i < 2; i++) {
      const response = await client("/api/chatbot-widget.js");
      assert.equal(response.status, 502);
      assert.ok(!(await response.text()).includes(fixtureKey));
    }
    assert.equal((await client("/api/chatbot-widget.js")).status, 200);
    assert.equal(calls, 3);
  });
});

test("chat uses the configured key, bounds history, and only returns the reply", async () => {
  await withWidget(async (url, init) => {
    if (new URL(String(url)).pathname === "/widget.js") return new Response(fixtureScript);
    assert.equal(new URL(String(url)).pathname, `/api/v1/widget-chat/${fixtureKey}`);
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
  await withWidget(async (url) => {
    if (new URL(String(url)).pathname === "/widget.js") return new Response(fixtureScript);
    return failures.shift()!;
  }, async (client) => {
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