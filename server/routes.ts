import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContentSchema, fileConversionSchema, organizationSettingsSchema, videoExportSchema, type ContentType, type Slide, type Activity, type StoryboardFrame, type VideoOptions, type PresentationOptions, type WorksheetOptions, type ImageOptions, type TextOptions, type ActivityOptions } from "@shared/schema";
import OpenAI from "openai";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { generateVideoFromStoryboard } from "./videoService";

// Custom authentication middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}
import * as paddleService from "./paddleService";
import crypto from "crypto";
import * as customAuth from "./customAuthService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ========== CUSTOM AUTHENTICATION ROUTES ==========
  
  // Sign up with email/password
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName, recaptchaToken } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const result = await customAuth.signUp(email, password, firstName, lastName, recaptchaToken);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message, userId: result.userId });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to sign up" });
    }
  });

  // Verify email with code
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }
      
      const result = await customAuth.verifyEmail(email, code);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend verification code
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const result = await customAuth.resendVerificationCode(email);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Resend code error:", error);
      res.status(500).json({ error: "Failed to resend code" });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const result = await customAuth.login(email, password);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Store user in session
      (req as any).session.userId = result.user.id;
      (req as any).session.user = result.user;
      
      res.json({ user: result.user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      
      if (!userId) {
        return res.json({ user: null });
      }
      
      const user = await customAuth.getUserById(userId);
      
      if (!user) {
        return res.json({ user: null });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const result = await customAuth.requestPasswordReset(email);
      res.json({ message: result.message });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to request password reset" });
    }
  });

  // Reset password with code
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const result = await customAuth.resetPassword(email, code, newPassword);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get reCAPTCHA site key (for frontend)
  app.get("/api/auth/recaptcha-key", async (req, res) => {
    res.json({ siteKey: process.env.RECAPTCHA_SITE_KEY || null });
  });

  // Emergency CEO account delete (for fresh start)
  app.post("/api/auth/emergency-delete", async (req, res) => {
    try {
      const { email, adminKey } = req.body;
      const CEO_EMAIL = "kayondoabass@gmail.com";
      const ADMIN_KEY = process.env.ADMIN_RESET_KEY || "brightboard-emergency-2026";
      
      if (email?.toLowerCase() !== CEO_EMAIL) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (adminKey !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
      }
      
      const result = await customAuth.deleteUser(email);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: "Account deleted. You can now sign up fresh." });
    } catch (error) {
      console.error("Emergency delete error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Emergency CEO password reset (for bootstrapping when email isn't configured)
  app.post("/api/auth/emergency-reset", async (req, res) => {
    try {
      const { email, newPassword, adminKey } = req.body;
      const CEO_EMAIL = "kayondoabass@gmail.com";
      const ADMIN_KEY = process.env.ADMIN_RESET_KEY || "brightboard-emergency-2026";
      
      // Only allow for CEO email with correct admin key
      if (email?.toLowerCase() !== CEO_EMAIL) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (adminKey !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
      }
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const result = await customAuth.emergencyPasswordReset(email, newPassword);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
      console.error("Emergency reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // ========== END CUSTOM AUTH ROUTES ==========

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
      const { name, style, colors, colorScheme } = req.body;
      
      // Check authentication - premium feature only
      const sessionUserId = (req as any).session?.userId;
      const sessionUser = (req as any).session?.user;
      if (!sessionUserId) {
        return res.status(401).json({ error: "Please sign in to generate logos" });
      }
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = sessionUser?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      
      // Check subscription status - premium feature (CEO gets bypass)
      if (!isCEO) {
        const subscriptionStatus = await stripeService.getSubscriptionStatus(sessionUserId);
        if (!subscriptionStatus.isPremium) {
          return res.status(403).json({ 
            error: "Logo generation is a premium feature. Upgrade to access this feature!",
            requiresPremium: true
          });
        }
      }
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Please provide an organization name" });
      }
      
      const stylePrompt = style || "Modern & Clean";
      const colorPrompt = colors || "vibrant professional colors";
      
      // Premium quality logo variations with different design approaches
      const variations = [
        { name: "Icon + Text", desc: "distinctive icon symbol with the name in elegant typography below" },
        { name: "Lettermark", desc: "creative monogram using the initials with artistic styling" },
        { name: "Emblem", desc: "circular or shield-shaped emblem with the name integrated" },
        { name: "Wordmark", desc: "stylized text-only logo with unique custom lettering" },
        { name: "Mascot", desc: "friendly character or mascot representing education and learning" },
      ];
      
      const logoPromises = variations.map((variation, i) => {
        const prompt = `Create a PREMIUM, PROFESSIONAL logo design for "${name}" - an educational institution.

DESIGN TYPE: ${variation.name} - ${variation.desc}
STYLE: ${stylePrompt} - high-end, polished, suitable for a top-tier school
COLORS: Use ${colorPrompt} as the primary palette
QUALITY: Award-winning logo design quality, vector-style crispness, perfect symmetry

Requirements:
- Clean white or very light background
- High contrast for excellent readability
- Scalable design that works at any size
- Timeless and memorable
- Educational/academic feel
- Professional enough for letterheads, uniforms, and signage

This should look like it was designed by a world-class branding agency. Make it distinctive, elegant, and instantly recognizable.`;

        return openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
        });
      });
      
      const responses = await Promise.all(logoPromises);
      const logos = responses
        .map(r => r.data?.[0]?.b64_json)
        .filter(Boolean)
        .map(data => `data:image/png;base64,${data}`);
      
      if (logos.length === 0) {
        return res.status(500).json({ error: "Failed to generate logos" });
      }
      
      res.json({ 
        logos, 
        variations: variations.map(v => v.name)
      });
    } catch (error) {
      console.error("Error generating logos:", error);
      res.status(500).json({ error: "Failed to generate logos" });
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

  // ========== FILE TOOLS ENDPOINTS ==========
  
  // Helper to check if user has premium subscription
  async function checkPremiumStatus(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    try {
      const user = await storage.getUser(userId);
      if (!user?.email) return false;
      
      // Check Paddle subscription
      const paddleApiKey = process.env.PADDLE_API_KEY;
      if (paddleApiKey) {
        const response = await fetch("https://api.paddle.com/subscriptions", {
          headers: {
            "Authorization": `Bearer ${paddleApiKey}`,
            "Content-Type": "application/json"
          }
        });
        if (response.ok) {
          const data = await response.json();
          const activeSubscription = data.data?.find((sub: any) => 
            sub.status === "active" && 
            sub.custom_data?.user_id === userId
          );
          if (activeSubscription) return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking premium status:", error);
      return false;
    }
  }
  
  // File conversion with watermark support
  app.post("/api/file-tools/convert", async (req, res) => {
    try {
      const { file, fileName, fromFormat, toFormat } = req.body;
      
      if (!file || !fileName) {
        return res.status(400).json({ error: "File and filename are required" });
      }
      
      // Server-side subscription check for watermark
      const userId = (req.session as any)?.userId;
      const isPremium = await checkPremiumStatus(userId);
      const addWatermark = !isPremium;
      
      const base64Match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: "Invalid file format" });
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      let buffer = Buffer.from(base64Data, "base64");
      
      let outputBuffer: Buffer;
      let outputMimeType: string;
      let outputExtension: string;
      
      if (toFormat === "pdf") {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        
        if (mimeType.startsWith("image/")) {
          let image;
          if (mimeType === "image/png") {
            image = await pdfDoc.embedPng(buffer);
          } else {
            const pngBuffer = await sharp(buffer).png().toBuffer();
            image = await pdfDoc.embedPng(pngBuffer);
          }
          
          const { width, height } = image.scale(1);
          const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
          page.drawImage(image, {
            x: (page.getWidth() - width * scale) / 2,
            y: (page.getHeight() - height * scale) / 2,
            width: width * scale,
            height: height * scale,
          });
        }
        
        // Add watermark for free users
        if (addWatermark) {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          page.drawText("Made with BrightBoard", {
            x: 20,
            y: 20,
            size: 10,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
        }
        
        outputBuffer = Buffer.from(await pdfDoc.save());
        outputMimeType = "application/pdf";
        outputExtension = "pdf";
      } else if (toFormat === "jpg" || toFormat === "jpeg") {
        // Only support image-to-image conversion (PDF to image not supported without additional libraries)
        if (mimeType === "application/pdf") {
          return res.status(400).json({ error: "PDF to image conversion is not supported. Please use an online PDF converter for this feature." });
        }
        
        let sharpInstance = sharp(buffer).jpeg({ quality: 85 });
        
        if (addWatermark) {
          const metadata = await sharp(buffer).metadata();
          const watermarkSvg = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <text x="20" y="${(metadata.height || 100) - 20}" font-family="Arial" font-size="16" fill="rgba(128,128,128,0.7)">Made with BrightBoard</text>
            </svg>
          `);
          sharpInstance = sharpInstance.composite([{ input: watermarkSvg, gravity: 'southwest' }]);
        }
        
        outputBuffer = await sharpInstance.toBuffer();
        outputMimeType = "image/jpeg";
        outputExtension = "jpg";
      } else if (toFormat === "png") {
        // Only support image-to-image conversion
        if (mimeType === "application/pdf") {
          return res.status(400).json({ error: "PDF to image conversion is not supported. Please use an online PDF converter for this feature." });
        }
        
        let sharpInstance = sharp(buffer).png();
        
        if (addWatermark) {
          const metadata = await sharp(buffer).metadata();
          const watermarkSvg = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <text x="20" y="${(metadata.height || 100) - 20}" font-family="Arial" font-size="16" fill="rgba(128,128,128,0.7)">Made with BrightBoard</text>
            </svg>
          `);
          sharpInstance = sharpInstance.composite([{ input: watermarkSvg, gravity: 'southwest' }]);
        }
        
        outputBuffer = await sharpInstance.toBuffer();
        outputMimeType = "image/png";
        outputExtension = "png";
      } else {
        return res.status(400).json({ error: "Unsupported output format" });
      }
      
      res.setHeader("Content-Type", outputMimeType);
      res.setHeader("Content-Disposition", `attachment; filename="converted.${outputExtension}"`);
      res.send(outputBuffer);
    } catch (error) {
      console.error("Error converting file:", error);
      res.status(500).json({ error: "Failed to convert file" });
    }
  });

  // Merge PDFs
  app.post("/api/file-tools/merge", async (req, res) => {
    try {
      const { files } = req.body;
      
      if (!files || files.length < 2) {
        return res.status(400).json({ error: "At least 2 files are required" });
      }
      
      // Server-side subscription check for watermark
      const userId = (req.session as any)?.userId;
      const isPremium = await checkPremiumStatus(userId);
      const addWatermark = !isPremium;
      
      const mergedPdf = await PDFDocument.create();
      
      for (const fileData of files) {
        const base64Match = fileData.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) continue;
        
        const buffer = Buffer.from(base64Match[2], "base64");
        
        try {
          const sourcePdf = await PDFDocument.load(buffer);
          const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
        } catch (e) {
          // If it's an image, convert to PDF page
          try {
            const page = mergedPdf.addPage([595, 842]);
            const pngBuffer = await sharp(buffer).png().toBuffer();
            const image = await mergedPdf.embedPng(pngBuffer);
            const { width, height } = image.scale(1);
            const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
            page.drawImage(image, {
              x: (page.getWidth() - width * scale) / 2,
              y: (page.getHeight() - height * scale) / 2,
              width: width * scale,
              height: height * scale,
            });
          } catch (imageError) {
            console.error("Could not process file:", fileData.name);
          }
        }
      }
      
      // Add watermark to first page for free users
      if (addWatermark && mergedPdf.getPageCount() > 0) {
        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        const firstPage = mergedPdf.getPage(0);
        firstPage.drawText("Merged with BrightBoard", {
          x: 20,
          y: 20,
          size: 10,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });
      }
      
      const outputBuffer = Buffer.from(await mergedPdf.save());
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="merged.pdf"');
      res.send(outputBuffer);
    } catch (error) {
      console.error("Error merging files:", error);
      res.status(500).json({ error: "Failed to merge files" });
    }
  });

  // Compress files
  app.post("/api/file-tools/compress", async (req, res) => {
    try {
      const { file, fileName, level } = req.body;
      
      if (!file || !fileName) {
        return res.status(400).json({ error: "File and filename are required" });
      }
      
      // Server-side subscription check for watermark
      const userId = (req.session as any)?.userId;
      const isPremium = await checkPremiumStatus(userId);
      const addWatermark = !isPremium;
      
      const base64Match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: "Invalid file format" });
      }
      
      const mimeType = base64Match[1];
      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, "base64");
      
      let outputBuffer: Buffer;
      let outputMimeType: string;
      
      const qualityMap = { low: 90, medium: 70, high: 40 };
      const quality = qualityMap[level as keyof typeof qualityMap] || 70;
      
      if (mimeType.startsWith("image/")) {
        let sharpInstance = sharp(buffer);
        
        if (mimeType === "image/png") {
          sharpInstance = sharpInstance.png({ quality, compressionLevel: level === "high" ? 9 : level === "medium" ? 6 : 3 });
        } else {
          sharpInstance = sharpInstance.jpeg({ quality });
        }
        
        if (addWatermark) {
          const metadata = await sharp(buffer).metadata();
          const watermarkSvg = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <text x="20" y="${(metadata.height || 100) - 20}" font-family="Arial" font-size="16" fill="rgba(128,128,128,0.7)">Made with BrightBoard</text>
            </svg>
          `);
          sharpInstance = sharpInstance.composite([{ input: watermarkSvg, gravity: 'southwest' }]);
        }
        
        outputBuffer = await sharpInstance.toBuffer();
        outputMimeType = mimeType;
      } else if (mimeType === "application/pdf") {
        // For PDFs, we just return as-is with watermark if needed
        const pdfDoc = await PDFDocument.load(buffer);
        
        if (addWatermark && pdfDoc.getPageCount() > 0) {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const firstPage = pdfDoc.getPage(0);
          firstPage.drawText("Compressed with BrightBoard", {
            x: 20,
            y: 20,
            size: 10,
            font,
            color: rgb(0.6, 0.6, 0.6),
          });
        }
        
        outputBuffer = Buffer.from(await pdfDoc.save());
        outputMimeType = "application/pdf";
      } else {
        return res.status(400).json({ error: "Unsupported file type for compression" });
      }
      
      const extension = fileName.split('.').pop() || 'file';
      res.setHeader("Content-Type", outputMimeType);
      res.setHeader("Content-Disposition", `attachment; filename="compressed.${extension}"`);
      res.send(outputBuffer);
    } catch (error) {
      console.error("Error compressing file:", error);
      res.status(500).json({ error: "Failed to compress file" });
    }
  });

  // Export storyboard as MP4 video
  app.post("/api/storyboard-to-video", async (req, res) => {
    try {
      const validatedRequest = videoExportSchema.parse(req.body);
      const { content, includeNarration, includeMusic, includeSubtitles, voice } = validatedRequest;
      
      const storyboardData = JSON.parse(content);
      
      if (!storyboardData.frames || storyboardData.frames.length === 0) {
        return res.status(400).json({ error: "No frames found in storyboard" });
      }
      
      const framesWithImages = storyboardData.frames.filter((f: any) => f.image);
      if (framesWithImages.length === 0) {
        return res.status(400).json({ error: "No frames with images found. Generate images first." });
      }
      
      let isPremium = false;
      const userId = (req.session as any)?.userId;
      const sessionUser = (req.session as any)?.user;
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = sessionUser?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      
      if (isCEO) {
        isPremium = true;
      } else if (userId) {
        try {
          const { getSubscriptionStatus } = await import('./paddleService');
          const subscriptionStatus = await getSubscriptionStatus(userId);
          isPremium = subscriptionStatus.isPremium;
        } catch (err) {
          console.error('Error checking subscription status:', err);
        }
      }
      
      const videoOptions = {
        includeNarration: isPremium ? includeNarration : false,
        includeMusic: isPremium ? includeMusic : false,
        includeSubtitles: isPremium ? includeSubtitles : false,
        voice,
        isPremium
      };
      
      const videoBuffer = await generateVideoFromStoryboard(storyboardData, videoOptions);
      
      const title = storyboardData.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'storyboard';
      const filename = `brightboard-${title}-${Date.now()}.mp4`;
      
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', videoBuffer.length);
      res.send(videoBuffer);
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Failed to generate video. Please try again." });
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

  // Free tier limits
  const FREE_LIMITS = {
    image: 10,
    presentation: 5,
    storyboard: 1, // video/storyboard
  };

  // Get user usage status
  app.get("/api/usage", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user?.claims?.sub) {
        return res.json({ 
          imageCount: 0, presentationCount: 0, videoCount: 0,
          imageLimit: FREE_LIMITS.image,
          presentationLimit: FREE_LIMITS.presentation,
          videoLimit: FREE_LIMITS.storyboard,
          isPremium: false
        });
      }
      
      const subscriptionStatus = await stripeService.getSubscriptionStatus(user.claims.sub);
      if (subscriptionStatus.isPremium) {
        return res.json({
          imageCount: 0, presentationCount: 0, videoCount: 0,
          imageLimit: -1, presentationLimit: -1, videoLimit: -1,
          isPremium: true
        });
      }
      
      const usage = await stripeService.getUserUsage(user.claims.sub);
      res.json({
        ...usage,
        imageLimit: FREE_LIMITS.image,
        presentationLimit: FREE_LIMITS.presentation,
        videoLimit: FREE_LIMITS.storyboard,
        isPremium: false
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  // Generate content (requires authentication)
  app.post("/api/generate", async (req, res) => {
    try {
      const validatedData = generateContentSchema.parse(req.body);
      let { type, prompt, gradeLevel, subject, slideCount, videoOptions, presentationOptions, worksheetOptions, referenceImage, imageOptions, textOptions, activityOptions, includeLogo } = validatedData;
      
      // Get user info - require authentication (custom session auth)
      const sessionUserId = (req as any).session?.userId;
      const sessionUser = (req as any).session?.user;
      
      // Also check for legacy Replit Auth format
      const legacyUser = (req as any).user;
      const legacyUserId = legacyUser?.claims?.sub;
      
      const userId = sessionUserId || legacyUserId;
      
      if (!userId) {
        return res.status(401).json({ error: "Please sign in to generate content" });
      }
      
      // Check subscription status
      const subscriptionStatus = await stripeService.getSubscriptionStatus(userId);
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = sessionUser?.email || legacyUser?.claims?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      const isPremium = isCEO || subscriptionStatus.isPremium;
      
      // Check free tier usage limits for non-premium users
      if (!isPremium) {
        const usage = await stripeService.getUserUsage(userId);
        
        if (type === 'image' && usage.imageCount >= FREE_LIMITS.image) {
          return res.status(403).json({ 
            error: `You've reached your daily limit of ${FREE_LIMITS.image} images. Upgrade to premium for unlimited generations!`,
            limitReached: true,
            type: 'image'
          });
        }
        if (type === 'presentation' && usage.presentationCount >= FREE_LIMITS.presentation) {
          return res.status(403).json({ 
            error: `You've reached your daily limit of ${FREE_LIMITS.presentation} presentations. Upgrade to premium for unlimited generations!`,
            limitReached: true,
            type: 'presentation'
          });
        }
        if (type === 'storyboard' && usage.videoCount >= FREE_LIMITS.storyboard) {
          return res.status(403).json({ 
            error: `You've reached your daily limit of ${FREE_LIMITS.storyboard} video storyboard. Upgrade to premium for unlimited generations!`,
            limitReached: true,
            type: 'storyboard'
          });
        }
      }
      
      // Check if user is trying to use premium features
      const premiumQualities = ['hd', '4k'];
      const hasPremiumVideoQuality = videoOptions?.quality && premiumQualities.includes(videoOptions.quality);
      const hasPremiumPresentationQuality = presentationOptions?.imageQuality && premiumQualities.includes(presentationOptions.imageQuality);
      const hasPremiumImageQuality = imageOptions?.quality && premiumQualities.includes(imageOptions.quality);
      const hasPremiumTransitions = presentationOptions?.transition && presentationOptions.transition !== 'none';
      const hasPremiumDelay = presentationOptions?.transitionDelay && presentationOptions.transitionDelay > 0;
      const hasPremiumTapToReveal = presentationOptions?.tapToReveal;
      
      const usesPremiumFeatures = hasPremiumVideoQuality || hasPremiumPresentationQuality || hasPremiumImageQuality ||
        hasPremiumTransitions || hasPremiumDelay || hasPremiumTapToReveal;
      
      if (usesPremiumFeatures && !isPremium) {
        // Downgrade to free tier options
        if (videoOptions) {
          videoOptions.quality = '2d';
        }
        if (presentationOptions) {
          presentationOptions.imageQuality = '2d';
          presentationOptions.transition = 'none';
          presentationOptions.transitionDelay = 0;
          presentationOptions.tapToReveal = false;
        }
        if (imageOptions) {
          imageOptions.quality = '2d';
        }
      }
      
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
          const imageResult = await generateImage(prompt, gradeLevel, subject, imageOptions);
          generatedContent = JSON.stringify(imageResult);
          title = imageResult.title;
          break;

        case "presentation":
          const presentationResult = await generatePresentation(prompt, gradeLevel, subject, slideCount, presentationOptions, referenceImage);
          generatedContent = JSON.stringify(presentationResult);
          title = presentationResult.title;
          break;

        case "text":
          const textResult = await generateText(prompt, gradeLevel, subject, textOptions);
          generatedContent = JSON.stringify(textResult);
          title = textResult.title;
          break;

        case "activity":
          const activityResult = await generateActivity(prompt, gradeLevel, subject, activityOptions);
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

      // Add watermark flag for free users
      if (!isPremium && (type === 'image' || type === 'presentation' || type === 'storyboard')) {
        const parsed = JSON.parse(generatedContent);
        parsed.watermark = "by BrightBoard";
        generatedContent = JSON.stringify(parsed);
      }

      // Save to storage
      const saved = await storage.createContent({
        type,
        prompt,
        title,
        content: generatedContent,
      });

      // Increment usage counters for free users
      if (!isPremium) {
        if (type === 'image') {
          await stripeService.incrementUsage(userId, 'image');
        } else if (type === 'presentation') {
          await stripeService.incrementUsage(userId, 'presentation');
        } else if (type === 'storyboard') {
          await stripeService.incrementUsage(userId, 'video');
        }
      }

      // Track feature usage for analytics
      await stripeService.trackFeatureUsage(userId, type);

      res.json(saved);
    } catch (error: any) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // CEO Dashboard API routes (restricted to founder email)
  const CEO_EMAIL = "kayondoabass@gmail.com";

  const isCEO = (req: any) => {
    const user = req.user;
    return user?.claims?.email === CEO_EMAIL;
  };

  // Get dashboard stats
  app.get("/api/ceo/stats", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const stats = await stripeService.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get country distribution
  app.get("/api/ceo/countries", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const countries = await stripeService.getCountryStats();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching country stats:", error);
      res.status(500).json({ error: "Failed to fetch country stats" });
    }
  });

  // Get feature usage analytics
  app.get("/api/ceo/features", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const features = await stripeService.getFeatureUsageStats();
      res.json(features);
    } catch (error) {
      console.error("Error fetching feature stats:", error);
      res.status(500).json({ error: "Failed to fetch feature stats" });
    }
  });

  // Get all users
  app.get("/api/ceo/users", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const users = await stripeService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Job postings CRUD
  app.get("/api/ceo/jobs", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const jobs = await stripeService.getJobPostings(false);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/ceo/jobs", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const job = await stripeService.createJobPosting(req.body);
      res.json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/ceo/jobs/:id", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const job = await stripeService.updateJobPosting(req.params.id, req.body);
      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/ceo/jobs/:id", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      await stripeService.deleteJobPosting(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  // Toggle user premium status (CEO only)
  app.post("/api/ceo/users/:userId/toggle-premium", async (req, res) => {
    if (!isCEO(req)) {
      return res.status(403).json({ error: "Access denied" });
    }
    try {
      const { userId } = req.params;
      const user = await stripeService.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Toggle between premium (yearly) and free
      const currentTier = user.subscriptionTier || "free";
      const newTier = currentTier === "free" ? "yearly" : "free";
      const newStatus = newTier === "free" ? "inactive" : "active";
      
      // Update user subscription using stripeService
      await stripeService.updateUserStripeInfo(userId, {
        subscriptionTier: newTier,
        subscriptionStatus: newStatus
      });
      
      res.json({ 
        success: true, 
        userId,
        previousTier: currentTier,
        newTier,
        newStatus,
        message: `User ${newTier === "free" ? "downgraded to free" : "upgraded to premium"}`
      });
    } catch (error) {
      console.error("Error toggling user premium:", error);
      res.status(500).json({ error: "Failed to toggle premium status" });
    }
  });

  // Check if user is CEO
  app.get("/api/ceo/check", async (req, res) => {
    res.json({ isCEO: isCEO(req) });
  });

  // Register subscription routes
  registerSubscriptionRoutes(app);

  return httpServer;
}

// Image generation
async function generateImage(prompt: string, gradeLevel?: string, subject?: string, options?: ImageOptions) {
  const context = buildContext(gradeLevel, subject);
  const style = options?.style || "animation";
  const quality = options?.quality || "2d";
  const layout = options?.layout || "single";
  
  const styleDesc = style === "animation" ? "cartoon-like, animated style" : "realistic, photorealistic style";
  const qualityDesc = quality === "4k" ? "ultra high quality, 4K resolution" : 
                      quality === "hd" ? "high definition, crisp details" :
                      quality === "3d" ? "3D rendered, dimensional" : "2D flat illustration";
  
  const enhancedPrompt = `Create a colorful, child-friendly educational illustration: ${prompt}. ${context} Style: bright colors, simple shapes, ${styleDesc}, ${qualityDesc}, engaging for children, no text in the image.`;

  // For grid layout, generate 4 images
  const numImages = layout === "grid" ? 4 : 1;
  
  if (numImages === 1) {
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
      options: { style, quality, layout },
    };
  } else {
    // Generate 4 images for grid layout
    const images: string[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `${enhancedPrompt} (variation ${i + 1})`,
        size: "1024x1024",
        n: 1,
      });
      const imageData = response.data?.[0];
      if (imageData?.b64_json) {
        images.push(imageData.b64_json);
      } else if (imageData?.url) {
        images.push(imageData.url);
      }
    }
    
    return {
      title: extractTitle(prompt),
      description: prompt,
      images,
      options: { style, quality, layout },
    };
  }
}

// Presentation generation
async function generatePresentation(prompt: string, gradeLevel?: string, subject?: string, slideCount?: number, options?: PresentationOptions, referenceImage?: string) {
  const context = buildContext(gradeLevel, subject);
  const numSlides = slideCount || 6;
  const style = options?.style || "textAndImages";
  const layout = options?.layout || "single";
  const imageStyle = options?.imageStyle || "animation";
  const imageQuality = options?.imageQuality || "hd";
  // Premium features
  const transition = options?.transition || "none";
  const transitionDelay = options?.transitionDelay || 0;
  const tapToReveal = options?.tapToReveal || false;
  
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
  presentationData.imageStyle = imageStyle;
  presentationData.imageQuality = imageQuality;
  presentationData.transition = transition;
  presentationData.transitionDelay = transitionDelay;
  presentationData.tapToReveal = tapToReveal;
  
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
            // Build style prompt based on imageStyle and imageQuality
            const stylePrompt = imageStyle === "reallife" 
              ? "Photorealistic, educational photography style, high quality stock photo look"
              : "Colorful animated style, cartoon-like, Pixar/Disney quality, child-friendly";
            
            const qualityPrompt = imageQuality === "4k" ? "Ultra high definition, 4K quality, extremely detailed" :
              imageQuality === "3d" ? "3D rendered, CGI quality, depth and lighting effects" :
              imageQuality === "2d" ? "Flat 2D illustration, clean simple shapes, minimal shadows" :
              "High definition, crisp and clear, professional quality";
            
            const imageResponse = await openai.images.generate({
              model: "gpt-image-1",
              prompt: `${stylePrompt}. ${qualityPrompt}. Educational illustration for children: ${imgPrompt}. Suitable for classroom presentation.`,
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
async function generateText(prompt: string, gradeLevel?: string, subject?: string, options?: TextOptions) {
  const context = buildContext(gradeLevel, subject);
  const textStyle = options?.style || "story";
  
  const styleInstructions: Record<string, string> = {
    story: "Write an engaging narrative story with characters, plot, and moral/lesson.",
    explanation: "Write a clear, educational explanation that breaks down concepts step-by-step.",
    poem: "Write a fun, memorable poem with rhyme and rhythm that teaches the concept.",
    dialogue: "Write an engaging dialogue/conversation between characters that teaches the concept.",
  };
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational content writer specializing in creating engaging, age-appropriate learning materials for teachers to use in their classrooms. ${context}
        
        Format: ${styleInstructions[textStyle] || styleInstructions.story}
        
        Return a JSON object with this structure:
        {
          "title": "Content Title",
          "content": "The full educational content text",
          "format": "${textStyle}",
          "vocabulary": ["key", "vocabulary", "words"],
          "discussionQuestions": ["Question 1?", "Question 2?"]
        }`
      },
      {
        role: "user",
        content: `Create educational content about: ${prompt}. Make it engaging, clear, and appropriate for the classroom. Use the ${textStyle} format.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const result = JSON.parse(content);
  result.options = { style: textStyle };
  return result;
}

// Activity/Game generation - Enhanced for all subjects
async function generateActivity(prompt: string, gradeLevel?: string, subject?: string, options?: ActivityOptions) {
  const context = buildContext(gradeLevel, subject);
  const activityStyle = options?.style || "quiz";
  
  // Map activity style to preferred types
  const styleTypeMap: Record<string, string[]> = {
    quiz: ["quiz", "fillInBlank", "multiple-choice"],
    matching: ["matching", "pairs", "memory-game"],
    flashcards: ["flashcards", "flip-cards", "study-cards"],
    wordSearch: ["word-search", "crossword", "word-puzzle"],
  };
  
  // Subject-specific game types
  const gameTypesBySubject: Record<string, string[]> = {
    math: ["number-bingo", "math-relay", "dice-game", "matching", "quiz", "sorting", "sequencing", "puzzle"],
    language: ["word-bingo", "spelling-bee", "story-chain", "rhyme-time", "matching", "fillInBlank", "quiz"],
    science: ["scavenger-hunt", "experiment-steps", "classification", "life-cycle", "matching", "quiz", "sorting"],
    "social-studies": ["map-hunt", "timeline", "matching", "quiz", "sorting", "roleplay"],
    art: ["color-mixing", "art-style-match", "creative-challenge", "matching", "quiz"],
    music: ["rhythm-pattern", "instrument-match", "song-lyrics", "matching", "quiz"],
    stem: ["coding-puzzle", "engineering-challenge", "experiment-steps", "sorting", "sequencing", "quiz"],
    default: ["matching", "quiz", "fillInBlank", "sorting", "sequencing", "bingo", "relay-race", "scavenger-hunt"]
  };
  
  const subjectKey = subject?.toLowerCase().replace(/\s+/g, "-") || "default";
  const preferredTypes = styleTypeMap[activityStyle] || styleTypeMap.quiz;
  const availableTypes = [...preferredTypes, ...(gameTypesBySubject[subjectKey] || gameTypesBySubject.default)];
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert educational game designer who creates FUN, INTERACTIVE, HANDS-ON learning activities for classrooms. ${context}

IMPORTANT: Create a ${activityStyle.toUpperCase()} style activity that is ACTIVE and ENGAGING - not just worksheets! Think of games kids would LOVE to play.

Preferred activity type: ${activityStyle}
Available activity types for this subject: ${availableTypes.join(", ")}

Return a JSON object with this structure:
{
  "title": "Creative, Fun Activity Title",
  "type": "${activityStyle}",
  "gameStyle": "classroom" | "group" | "pairs" | "individual",
  "duration": "5-10 minutes" | "10-15 minutes" | "15-20 minutes",
  "materials": ["List of materials needed, if any"],
  "instructions": "Step-by-step instructions for how to play/complete the activity. Make it exciting!",
  "learningObjectives": ["What students will learn"],
  "items": [
    {
      "question": "Question, prompt, or challenge",
      "answer": "Correct answer",
      "options": ["Option A", "Option B", "Option C", "Correct Answer"],
      "hint": "Optional helpful hint"
    }
  ],
  "bonusChallenge": "Optional bonus activity for fast finishers",
  "adaptations": "How to make it easier or harder"
}

Create 8-10 engaging items. For physical games like relay races or scavenger hunts, include movement instructions.`
      },
      {
        role: "user",
        content: `Create a super fun, interactive ${activityStyle} classroom game or activity about: ${prompt}

Make it something students will be EXCITED to play! Include movement, competition, or creative elements when appropriate. The activity should actively engage students, not just be a passive exercise.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const result = JSON.parse(content);
  result.options = { style: activityStyle };
  return result;
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

// ============================================
// SUBSCRIPTION & STRIPE ROUTES
// ============================================

export function registerSubscriptionRoutes(app: any) {
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/config", async (req: any, res: any) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Get subscription plans/prices
  app.get("/api/subscription/plans", async (req: any, res: any) => {
    try {
      const rows = await stripeService.listProductsWithPrices();
      
      // Group prices by product
      const productsMap = new Map();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ plans: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  // Get current user subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // CEO bypass - founder always gets premium access
      const CEO_EMAILS = ["kayondoabass@gmail.com"];
      const userEmail = req.user?.claims?.email;
      const isCEO = userEmail && CEO_EMAILS.includes(userEmail.toLowerCase());
      
      if (isCEO) {
        return res.json({
          tier: "yearly",
          status: "active",
          isPremium: true,
          isCEO: true,
          subscriptionEndsAt: null
        });
      }

      const user = await stripeService.getUser(userId);
      if (!user) {
        return res.json({ 
          tier: "free",
          status: "inactive",
          isPremium: false
        });
      }

      let subscription = null;
      if (user.stripeSubscriptionId) {
        subscription = await stripeService.getSubscription(user.stripeSubscriptionId);
      }

      res.json({
        tier: user.subscriptionTier || "free",
        status: user.subscriptionStatus || "inactive",
        isPremium: user.subscriptionTier !== "free" && user.subscriptionStatus === "active",
        subscriptionEndsAt: user.subscriptionEndsAt,
        subscription
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/subscription/checkout", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;
      const { priceId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      let user = await stripeService.getUser(userId);
      let customerId = user?.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripeService.createCustomer(userEmail || "", userId);
        await stripeService.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      // Create checkout session
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/?checkout=success`,
        `${baseUrl}/pricing?checkout=cancelled`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create customer portal session for managing subscription
  app.post("/api/subscription/portal", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await stripeService.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // ============ PADDLE ROUTES ============

  // Get Paddle client config (public)
  app.get("/api/paddle/config", async (req: any, res: any) => {
    try {
      res.json({
        clientToken: process.env.PADDLE_CLIENT_TOKEN || "",
      });
    } catch (error) {
      console.error("Error fetching Paddle config:", error);
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // Get Paddle price IDs
  app.get("/api/paddle/prices", isAuthenticated, async (req: any, res: any) => {
    try {
      res.json({
        weekly: process.env.PADDLE_WEEKLY_PRICE_ID || "",
        monthly: process.env.PADDLE_MONTHLY_PRICE_ID || "",
        yearly: process.env.PADDLE_YEARLY_PRICE_ID || "",
      });
    } catch (error) {
      console.error("Error fetching Paddle prices:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  // Cancel subscription via Paddle
  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const success = await paddleService.cancelSubscription(userId);
      if (success) {
        res.json({ success: true, message: "Subscription will be cancelled at end of billing period" });
      } else {
        res.status(400).json({ error: "No active subscription found" });
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Paddle webhook handler
  app.post("/api/paddle/webhook", async (req: any, res: any) => {
    try {
      const signature = req.headers["paddle-signature"];
      const rawBody = JSON.stringify(req.body);
      
      // Verify webhook signature if secret is set
      const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        const parts = signature.split(";").reduce((acc: any, part: string) => {
          const [key, value] = part.split("=");
          acc[key] = value;
          return acc;
        }, {});
        
        const timestamp = parts["ts"];
        const receivedHash = parts["h1"];
        
        const signedPayload = `${timestamp}:${rawBody}`;
        const expectedHash = crypto
          .createHmac("sha256", webhookSecret)
          .update(signedPayload)
          .digest("hex");
        
        if (expectedHash !== receivedHash) {
          console.error("Invalid Paddle webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const event = req.body;
      const eventType = event.event_type;
      const data = event.data;

      console.log(`Paddle webhook received: ${eventType}`);

      switch (eventType) {
        case "subscription.created":
          await paddleService.handleSubscriptionCreated(data);
          break;
        case "subscription.updated":
          await paddleService.handleSubscriptionUpdated(data);
          break;
        case "subscription.canceled":
          await paddleService.handleSubscriptionCanceled(data);
          break;
        case "subscription.activated":
          await paddleService.handleSubscriptionUpdated(data);
          break;
        default:
          console.log(`Unhandled Paddle event: ${eventType}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing Paddle webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
