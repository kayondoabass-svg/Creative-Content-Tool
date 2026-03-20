const BASE = "https://brightboardapp.com";
const DEFAULT_IMAGE = `${BASE}/og-image.png`;
const DEFAULT_TITLE = "BrightBoard - AI Content for Teachers";
const DEFAULT_DESC = "Create educational images, presentations, games, worksheets and video storyboards instantly with AI. Save hours every week. Perfect for busy teachers worldwide.";

interface RouteMeta {
  title: string;
  description: string;
  ogType?: string;
  image?: string;
}

const BLOG_ARTICLES: Record<string, RouteMeta> = {
  "ai-classroom": {
    title: "How AI is Transforming Classroom Education in 2025 | BrightBoard Blog",
    description: "Artificial intelligence is reshaping how teachers prepare lessons. Learn how AI tools are collapsing preparation time from hours to minutes, freeing teachers for what matters most.",
    ogType: "article",
  },
  "engagement-strategies": {
    title: "10 Student Engagement Strategies That Actually Work in 2025 | BrightBoard Blog",
    description: "Research-backed strategies proven to recapture student attention and deepen participation across all age groups. Enhanced with AI tools for busy teachers.",
    ogType: "article",
  },
  "visual-learning": {
    title: "The Science of Visual Learning: Why Images Make Lessons Stick | BrightBoard Blog",
    description: "Humans process images 60,000 times faster than text. Learn how teachers can harness this cognitive science to create lessons students remember weeks later.",
    ogType: "article",
  },
  "gamification": {
    title: "Gamification in the Classroom: A Practical Guide for Teachers | BrightBoard Blog",
    description: "Apply game psychology to unlock student motivation. Learn how to use quiz games, spinners, and challenge formats to drive deep engagement in every lesson.",
    ogType: "article",
  },
  "time-saving": {
    title: "How AI Saves Teachers 5+ Hours Every Week | BrightBoard Blog",
    description: "Teacher burnout is at record levels. AI content tools are giving educators hours back each week. Here is exactly where the time savings happen and how to maximise them.",
    ogType: "article",
  },
  "inclusive-education": {
    title: "Creating Inclusive Classrooms with AI: A Practical Guide | BrightBoard Blog",
    description: "AI tools are making differentiation achievable for every teacher. Learn how to reach diverse learners with multiple languages, reading levels, and visual supports.",
    ogType: "article",
  },
  "lesson-planning": {
    title: "The Complete Guide to AI-Assisted Lesson Planning | BrightBoard Blog",
    description: "Transform lesson planning from a burden into a creative process. Learn how AI tools help teachers build complete resource packs aligned to curriculum standards.",
    ogType: "article",
  },
  "vocabulary-visual": {
    title: "Teaching Vocabulary with Visuals: Why Pictures Beat Definitions | BrightBoard Blog",
    description: "Most vocabulary instruction is ineffective. Pairing words with visual images produces dramatically better retention. Here is the research and the practice.",
    ogType: "article",
  },
  "worksheet-design": {
    title: "How to Design Effective Worksheets That Students Actually Learn From | BrightBoard Blog",
    description: "Most worksheets are busy work. Learn how to design worksheets that engage Bloom's higher-order thinking and produce genuine understanding.",
    ogType: "article",
  },
  "mind-mapping": {
    title: "The Power of Mind Mapping in Education: A Research-Based Guide | BrightBoard Blog",
    description: "Mind maps match how the brain organises knowledge. Learn how to use them for brainstorming, note-taking, revision, and concept introduction in any subject.",
    ogType: "article",
  },
};

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  },
  "/features": {
    title: "Features | BrightBoard - AI Content Creation for Teachers",
    description: "Explore BrightBoard's powerful AI features: custom educational images, slide presentations, printable worksheets, interactive games, video storyboards, and rich text content.",
  },
  "/how-it-works": {
    title: "How BrightBoard Works | AI Content Creation for Teachers",
    description: "Create professional educational content in four simple steps. No design skills required. Describe what you need and AI generates presentations, worksheets, games and more.",
  },
  "/pricing": {
    title: "Pricing | BrightBoard - Free & Premium Plans for Teachers",
    description: "Start free with BrightBoard. Upgrade to Premium for unlimited AI-generated presentations, worksheets, games, images and more. Localised pricing available worldwide.",
  },
  "/about": {
    title: "About BrightBoard | AI Educational Content for Teachers",
    description: "Learn about BrightBoard — founded in Uganda, built for teachers worldwide. Our mission is to give every teacher access to professional-quality educational content creation tools.",
  },
  "/blog": {
    title: "Teaching Resources & Insights | BrightBoard Blog",
    description: "Expert articles, practical strategies, and research-backed tips for educators. Learn about AI in education, visual learning, gamification, lesson planning, and inclusive teaching.",
  },
  "/contact": {
    title: "Contact BrightBoard | Support for Teachers",
    description: "Get in touch with the BrightBoard team. We are here to help with questions, feedback, and support for teachers using our AI educational content tools.",
  },
  "/affiliate": {
    title: "Affiliate Program | Earn with BrightBoard",
    description: "Join the BrightBoard affiliate program and earn commission for every teacher you refer. Share AI-powered educational tools with your network and get paid.",
  },
  "/terms": {
    title: "Terms of Service | BrightBoard",
    description: "Read BrightBoard's Terms of Service. Learn about your rights and responsibilities when using our AI-powered educational content creation platform.",
  },
  "/privacy": {
    title: "Privacy Policy | BrightBoard",
    description: "Read BrightBoard's Privacy Policy. Learn how we collect, use, and protect your personal information when you use our educational content creation tools.",
  },
  "/refund": {
    title: "Refund Policy | BrightBoard",
    description: "Read BrightBoard's Refund Policy. Learn about our refund process for Premium subscriptions and content generation services.",
  },
};

export function getRouteMeta(url: string): RouteMeta & { canonical: string } {
  const path = url.split("?")[0].replace(/\/$/, "") || "/";

  if (STATIC_ROUTES[path]) {
    return { ...STATIC_ROUTES[path], canonical: `${BASE}${path}` };
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const meta = BLOG_ARTICLES[slug];
    if (meta) {
      return { ...meta, canonical: `${BASE}${path}` };
    }
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    canonical: `${BASE}${path}`,
  };
}

export function injectSEOMeta(html: string, url: string): string {
  const { title, description, canonical, ogType, image } = getRouteMeta(url);
  const img = image ?? DEFAULT_IMAGE;
  const type = ogType ?? "website";

  const tags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:site_name" content="BrightBoard" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${img}" />`;

  html = html.replace(/<title>[^<]*<\/title>/, "");
  html = html.replace(/<meta name="description"[^>]*>/g, "");
  html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, "");

  return html.replace("<head>", `<head>${tags}`);
}
