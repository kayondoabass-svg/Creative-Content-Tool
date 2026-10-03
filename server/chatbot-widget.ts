import type { Express } from "express";

// AfroAI's browser widget requires a public embed key. Keep its configuration
// out of source control and resolve it at runtime so rotations need no rebuild.
export function registerChatbotWidget(app: Express): void {
  // The /api/ prefix also keeps this runtime configuration out of the PWA cache.
  app.get("/api/chatbot-widget.js", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.type("application/javascript");

    const key = process.env.AFROAI_CHATBOT_WIDGET_KEY?.trim();
    if (!key) {
      res.status(503).send(
        'console.warn("[BrightBoard] Chatbot is not configured.");',
      );
      return;
    }

    const widgetUrl = new URL("https://afroaigroup.com/widget.js");
    widgetUrl.searchParams.set("key", key);

    res.send(`(() => {
      if (document.getElementById("brightboard-afroai-widget")) return;
      const script = document.createElement("script");
      script.id = "brightboard-afroai-widget";
      script.src = ${JSON.stringify(widgetUrl.toString())};
      script.defer = true;
      script.onerror = () => console.warn("[BrightBoard] Chatbot could not load.");
      document.head.appendChild(script);
    })();`);
  });
}