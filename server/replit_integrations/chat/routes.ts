import type { Express, Request, Response } from "express";
import { chatStorage } from "./storage";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CHAT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.0-flash-lite"];
let _chatModel: string | null = null;

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      await chatStorage.createMessage(conversationId, "user", content);

      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const contents = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const apiKey = process.env.GEMINI_API_KEY || "";
      const body = JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } });
      let fullResponse = "";
      let succeeded = false;

      const tryModels = _chatModel
        ? [_chatModel, ...CHAT_MODELS.filter(m => m !== _chatModel)]
        : CHAT_MODELS;

      for (const model of tryModels) {
        try {
          const resp = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          const json = await resp.json() as any;
          if (!resp.ok) {
            const code = json?.error?.code || resp.status;
            if (code === 404) { console.warn(`[Chat] ${model} not available, trying next...`); continue; }
            throw new Error(json?.error?.message || resp.statusText);
          }
          fullResponse = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") ?? "";
          if (_chatModel !== model) { console.log(`[Chat] Using model: ${model}`); _chatModel = model; }
          succeeded = true;
          break;
        } catch (err: any) {
          if (String(err.message).includes("not found") || String(err.message).includes("404")) continue;
          throw err;
        }
      }

      if (succeeded && fullResponse) {
        res.write(`data: ${JSON.stringify({ content: fullResponse })}\n\n`);
      }
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
