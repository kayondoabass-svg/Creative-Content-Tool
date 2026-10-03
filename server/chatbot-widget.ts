import type { Express } from "express";
import rateLimit from "express-rate-limit";

const PROVIDER_CHAT_FETCH = 'fetch("https://afroaigroup.com/api/widget-chat/" + key, {';
const LOCAL_CHAT_FETCH = 'fetch("/api/chatbot-widget/chat", {';

// Keep the provider's widget appearance, but send messages through our origin.
// AfroAI's OPTIONS response does not permit browser JSON requests across origins.
export function registerChatbotWidget(app: Express): void {
  let cachedWidget: { key: string; script: string; expiresAt: number } | undefined;

  async function widgetScript(key: string): Promise<string> {
    if (cachedWidget?.key === key && cachedWidget.expiresAt > Date.now()) {
      return cachedWidget.script;
    }

    const url = new URL("https://afroaigroup.com/widget.js");
    url.searchParams.set("key", key);
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Widget provider unavailable");
    const source = await response.text();
    if (!source.includes(PROVIDER_CHAT_FETCH)) {
      throw new Error("Unexpected widget format");
    }

    const script = `(() => {
      if (document.getElementById("brightboard-afroai-widget")) return;
      const marker = document.createElement("meta");
      marker.id = "brightboard-afroai-widget";
      document.head.appendChild(marker);
      ${source.replace(PROVIDER_CHAT_FETCH, LOCAL_CHAT_FETCH)}
    })();`;
    cachedWidget = { key, script, expiresAt: Date.now() + 5 * 60_000 };
    return script;
  }

  // The /api/ prefix also keeps this runtime configuration out of the PWA cache.
  app.get("/api/chatbot-widget.js", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.type("application/javascript");

    const key = process.env.AFROAI_CHATBOT_WIDGET_KEY?.trim();
    if (!key) {
      res.status(503).send(
        'console.warn("[BrightBoard] Chatbot is not configured.");',
      );
      return;
    }

    try {
      res.send(await widgetScript(key));
    } catch {
      // Never log upstream URLs, which contain the embed key.
      console.error("[BrightBoard] Chatbot widget provider unavailable.");
      res.status(502).send(
        'console.warn("[BrightBoard] Chatbot could not load. Please refresh later.");',
      );
    }
  });

  const chatLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { reply: "Please wait a minute before sending more messages." },
  });

  app.post("/api/chatbot-widget/chat", chatLimiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const key = process.env.AFROAI_CHATBOT_WIDGET_KEY?.trim();
    if (!key) {
      res.status(503).json({ reply: "Chat is temporarily unavailable. Please try again later." });
      return;
    }

    const { message, sessionId, history = [] } = req.body ?? {};
    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
      res.status(400).json({ reply: "Please enter a message between 1 and 4,000 characters." });
      return;
    }
    if (typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
      res.status(400).json({ reply: "Please refresh the page to start a new chat session." });
      return;
    }
    if (!Array.isArray(history)) {
      res.status(400).json({ reply: "The chat history is invalid. Please refresh the page." });
      return;
    }
    const recentHistory = history.slice(-20);
    if (!recentHistory.every((entry) =>
      entry && ["user", "assistant"].includes(entry.role) && typeof entry.content === "string",
    )) {
      res.status(400).json({ reply: "The chat history is invalid. Please refresh the page." });
      return;
    }

    try {
      const response = await fetch(
        `https://afroaigroup.com/api/widget-chat/${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            message: message.trim(),
            sessionId,
            history: recentHistory.map(({ role, content }) => ({
              role,
              content: content.slice(0, 8000),
            })),
          }),
        },
      );
      if (!response.ok) throw new Error("Chat provider unavailable");
      const data = await response.json();
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("Invalid chat provider response");
      }
      res.json({ reply: data.reply });
    } catch {
      console.error("[BrightBoard] Chatbot upstream request failed.");
      res.status(502).json({
        reply: "Chat is temporarily unavailable. Please try again in a moment.",
      });
    }
  });
}