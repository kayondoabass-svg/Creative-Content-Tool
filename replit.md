# BrightBoard - AI Content for Teachers

## Overview
BrightBoard is an AI-powered content creation platform designed for busy teachers. It enables instant generation of educational content including images, presentations, activities, text, and animated video storyboards. The platform aims to provide high-quality, age-appropriate, and classroom-ready materials to streamline lesson planning and enhance student engagement. BrightBoard supports various content types and offers subscription tiers for premium features, positioning itself as a valuable tool in the educational technology market.

## User Preferences
- Target audience: Teachers (non-technical users)
- Style: Child-friendly, colorful, playful educational theme
- Content should be age-appropriate and classroom-ready

## System Architecture

### UI/UX Decisions
The platform features a beautiful, playful UI with a purple/teal educational theme, dark mode support, and a content history sidebar. Interactive elements like the Lucky Spinner game and other online games are designed with engaging animations and visual feedback.

The landing page includes:
- Hero section with trust badges (7-Day Money Back, Cancel Anytime, Secure Payments, 11 Languages)
- Live stats counter showing real-time teacher signups and content generations
- Video demo section with placeholder for walkthrough video
- Sample content gallery showcasing AI-generated examples
- Feature grid highlighting all 6 content types
- Testimonials section with teacher quotes from around the world
- FAQ accordion with common questions and answers
- Final CTA section with call to action buttons

### Technical Implementations
BrightBoard is built with a React, TypeScript, and Vite frontend utilizing Tailwind CSS for styling, TanStack Query for data fetching, and Wouter for routing. The backend is an Express.js application, integrating with OpenAI for content generation. Custom email/password authentication is implemented with email verification and password reset flows, replacing Replit Auth. Subscription management is handled via Stripe/Paddle. The system supports multi-language internationalization (i18n) with 11 languages and RTL support.

### Feature Specifications
- **Content Generation**: Supports 6 types: images (educational illustrations), presentations (slide decks with speaker notes, PowerPoint export, slideshow mode, customizable slide counts, premium animations, transitions, and tap-to-reveal), text (stories, explanations), activities/games (12 interactive, playable online game types like Lucky Spinner, Mystery Box, Memory Match), video storyboards (with variable video lengths, frame counts, AI narration, background music, subtitles, and multi-language audio/subtitle options), and worksheets (printable with various section types and multiple download formats).
- **User Management**: Custom email/password authentication, email verification, password reset, and reCAPTCHA support. Owner dashboard and expense tracking for administrative oversight.
- **File Management**: Integrated file converter (PDF, JPEG, PNG) and reference image upload for presentation generation using GPT-4o vision.
- **Subscription Model**: Free tier with limited generations; premium tiers (weekly, monthly, yearly) offering unlimited generations, HD/4K quality, premium animations, and ad-free video exports.
- **Internationalization**: Full i18n support for 11 languages, including RTL for Arabic, with language preference saving.
- **Admin Tools**: Owner Dashboard provides real-time statistics (user metrics, content metrics, subscription breakdown, recent signups, 30-day trends) and Owner Expenses tracks costs (OpenAI, Resend, Paddle, ads, etc.). Owner can control video branding settings (watermark visibility, end logo).

## External Dependencies
- **OpenAI**: Used for AI content generation (images, text, presentations, storyboards, worksheets) and voice-to-text.
- **Resend**: For email delivery (verification codes, password resets).
- **Flutterwave**: Planned payment processor for subscription management (pending registration in Uganda). Supports mobile money (MTN, Airtel), cards, and 150+ currencies.
- **pptxgenjs**: For generating PowerPoint (.pptx) files.
- **express-session**: For session-based authentication.
- **Web Audio API**: For sound effects in interactive games.
- **Web Speech API**: For voice-to-text input.
- **Zod**: For schema validation.
- **Cloudflare**: For domain management (as per Resend setup).