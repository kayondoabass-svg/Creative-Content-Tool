import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContentSchema, type ContentType, type Slide, type Activity, type StoryboardFrame } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all generated content
  app.get("/api/content", async (req, res) => {
    try {
      const content = await storage.getAllContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get single content item
  app.get("/api/content/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const content = await storage.getContent(id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Delete content
  app.delete("/api/content/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ error: "Failed to delete content" });
    }
  });

  // Generate content
  app.post("/api/generate", async (req, res) => {
    try {
      const validatedData = generateContentSchema.parse(req.body);
      const { type, prompt, gradeLevel, subject, slideCount } = validatedData;

      let generatedContent: string;
      let title: string;

      switch (type) {
        case "image":
          const imageResult = await generateImage(prompt, gradeLevel, subject);
          generatedContent = JSON.stringify(imageResult);
          title = imageResult.title;
          break;

        case "presentation":
          const presentationResult = await generatePresentation(prompt, gradeLevel, subject, slideCount);
          generatedContent = JSON.stringify(presentationResult);
          title = presentationResult.title;
          break;

        case "text":
          const textResult = await generateText(prompt, gradeLevel, subject);
          generatedContent = JSON.stringify(textResult);
          title = textResult.title;
          break;

        case "activity":
          const activityResult = await generateActivity(prompt, gradeLevel, subject);
          generatedContent = JSON.stringify(activityResult);
          title = activityResult.title;
          break;

        case "storyboard":
          const storyboardResult = await generateStoryboard(prompt, gradeLevel, subject);
          generatedContent = JSON.stringify(storyboardResult);
          title = storyboardResult.title;
          break;

        default:
          return res.status(400).json({ error: "Invalid content type" });
      }

      // Save to storage
      const saved = await storage.createContent({
        type,
        prompt,
        title,
        content: generatedContent,
      });

      res.json(saved);
    } catch (error: any) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  return httpServer;
}

// Image generation
async function generateImage(prompt: string, gradeLevel?: string, subject?: string) {
  const context = buildContext(gradeLevel, subject);
  const enhancedPrompt = `Create a colorful, child-friendly educational illustration: ${prompt}. ${context} Style: bright colors, simple shapes, cartoon-like, engaging for children, no text in the image.`;

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt: enhancedPrompt,
    size: "1024x1024",
    n: 1,
  });

  const imageData = response.data?.[0];
  if (!imageData) {
    throw new Error("Failed to generate image");
  }

  return {
    title: extractTitle(prompt),
    description: prompt,
    imageUrl: imageData.url || undefined,
    b64_json: imageData.b64_json || undefined,
  };
}

// Presentation generation
async function generatePresentation(prompt: string, gradeLevel?: string, subject?: string, slideCount?: number) {
  const context = buildContext(gradeLevel, subject);
  const numSlides = slideCount || 6;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational content creator specializing in engaging presentations for teachers. Create presentations that are age-appropriate, visually describable, and include interactive elements. ${context}
        
        Return a JSON object with this exact structure:
        {
          "title": "Presentation Title",
          "slides": [
            {
              "title": "Slide Title",
              "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
              "notes": "Speaker notes for the teacher",
              "imagePrompt": "Description of suggested visual for this slide"
            }
          ]
        }
        
        IMPORTANT: Create exactly ${numSlides} slides. Each slide should have 3-5 bullet points.`
      },
      {
        role: "user",
        content: `Create an engaging educational presentation about: ${prompt}. Create exactly ${numSlides} slides with clear, age-appropriate content.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// Text content generation
async function generateText(prompt: string, gradeLevel?: string, subject?: string) {
  const context = buildContext(gradeLevel, subject);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational content writer specializing in creating engaging, age-appropriate learning materials for teachers to use in their classrooms. ${context}
        
        Return a JSON object with this structure:
        {
          "title": "Content Title",
          "content": "The full educational content text",
          "vocabulary": ["key", "vocabulary", "words"],
          "discussionQuestions": ["Question 1?", "Question 2?"]
        }`
      },
      {
        role: "user",
        content: `Create educational content about: ${prompt}. Make it engaging, clear, and appropriate for the classroom.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// Activity/Game generation
async function generateActivity(prompt: string, gradeLevel?: string, subject?: string) {
  const context = buildContext(gradeLevel, subject);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational game designer specializing in creating fun, interactive learning activities for classrooms. ${context}
        
        Return a JSON object with this structure:
        {
          "title": "Activity Title",
          "type": "matching" | "quiz" | "fillInBlank" | "sorting" | "sequencing",
          "instructions": "Clear instructions for how to play/complete the activity",
          "items": [
            {
              "question": "Question or prompt",
              "answer": "Correct answer",
              "options": ["Option A", "Option B", "Option C", "Correct Answer"]
            }
          ]
        }
        
        Create 8-10 items for the activity.`
      },
      {
        role: "user",
        content: `Create a fun educational activity about: ${prompt}. Make it interactive and engaging for students.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// Storyboard generation (for animated videos)
async function generateStoryboard(prompt: string, gradeLevel?: string, subject?: string) {
  const context = buildContext(gradeLevel, subject);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational video content creator specializing in creating storyboards for animated educational videos like Cocomelon, Super Simple Songs, or Smile and Learn. ${context}
        
        Return a JSON object with this structure:
        {
          "title": "Video Title",
          "description": "Brief description of the video concept",
          "duration": "Estimated duration (e.g., '2-3 minutes')",
          "targetAge": "Target age group",
          "frames": [
            {
              "frameNumber": 1,
              "description": "What happens in this scene",
              "dialogue": "Any spoken words or song lyrics",
              "action": "Animation/movement description",
              "imagePrompt": "Detailed visual description for illustrating this frame"
            }
          ]
        }
        
        Create 8-12 frames that tell a complete educational story with a clear beginning, middle, and end. Include catchy songs or rhymes when appropriate.`
      },
      {
        role: "user",
        content: `Create a storyboard for an animated educational video about: ${prompt}. Make it fun, colorful, and engaging like popular children's educational YouTube videos.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

function buildContext(gradeLevel?: string, subject?: string): string {
  const parts = [];
  if (gradeLevel) parts.push(`Target grade level: ${gradeLevel}`);
  if (subject) parts.push(`Subject area: ${subject}`);
  return parts.length > 0 ? parts.join(". ") + "." : "";
}

function extractTitle(prompt: string): string {
  // Extract a reasonable title from the prompt
  const words = prompt.split(" ").slice(0, 6);
  return words.join(" ") + (prompt.split(" ").length > 6 ? "..." : "");
}
