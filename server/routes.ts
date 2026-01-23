import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContentSchema, fileConversionSchema, organizationSettingsSchema, type ContentType, type Slide, type Activity, type StoryboardFrame, type VideoOptions, type PresentationOptions } from "@shared/schema";
import OpenAI from "openai";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

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

  // Get organization settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getOrganizationSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update organization settings (logo, name)
  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = organizationSettingsSchema.partial().parse(req.body);
      
      // Validate logo if provided
      if (validatedData.logo) {
        const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
        if (!dataUrlPattern.test(validatedData.logo)) {
          return res.status(400).json({ error: "Invalid logo format. Please upload a PNG, JPEG, GIF, WebP, or SVG image." });
        }
        // Base64 is ~4/3 the size of the original, so 10MB base64 = ~7.5MB file
        if (validatedData.logo.length > 10 * 1024 * 1024) {
          return res.status(400).json({ error: "Logo too large. Please use an image under 7MB." });
        }
      }
      
      const settings = await storage.updateOrganizationSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Generate logo using AI
  app.post("/api/generate-logo", async (req, res) => {
    try {
      const { name, style } = req.body;
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Please provide an organization name" });
      }
      
      const stylePrompt = style || "modern, professional";
      
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `Create a simple, clean logo for "${name}". Style: ${stylePrompt}. The logo should be suitable for an educational institution or school. Use a clean white or transparent background. Make it minimalist and memorable.`,
        n: 1,
        size: "1024x1024",
      });
      
      const imageData = response.data?.[0]?.b64_json;
      if (!imageData) {
        return res.status(500).json({ error: "Failed to generate logo" });
      }
      
      res.json({ logo: `data:image/png;base64,${imageData}` });
    } catch (error) {
      console.error("Error generating logo:", error);
      res.status(500).json({ error: "Failed to generate logo" });
    }
  });

  // File conversion endpoint
  app.post("/api/convert", async (req, res) => {
    try {
      const validatedData = fileConversionSchema.parse(req.body);
      const { file, fileName, fromFormat, toFormat } = validatedData;
      
      // Size limit for file conversion (20MB)
      if (file.length > 30 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large. Please use a file under 20MB." });
      }
      
      // Extract base64 data
      const base64Match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: "Invalid file format" });
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      let convertedData: string;
      let outputMimeType: string;
      
      // Handle conversions
      if (toFormat === "pdf") {
        // Convert to PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4 size
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        if (mimeType.startsWith("image/")) {
          // Embed image in PDF
          let image;
          if (mimeType === "image/png") {
            image = await pdfDoc.embedPng(buffer);
          } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
            image = await pdfDoc.embedJpg(buffer);
          } else {
            // Convert to PNG first using sharp
            const pngBuffer = await sharp(buffer).png().toBuffer();
            image = await pdfDoc.embedPng(pngBuffer);
          }
          
          const { width, height } = image.scale(1);
          const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
          const scaledWidth = width * scale;
          const scaledHeight = height * scale;
          
          page.drawImage(image, {
            x: (page.getWidth() - scaledWidth) / 2,
            y: (page.getHeight() - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else if (mimeType === "text/plain" || mimeType.includes("text")) {
          // Text to PDF
          const text = buffer.toString("utf-8");
          const lines = text.split("\n");
          let y = page.getHeight() - 50;
          
          for (const line of lines) {
            if (y < 50) {
              const newPage = pdfDoc.addPage([595, 842]);
              y = newPage.getHeight() - 50;
            }
            page.drawText(line.substring(0, 80), {
              x: 50,
              y,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
            y -= 16;
          }
        }
        
        const pdfBytes = await pdfDoc.save();
        convertedData = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
        outputMimeType = "application/pdf";
      } else if (toFormat === "jpeg" || toFormat === "png") {
        // Image conversion using sharp
        if (!mimeType.startsWith("image/")) {
          return res.status(400).json({ error: "Can only convert images to JPEG/PNG format" });
        }
        
        let outputBuffer;
        if (toFormat === "jpeg") {
          outputBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
          outputMimeType = "image/jpeg";
        } else {
          outputBuffer = await sharp(buffer).png().toBuffer();
          outputMimeType = "image/png";
        }
        
        convertedData = `data:${outputMimeType};base64,${outputBuffer.toString("base64")}`;
      } else {
        return res.status(400).json({ error: `Conversion to ${toFormat} is not yet supported` });
      }
      
      const outputFileName = fileName.replace(/\.[^.]+$/, `.${toFormat}`);
      
      res.json({
        file: convertedData,
        fileName: outputFileName,
        mimeType: outputMimeType,
      });
    } catch (error) {
      console.error("Error converting file:", error);
      res.status(500).json({ error: "Failed to convert file" });
    }
  });

  // Generate content
  app.post("/api/generate", async (req, res) => {
    try {
      const validatedData = generateContentSchema.parse(req.body);
      let { type, prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, referenceImage } = validatedData;
      
      // Validate referenceImage if provided
      if (referenceImage) {
        // Check that it's a valid data URL with image MIME type
        const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
        if (!dataUrlPattern.test(referenceImage)) {
          return res.status(400).json({ error: "Invalid image format. Please upload a PNG, JPEG, GIF, or WebP image." });
        }
        // Limit size to ~10MB base64 (roughly 13.3MB encoded)
        if (referenceImage.length > 15 * 1024 * 1024) {
          return res.status(400).json({ error: "Image too large. Please use an image under 10MB." });
        }
      }

      let generatedContent: string;
      let title: string;

      switch (type) {
        case "image":
          const imageResult = await generateImage(prompt, gradeLevel, subject);
          generatedContent = JSON.stringify(imageResult);
          title = imageResult.title;
          break;

        case "presentation":
          const presentationResult = await generatePresentation(prompt, gradeLevel, subject, slideCount, presentationOptions, referenceImage);
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
async function generatePresentation(prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, options?: PresentationOptions, referenceImage?: string) {
  const context = buildContext(gradeLevel, subject);
  const numSlides = slideCount || 6;
  const style = options?.style || "textAndImages";
  const layout = options?.layout || "single";
  
  // Determine number of images per slide based on layout
  const imagesPerSlide = layout === "grid" ? 4 : 1;
  
  // Build content instructions based on style
  let contentInstructions = "";
  if (style === "textOnly") {
    contentInstructions = "Each slide should have a title, 3-5 bullet points, and speaker notes. No images needed.";
  } else if (style === "imagesOnly") {
    contentInstructions = `Each slide should have only a title and ${imagesPerSlide} detailed image description(s). No bullet points - the images tell the story. Include speaker notes for the teacher.`;
  } else {
    contentInstructions = `Each slide should have a title, 2-3 brief bullet points, and ${imagesPerSlide} image description(s). Keep text minimal - let visuals do the work.`;
  }
  
  const slideStructure = style === "imagesOnly" 
    ? `{
        "title": "Slide Title",
        "content": [],
        "notes": "Speaker notes for the teacher",
        "imagePrompts": ["Detailed description of image 1"${layout === "grid" ? ', "Image 2", "Image 3", "Image 4"' : ''}]
      }`
    : `{
        "title": "Slide Title",
        "content": ["Bullet point 1", "Bullet point 2"],
        "notes": "Speaker notes for the teacher",
        "imagePrompts": ["Detailed description of image"${layout === "grid" ? ', "Image 2", "Image 3", "Image 4"' : ''}]
      }`;
  
  // Build user message - include reference image if provided
  let userMessage: any = `Create an engaging educational presentation about: ${prompt}. Create exactly ${numSlides} slides.`;
  
  if (referenceImage) {
    userMessage = [
      {
        type: "text",
        text: `Analyze this image of a lesson or educational material and create an engaging presentation based on its content and visual style. The user's additional instructions: ${prompt}. Create exactly ${numSlides} slides that match the topic and teaching approach shown in the image.`
      },
      {
        type: "image_url",
        image_url: {
          url: referenceImage,
          detail: "high"
        }
      }
    ];
  }
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational content creator specializing in engaging presentations for teachers. ${referenceImage ? "Analyze the provided reference image to understand the lesson content, visual style, and teaching approach. Create a presentation that matches and expands on what you see." : "Create presentations that are age-appropriate, visually describable, and include interactive elements."} ${context}
        
        Return a JSON object with this exact structure:
        {
          "title": "Presentation Title",
          "style": "${style}",
          "layout": "${layout}",
          "slides": [
            ${slideStructure}
          ]
        }
        
        ${contentInstructions}
        IMPORTANT: Create exactly ${numSlides} slides.`
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const presentationData = JSON.parse(content);
  
  // Store options in the result
  presentationData.style = style;
  presentationData.layout = layout;
  
  // Skip image generation for text-only style
  if (style === "textOnly") {
    return presentationData;
  }
  
  // Generate images for each slide
  const slidesWithImages = await Promise.all(
    presentationData.slides.map(async (slide: Slide & { imagePrompts?: string[], images?: string[] }) => {
      const prompts = slide.imagePrompts || (slide.imagePrompt ? [slide.imagePrompt] : []);
      
      if (prompts.length > 0) {
        const images: string[] = [];
        
        // Generate images (limit based on layout)
        const promptsToGenerate = prompts.slice(0, imagesPerSlide);
        
        for (const imgPrompt of promptsToGenerate) {
          try {
            const imageResponse = await openai.images.generate({
              model: "gpt-image-1",
              prompt: `Educational illustration for children: ${imgPrompt}. Colorful, child-friendly, educational style, suitable for classroom presentation.`,
              n: 1,
              size: "1024x1024",
            });
            
            const imageData = imageResponse.data?.[0]?.b64_json;
            if (imageData) {
              images.push(`data:image/png;base64,${imageData}`);
            }
          } catch (error) {
            console.error("Failed to generate image for slide:", error);
          }
        }
        
        // Store images array for grid layout, or single image for single layout
        if (layout === "grid") {
          slide.images = images;
        } else if (images.length > 0) {
          slide.image = images[0];
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
