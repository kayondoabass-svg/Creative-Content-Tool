import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (IMPORTANT for Replit Auth)
export * from "./models/auth";

// Content generation types
export const contentTypes = ["image", "presentation", "text", "activity", "storyboard", "worksheet", "mindmap"] as const;
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
  length: z.enum(["30sec", "1min", "2min", "3min", "4min", "5min", "10min", "30min"]).optional(),
  style: z.enum(["animation", "reallife"]).optional(),
  quality: z.enum(["2d", "3d", "hd", "4k"]).optional(),
  language: z.enum(["en", "es", "fr", "pt", "zh", "hi", "ar", "sw", "zu", "lg", "vi"]).optional(),
});

export type VideoOptions = z.infer<typeof videoOptionsSchema>;

// Presentation options schema
export const presentationOptionsSchema = z.object({
  style: z.enum(["textAndImages", "imagesOnly", "textOnly"]).optional(),
  layout: z.enum(["single", "grid", "infographic"]).optional(),
  imageStyle: z.enum(["animation", "reallife"]).optional(),
  imageQuality: z.enum(["2d", "3d", "hd", "4k"]).optional(),
  keyPoints: z.array(z.string()).optional(),
  documentContext: z.string().optional(),
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

// Mind map options schema
export const mindmapOptionsSchema = z.object({
  branchCount: z.number().min(3).max(8).optional(),
  imageStyle: z.enum(["animation", "reallife"]).optional(),
  imageQuality: z.enum(["2d", "hd", "4k"]).optional(),
  contentStyle: z.enum(["imagesAndText", "imagesOnly", "textOnly"]).optional(),
  layoutStyle: z.enum(["radial", "sketch", "infographic", "pictureboard"]).optional(),
  referenceImages: z.array(z.string()).max(4).optional(),
});

export type MindmapOptions = z.infer<typeof mindmapOptionsSchema>;

// Image options schema (for Educational Images)
export const imageOptionsSchema = z.object({
  style: z.enum(["animation", "reallife"]).optional(),
  quality: z.enum(["2d", "3d", "hd", "4k"]).optional(),
  layout: z.enum(["single", "grid"]).optional(),
});

export type ImageOptions = z.infer<typeof imageOptionsSchema>;

// Text options schema
export const textOptionsSchema = z.object({
  style: z.enum(["story", "explanation", "poem", "dialogue"]).optional(),
});

export type TextOptions = z.infer<typeof textOptionsSchema>;

// Game type options for online interactive games
export const gameTypes = [
  "luckySpinner",      // Spin the wheel - random selection
  "mysteryBox",        // Tap to reveal grid - numbered boxes
  "memoryMatch",       // Matching pairs - flip cards
  "quickCatch",        // Whack-a-mole style - tap correct answers
  "factOrFib",         // True or false questions
  "wordHunt",          // Word search puzzle
  "letterRescue",      // Hangman style - guess letters
  "treasureChest",     // Open boxes to reveal challenges
  "letterScramble",    // Anagram - unscramble letters
  "popAndLearn",       // Balloon pop - pop to answer
  "brainBattle",       // Quiz with points and teams
  "missingPiece",      // Fill in the blank
] as const;

export type GameType = typeof gameTypes[number];

// Activity options schema
export const activityOptionsSchema = z.object({
  gameType: z.enum(gameTypes).optional(),
});

export type ActivityOptions = z.infer<typeof activityOptionsSchema>;

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
  imageOptions: imageOptionsSchema.optional(),
  textOptions: textOptionsSchema.optional(),
  activityOptions: activityOptionsSchema.optional(),
  mindmapOptions: mindmapOptionsSchema.optional(),
  includeLogo: z.boolean().optional(),
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
  // Infographic fields
  infographicType: z.enum(["table", "stats", "facts", "comparison"]).optional(),
  tableHeaders: z.array(z.string()).optional(),
  tableRows: z.array(z.array(z.string())).optional(),
  stats: z.array(z.object({ value: z.string(), label: z.string(), color: z.string().optional() })).optional(),
  facts: z.array(z.object({ title: z.string(), text: z.string() })).optional(),
  compLeft: z.string().optional(),
  compRight: z.string().optional(),
  compLeftItems: z.array(z.string()).optional(),
  compRightItems: z.array(z.string()).optional(),
});

export type Slide = z.infer<typeof slideSchema>;

// Online game schema - supports all 12 game types
export const activitySchema = z.object({
  title: z.string(),
  gameType: z.enum(gameTypes),
  gameName: z.string().optional(),
  instructions: z.string(),
  teamMode: z.enum(["individual", "teams", "class"]).optional(),
  estimatedTime: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  // Game-specific content fields (varies by gameType)
  wheelSegments: z.array(z.any()).optional(),
  boxes: z.array(z.any()).optional(),
  chests: z.array(z.any()).optional(),
  pairs: z.array(z.any()).optional(),
  targets: z.array(z.any()).optional(),
  statements: z.array(z.any()).optional(),
  words: z.union([z.array(z.string()), z.array(z.any())]).optional(),
  scrambles: z.array(z.any()).optional(),
  balloons: z.array(z.any()).optional(),
  questions: z.array(z.any()).optional(),
  sentences: z.array(z.any()).optional(),
  hints: z.array(z.any()).optional(),
  gridSize: z.number().optional(),
  question: z.string().optional(),
  options: z.object({ gameType: z.string() }).optional(),
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

// Owner video settings schema (for watermark control)
export const ownerVideoSettingsSchema = z.object({
  showWatermark: z.boolean().default(true), // Show watermark on free tier videos
  watermarkPosition: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("top-right"),
  showEndLogo: z.boolean().default(true), // Always show BrightBoard logo at end of videos
});

export type OwnerVideoSettings = z.infer<typeof ownerVideoSettingsSchema>;

// File conversion request schema
export const fileConversionSchema = z.object({
  file: z.string(), // Base64 file data
  fileName: z.string(),
  fromFormat: z.string(),
  toFormat: z.enum(["pdf", "jpeg", "png"]),
});

export type FileConversionRequest = z.infer<typeof fileConversionSchema>;

// Video export request schema
export const videoExportSchema = z.object({
  content: z.string(),
  includeNarration: z.boolean().optional().default(false),
  includeMusic: z.boolean().optional().default(false),
  includeSubtitles: z.boolean().optional().default(false),
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional().default("nova"),
});

export type VideoExportRequest = z.infer<typeof videoExportSchema>;

// ========== PAYMENTS TRACKING ==========

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  orderId: varchar("order_id").notNull(),
  pesapalTrackingId: varchar("pesapal_tracking_id"),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("UGX").notNull(),
  tier: varchar("tier").notNull(),
  status: varchar("status").default("pending").notNull(),
  paymentMethod: varchar("payment_method"),
  confirmationCode: varchar("confirmation_code"),
  receiptSentAt: timestamp("receipt_sent_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// ========== OWNER EXPENSES TRACKING ==========

// Expense categories
export const expenseCategories = [
  "openai",           // OpenAI API costs (automatic)
  "resend",           // Resend email costs (automatic)
  "replit",           // Replit subscription
  "cloudflare",       // Cloudflare DNS/CDN
  "amazon",           // Amazon/AWS services
  "paddle",           // Paddle transaction fees
  "tiktok_ads",       // TikTok advertising
  "meta_ads",         // Facebook/Instagram ads
  "google_ads",       // Google Ads
  "domain",           // Domain registration
  "other",            // Other expenses
] as const;

export type ExpenseCategory = typeof expenseCategories[number];

// Expense entry table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  date: timestamp("date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  isAutomatic: boolean("is_automatic").default(false).notNull(), // Auto-tracked vs manual entry
  metadata: text("metadata"), // JSON string for extra data (e.g., token counts, email counts)
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Expense summary by category
export const expenseSummarySchema = z.object({
  category: z.enum(expenseCategories),
  totalAmount: z.number(),
  count: z.number(),
});

export type ExpenseSummary = z.infer<typeof expenseSummarySchema>;
