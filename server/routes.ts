import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContentSchema, type ContentType, type Slide, type Activity, type StoryboardFrame, type VideoOptions } from "@shared/schema";
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
      const { type, prompt, gradeLevel, subject, slideCount, videoOptions } = validatedData;

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
          const storyboardResult = await generateStoryboard(prompt, gradeLevel, subject, videoOptions);
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
  const presentationData = JSON.parse(content);
  
  // Generate images for each slide
  const slidesWithImages = await Promise.all(
    presentationData.slides.map(async (slide: Slide) => {
      if (slide.imagePrompt) {
        try {
          const imageResponse = await openai.images.generate({
            model: "gpt-image-1",
            prompt: `Educational illustration for children: ${slide.imagePrompt}. Colorful, child-friendly, educational style, suitable for classroom presentation.`,
            n: 1,
            size: "1024x1024",
          });
          
          const imageData = imageResponse.data?.[0]?.b64_json;
          if (imageData) {
            slide.image = `data:image/png;base64,${imageData}`;
          }
        } catch (error) {
          console.error("Failed to generate image for slide:", error);
        }
      }
      return slide;
    })
  );
  
  presentationData.slides = slidesWithImages;
  return presentationData;
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
async function generateStoryboard(prompt: string, gradeLevel?: string, subject?: string, videoOptions?: VideoOptions) {
  const context = buildContext(gradeLevel, subject);
  
  // Parse video options
  const length = videoOptions?.length || "5min";
  const style = videoOptions?.style || "animation";
  const quality = videoOptions?.quality || "hd";
  
  // Determine frame count based on length
  const frameCount = {
    "1min": 6,
    "5min": 15,
    "10min": 25,
    "30min": 50,
  }[length] || 15;
  
  const styleDescription = style === "animation" 
    ? "colorful 2D/3D animated style like Cocomelon, Super Simple Songs, or Pixar" 
    : "real-life footage with actors, props, and real environments like educational documentaries";
  
  const qualityDescription = {
    "2d": "flat 2D animation with bold outlines and bright colors",
    "3d": "3D rendered CGI animation with depth and lighting",
    "hd": "high-definition 1080p quality",
    "4k": "ultra high-definition 4K cinematic quality",
  }[quality] || "high-definition quality";
  
  const durationText = {
    "1min": "1 minute",
    "5min": "5 minutes",
    "10min": "10 minutes",
    "30min": "30 minutes",
  }[length] || "5 minutes";
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational video content creator specializing in creating storyboards for ${styleDescription}. ${context}
        
        Video specifications:
        - Duration: ${durationText}
        - Style: ${style === "animation" ? "Animated" : "Real-life/Live-action"}
        - Quality: ${qualityDescription}
        
        Return a JSON object with this structure:
        {
          "title": "Video Title",
          "description": "Brief description of the video concept",
          "duration": "${durationText}",
          "style": "${style === "animation" ? "Animation" : "Real Life"}",
          "quality": "${quality.toUpperCase()}",
          "targetAge": "Target age group",
          "frames": [
            {
              "frameNumber": 1,
              "description": "What happens in this scene",
              "dialogue": "Any spoken words or song lyrics",
              "action": "Animation/movement description",
              "imagePrompt": "Detailed visual description for illustrating this frame in ${styleDescription} with ${qualityDescription}"
            }
          ]
        }
        
        Create exactly ${frameCount} frames that tell a complete educational story with a clear beginning, middle, and end. Include catchy songs or rhymes when appropriate for animated content, or educational narration for real-life content.`
      },
      {
        role: "user",
        content: `Create a ${durationText} ${style === "animation" ? "animated" : "real-life"} educational video storyboard about: ${prompt}. Use ${qualityDescription}. Make it engaging like popular children's educational YouTube videos.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 6000,
  });

  const jsonContent = response.choices[0]?.message?.content || "{}";
  const storyboardData = JSON.parse(jsonContent);
  
  // Generate images for each frame (limit to first 6 for performance)
  const framesToGenerate = storyboardData.frames?.slice(0, 6) || [];
  const framesWithImages = await Promise.all(
    framesToGenerate.map(async (frame: StoryboardFrame & { image?: string }) => {
      if (frame.imagePrompt) {
        try {
          const stylePrompt = style === "reallife" 
            ? "Photorealistic, educational photography style"
            : "Colorful animated style like Pixar or Cocomelon";
          
          const imageResponse = await openai.images.generate({
            model: "gpt-image-1",
            prompt: `${stylePrompt}: ${frame.imagePrompt}. Child-friendly, educational, vibrant colors.`,
            n: 1,
            size: "1024x1024",
          });
          
          const imageData = imageResponse.data?.[0]?.b64_json;
          if (imageData) {
            frame.image = `data:image/png;base64,${imageData}`;
          }
        } catch (error) {
          console.error("Failed to generate image for frame:", error);
        }
      }
      return frame;
    })
  );
  
  // Merge the frames with images back into the full frames list
  storyboardData.frames = [
    ...framesWithImages,
    ...(storyboardData.frames?.slice(6) || [])
  ];
  
  return storyboardData;
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
