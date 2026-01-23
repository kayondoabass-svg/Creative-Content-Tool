import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table (basic)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Content generation types
export const contentTypes = ["image", "presentation", "text", "activity", "storyboard"] as const;
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

// Content generation request schema
export const generateContentSchema = z.object({
  type: z.enum(contentTypes),
  prompt: z.string().min(1).max(2000),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
});

export type GenerateContentRequest = z.infer<typeof generateContentSchema>;

// Presentation slide schema
export const slideSchema = z.object({
  title: z.string(),
  content: z.array(z.string()),
  notes: z.string().optional(),
  imagePrompt: z.string().optional(),
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
});

export type StoryboardFrame = z.infer<typeof storyboardFrameSchema>;
