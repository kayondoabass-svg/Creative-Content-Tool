import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContentSchema, fileConversionSchema, organizationSettingsSchema, type ContentType, type Slide, type Activity, type StoryboardFrame, type VideoOptions, type PresentationOptions, type WorksheetOptions } from "@shared/schema";
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

  // Worksheet to PDF
  app.post("/api/worksheet-to-pdf", async (req, res) => {
    try {
      const { content } = req.body;
      const data = JSON.parse(content);
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let page = pdfDoc.addPage([612, 792]); // US Letter size
      const { width, height } = page.getSize();
      const margin = 50;
      let yPosition = height - margin;
      const lineHeight = 16;
      
      // Title
      page.drawText(data.title || "Worksheet", {
        x: margin,
        y: yPosition,
        size: 20,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.4),
      });
      yPosition -= 30;
      
      // Instructions
      if (data.instructions) {
        const instructionLines = wrapText(data.instructions, font, 11, width - margin * 2);
        for (const line of instructionLines) {
          if (yPosition < margin + 50) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = height - margin;
          }
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
          yPosition -= lineHeight;
        }
        yPosition -= 10;
      }
      
      // Sections
      for (const section of data.sections || []) {
        if (yPosition < margin + 100) {
          page = pdfDoc.addPage([612, 792]);
          yPosition = height - margin;
        }
        
        // Section title
        if (section.title) {
          page.drawText(section.title, {
            x: margin,
            y: yPosition,
            size: 14,
            font: boldFont,
            color: rgb(0.3, 0.2, 0.5),
          });
          yPosition -= 22;
        }
        
        // Content items
        for (let i = 0; i < (section.content || []).length; i++) {
          if (yPosition < margin + 30) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = height - margin;
          }
          
          const item = section.content[i];
          const numberedItem = `${i + 1}. ${item}`;
          const itemLines = wrapText(numberedItem, font, 11, width - margin * 2 - 10);
          
          for (const line of itemLines) {
            page.drawText(line, {
              x: margin + 10,
              y: yPosition,
              size: 11,
              font,
            });
            yPosition -= lineHeight;
          }
          
          // Add writing lines for writing prompts
          if (section.type === "writingPrompt" || section.type === "drawing") {
            for (let j = 0; j < 3; j++) {
              yPosition -= 5;
              page.drawLine({
                start: { x: margin + 10, y: yPosition },
                end: { x: width - margin, y: yPosition },
                thickness: 0.5,
                color: rgb(0.7, 0.7, 0.7),
              });
              yPosition -= lineHeight;
            }
          }
          
          yPosition -= 4;
        }
        
        yPosition -= 10;
      }
      
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
      
      res.json({
        file: `data:application/pdf;base64,${pdfBase64}`,
        fileName: `${data.title || "worksheet"}.pdf`,
      });
    } catch (error) {
      console.error("Error creating worksheet PDF:", error);
      res.status(500).json({ error: "Failed to create PDF" });
    }
  });

  // Worksheet to Image
  app.post("/api/worksheet-to-image", async (req, res) => {
    try {
      const { content } = req.body;
      const data = JSON.parse(content);
      
      // Create an SVG representation of the worksheet
      const svgWidth = 800;
      const svgHeight = 1200;
      const margin = 40;
      const lineHeight = 22;
      let yPos = margin + 30;
      
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">`;
      svgContent += `<rect width="100%" height="100%" fill="white"/>`;
      
      // Title
      svgContent += `<text x="${margin}" y="${yPos}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333366">${escapeXml(data.title || "Worksheet")}</text>`;
      yPos += 35;
      
      // Instructions
      if (data.instructions) {
        svgContent += `<text x="${margin}" y="${yPos}" font-family="Arial, sans-serif" font-size="12" fill="#666666">${escapeXml(data.instructions)}</text>`;
        yPos += 25;
      }
      
      // Sections
      for (const section of data.sections || []) {
        if (section.title) {
          yPos += 10;
          svgContent += `<text x="${margin}" y="${yPos}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#663399">${escapeXml(section.title)}</text>`;
          yPos += lineHeight;
        }
        
        for (let i = 0; i < (section.content || []).length; i++) {
          const item = section.content[i];
          svgContent += `<text x="${margin + 10}" y="${yPos}" font-family="Arial, sans-serif" font-size="12" fill="#333333">${i + 1}. ${escapeXml(item)}</text>`;
          yPos += lineHeight;
          
          if (section.type === "writingPrompt" || section.type === "drawing") {
            for (let j = 0; j < 2; j++) {
              svgContent += `<line x1="${margin + 10}" y1="${yPos}" x2="${svgWidth - margin}" y2="${yPos}" stroke="#cccccc" stroke-width="1"/>`;
              yPos += lineHeight - 2;
            }
          }
        }
        yPos += 10;
      }
      
      svgContent += `</svg>`;
      
      // Convert SVG to PNG then to JPEG
      const svgBuffer = Buffer.from(svgContent);
      const jpegBuffer = await sharp(svgBuffer)
        .resize(svgWidth, svgHeight, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const jpegBase64 = jpegBuffer.toString("base64");
      
      res.json({
        file: `data:image/jpeg;base64,${jpegBase64}`,
        fileName: `${data.title || "worksheet"}.jpg`,
      });
    } catch (error) {
      console.error("Error creating worksheet image:", error);
      res.status(500).json({ error: "Failed to create image" });
    }
  });

  // Generate content
  app.post("/api/generate", async (req, res) => {
    try {
      const validatedData = generateContentSchema.parse(req.body);
      let { type, prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage } = validatedData;
      
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

        case "worksheet":
          const worksheetResult = await generateWorksheet(prompt, gradeLevel, subject, worksheetOptions);
          generatedContent = JSON.stringify(worksheetResult);
          title = worksheetResult.title;
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

// Worksheet generation
async function generateWorksheet(prompt: string, gradeLevel?: string, subject?: string, options?: WorksheetOptions) {
  const context = buildContext(gradeLevel, subject);
  const colorMode = options?.colorMode || "colored";
  
  const colorInstructions = colorMode === "blackWhite" 
    ? "Design for black and white printing. Use clear borders, no background colors, high contrast elements."
    : "Use colorful, engaging design with colored backgrounds, borders, and visual elements.";
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational worksheet creator. Create engaging, printable worksheets for teachers. ${context}
        
        ${colorInstructions}
        
        Return a JSON object with this exact structure:
        {
          "title": "Worksheet Title",
          "instructions": "Clear instructions for students",
          "colorMode": "${colorMode}",
          "sections": [
            {
              "type": "header|questions|fillBlank|matching|multipleChoice|writingPrompt|drawing",
              "title": "Section Title (optional)",
              "content": ["Question or prompt 1", "Question or prompt 2", ...],
              "answers": ["Answer 1", "Answer 2", ...] (optional, for teacher's key)
            }
          ]
        }
        
        Include a variety of section types for an engaging worksheet. Create 4-8 sections with 3-6 items each.
        For multipleChoice, format each content item as: "Question? A) option B) option C) option D) option"
        For matching, use "Left item -> Right item" format in answers.
        For fillBlank, use underscores like "The ___ is blue" in content.`
      },
      {
        role: "user",
        content: `Create an educational worksheet about: ${prompt}. Make it appropriate, engaging, and classroom-ready.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4000,
  });

  const jsonContent = response.choices[0]?.message?.content || "{}";
  const worksheetData = JSON.parse(jsonContent);
  
  return worksheetData;
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

// Helper function to wrap text for PDF
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
