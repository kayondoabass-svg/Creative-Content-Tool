# BrightBoard - AI Content for Teachers

## Overview
BrightBoard is an AI-powered content creation platform designed for busy teachers. It allows teachers to instantly generate educational content including images, presentations, activities/games, text content, and animated video storyboards - similar to content from Cocomelon, Super Simple Songs, or Smile and Learn.

## Current State
MVP complete with all core features:
- 6 content generation types (images, presentations, text, activities, storyboards, worksheets)
- Beautiful, playful UI with purple/teal educational theme
- Dark mode support
- Content history sidebar
- Download and copy functionality
- PowerPoint (.pptx) download for presentations
- Slideshow presentation mode with keyboard navigation
- Adjustable slide count (3-20 slides)
- Worksheet generator with color mode options and multiple download formats
- User authentication via Replit Auth (Google, GitHub, Apple, email/password)
- Subscription-based premium features via Stripe

## Subscription Tiers
- **Free**: 5 generations/day, basic 2D/3D quality
- **Weekly** ($4.99/week): Unlimited generations, HD/4K quality, premium animations
- **Monthly** ($14.99/month): Same as weekly, 25% savings
- **Yearly** ($99.99/year): Same as weekly, 60% savings (best value)

## Premium Features (requires subscription)
- HD and 4K image quality for presentations and storyboards
- Slide transitions (Fade, Slide, Zoom, Flip)
- Transition delays (0.5s - 3s)
- Tap-to-reveal animations
- Unlimited content generations

## Recent Changes
- January 23, 2026: Added voice-to-text input feature
  - "Voice or Text to Reality" tagline updated on landing page
  - Voice recorder button in prompt input using Web Speech API
  - Real-time speech-to-text transcription
  - Transcribed text automatically appends to prompt field
  - Visual recording indicator and error handling
- January 23, 2026: Added CEO dashboard for founder analytics
  - Dashboard at /ceo restricted to kayondoabass@gmail.com
  - User statistics: total, new signups, subscription breakdown
  - Geographic analytics by country
  - Feature usage tracking across content types
  - Hiring section with job posting management
- January 23, 2026: Added user authentication and subscription payments
  - Integrated Replit Auth for sign up/sign in (supports OAuth providers)
  - Set up Stripe for subscription management with stripe-replit-sync
  - Created landing page for logged-out users with features and pricing
  - Added pricing page for managing subscriptions
  - Implemented user profile dropdown with subscription status
  - Premium features gated behind subscription (client and server-side validation)
- January 23, 2026: Added enhanced presentation options with premium features
  - Photo style options: Animation or Real Life
  - Photo quality options: 2D, 3D, HD, 4K
  - Premium animation features (marked with PREMIUM badge):
    - Slide transitions: None, Fade, Slide, Zoom, Flip
    - Transition delays: 0-3 seconds
    - Tap to Reveal option
  - All options shown as badges in generated output
- January 23, 2026: Added worksheet generator
  - Generate printable worksheets with various section types
  - Color mode selection: Colored (for screen) or Black & White (for printing)
  - Section types: questions, fill-in-blank, matching, multiple choice, writing prompts, drawing areas
  - Download formats: PDF, JPEG, and Text
  - Answer key included with each section
- January 23, 2026: Added organization logo feature
  - Upload custom logo or generate one using AI
  - Logo displays in top-right corner of header
  - Settings stored in memory storage
- January 23, 2026: Added file converter tool
  - Convert between PDF, JPEG, PNG formats
  - Supports images and text files up to 20MB
  - Automatic download after conversion
- January 23, 2026: Added reference image upload for presentations
  - Teachers can upload a photo of existing lesson material
  - AI analyzes the image and creates a matching presentation
  - Uses GPT-4o vision to understand lesson content and style
- January 23, 2026: Added presentation customization options
  - Content style: Text + Images, Images Only, or Text Only
  - Layout options: Single image per slide or Image Grid (4 images)
  - Badges show selected options in output
- January 23, 2026: Added image generation for presentations and storyboards
  - Presentations now include AI-generated illustrations for each slide
  - Storyboard frames include generated images (first 6 frames)
  - Images styled based on video options (Animation vs Real Life)
- January 23, 2026: Added video storyboard options
  - Video length selector (1min, 5min, 10min, 30min)
  - Video style selector (Animation or Real Life)
  - Video quality selector (2D, 3D, HD, 4K)
  - Frame count scales with video length
- January 23, 2026: Added presentation features
  - Slideshow "Present" mode with fullscreen view
  - Keyboard navigation (arrow keys, space, escape)
  - PowerPoint download using pptxgenjs
  - Slide count selector for presentations
  - Mobile-optimized content type cards
- January 23, 2026: Initial MVP implementation
  - Set up OpenAI integration via Replit AI Integrations
  - Created content type selection cards
  - Built prompt input with grade level and subject selectors
  - Implemented all 5 content generation backends
  - Added content history management

## User Preferences
- Target audience: Teachers (non-technical users)
- Style: Child-friendly, colorful, playful educational theme
- Content should be age-appropriate and classroom-ready

## Project Architecture

### Frontend (client/)
- React + TypeScript + Vite
- Tailwind CSS with custom educational theme
- TanStack Query for data fetching
- Wouter for routing
- Shadcn UI components

### Backend (server/)
- Express.js
- In-memory storage for content history
- OpenAI integration for content generation

### Key Files
- `client/src/pages/home.tsx` - Main content creation page
- `client/src/components/` - Reusable UI components
- `server/routes.ts` - API endpoints for content generation
- `server/storage.ts` - In-memory storage interface
- `shared/schema.ts` - Shared types and schemas

### API Endpoints
- `GET /api/content` - Get all generated content
- `GET /api/content/:id` - Get specific content
- `DELETE /api/content/:id` - Delete content
- `POST /api/generate` - Generate new content

### Content Types
1. **Image** - Educational illustrations using gpt-image-1
2. **Presentation** - Slide decks with speaker notes
3. **Text** - Stories, explanations, learning materials
4. **Activity** - Quizzes, matching games, interactive learning
5. **Storyboard** - Animated video planning with frames
6. **Worksheet** - Printable worksheets with questions, fill-in-blanks, matching, and more

## Running the Project
The app runs on port 5000 via `npm run dev`. The Express server serves both the API and the Vite-built frontend.
