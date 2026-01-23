import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (IMPORTANT for Replit Auth)
export * from "./models/auth";

// Content generation types
export const contentTypes = ["image", "presentation", "text", "activity", "storyboard", "worksheet"] as const;
export type ContentType = typeof contentTypes[number];

// Generated content table
export const generatedContent = pgTable("generated_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  prompt: text("prompt").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertGeneratedContentSchema = createInsertSchema(generatedContent).omit({
  id: true,
  createdAt: true,
});

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;

// Video options schema
export const videoOptionsSchema = z.object({
  length: z.enum(["1min", "5min", "10min", "30min"]).optional(),
  style: z.enum(["animation", "reallife"]).optional(),
  quality: z.enum(["2d", "3d", "hd", "4k"]).optional(),
});

export type VideoOptions = z.infer<typeof videoOptionsSchema>;

// Presentation options schema
export const presentationOptionsSchema = z.object({
  style: z.enum(["textAndImages", "imagesOnly", "textOnly"]).optional(),
  layout: z.enum(["single", "grid"]).optional(),
  imageStyle: z.enum(["animation", "reallife"]).optional(),
  imageQuality: z.enum(["2d", "3d", "hd", "4k"]).optional(),
  // Premium animation features
  transition: z.enum(["none", "fade", "slide", "zoom", "flip"]).optional(),
  transitionDelay: z.number().min(0).max(5).optional(),
  tapToReveal: z.boolean().optional(),
  autoPlay: z.boolean().optional(),
  autoPlayInterval: z.number().min(1).max(30).optional(),
});

export type PresentationOptions = z.infer<typeof presentationOptionsSchema>;

// Worksheet options schema
export const worksheetOptionsSchema = z.object({
  colorMode: z.enum(["colored", "blackWhite"]).optional(),
});

export type WorksheetOptions = z.infer<typeof worksheetOptionsSchema>;

// Content generation request schema
export const generateContentSchema = z.object({
  type: z.enum(contentTypes),
  prompt: z.string().min(1).max(2000),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  slideCount: z.number().min(3).max(20).optional(),
  videoOptions: videoOptionsSchema.optional(),
  presentationOptions: presentationOptionsSchema.optional(),
  worksheetOptions: worksheetOptionsSchema.optional(),
  referenceImage: z.string().optional(), // Base64 image for reference
});

export type GenerateContentRequest = z.infer<typeof generateContentSchema>;

// Presentation slide schema
export const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  notes: z.string().optional(),
  imagePrompt: z.string().optional(),
  imagePrompts: z.array(z.string()).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type Slide = z.infer<typeof slideSchema>;

// Activity/game schema
export const activitySchema = z.object({
  title: z.string(),
  instructions: z.string(),
  type: z.enum(["matching", "quiz", "fillInBlank", "sorting", "sequencing"]),
  items: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    options: z.array(z.string()).optional(),
  })),
});

export type Activity = z.infer<typeof activitySchema>;

// Storyboard frame schema
export const storyboardFrameSchema = z.object({
  frameNumber: z.number(),
  description: z.string(),
  dialogue: z.string().optional(),
  action: z.string(),
  imagePrompt: z.string(),
  image: z.string().optional(),
});

export type StoryboardFrame = z.infer<typeof storyboardFrameSchema>;

// Worksheet schema
export const worksheetSchema = z.object({
  title: z.string(),
  instructions: z.string(),
  colorMode: z.enum(["colored", "blackWhite"]),
  sections: z.array(z.object({
    type: z.enum(["header", "questions", "fillBlank", "matching", "multipleChoice", "writingPrompt", "drawing"]),
    title: z.string().optional(),
    content: z.array(z.string()),
    answers: z.array(z.string()).optional(),
  })),
});

export type Worksheet = z.infer<typeof worksheetSchema>;

// Organization/School settings schema
export const organizationSettingsSchema = z.object({
  logo: z.string().optional(), // Base64 logo image
  name: z.string().optional(),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

// File conversion request schema
export const fileConversionSchema = z.object({
  file: z.string(), // Base64 file data
  fileName: z.string(),
  fromFormat: z.string(),
  toFormat: z.enum(["pdf", "jpeg", "png"]),
});

export type FileConversionRequest = z.infer<typeof fileConversionSchema>;
