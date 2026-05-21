import { articles as blogArticles } from "../shared/blog-data";

const BASE = "https://www.brightboardapp.com";
const DEFAULT_IMAGE = `${BASE}/og-image.png`;
const DEFAULT_TITLE = "BrightBoard - AI Content for Teachers";
const DEFAULT_DESC = "Create educational images, presentations, games, worksheets and video storyboards with AI. Save hours every week. Free to start.";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/blog/ai-classroom", label: "AI in the Classroom" },
  { href: "/blog/engagement-strategies", label: "Student Engagement Strategies" },
  { href: "/blog/visual-learning", label: "Visual Learning Science" },
  { href: "/blog/gamification", label: "Gamification in Education" },
  { href: "/blog/time-saving", label: "How AI Saves Teachers Time" },
  { href: "/blog/inclusive-education", label: "Inclusive Classrooms with AI" },
  { href: "/blog/lesson-planning", label: "AI Lesson Planning Guide" },
  { href: "/blog/vocabulary-visual", label: "Vocabulary Teaching with Visuals" },
  { href: "/blog/worksheet-design", label: "Effective Worksheet Design" },
  { href: "/blog/mind-mapping", label: "Mind Mapping in Education" },
  { href: "/contact", label: "Contact" },
  { href: "/affiliate", label: "Affiliate Program" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
  { href: "/signup", label: "Get Started Free" },
];

interface RouteMeta {
  title: string;
  description: string;
  h1: string;
  ogType?: string;
  image?: string;
}

const BLOG_ARTICLES: Record<string, RouteMeta> = {
  "ai-classroom": {
    title: "AI in the Classroom 2025 | BrightBoard Blog",
    h1: "How AI is Transforming Classroom Education in 2025",
    description: "AI is reshaping how teachers prepare lessons. Learn how AI tools collapse preparation time from hours to minutes, freeing teachers to focus on students.",
    ogType: "article",
  },
  "engagement-strategies": {
    title: "Student Engagement Strategies | BrightBoard Blog",
    h1: "10 Student Engagement Strategies That Actually Work",
    description: "Research-backed strategies proven to recapture student attention and deepen participation across all age groups, enhanced with AI tools for busy teachers.",
    ogType: "article",
  },
  "visual-learning": {
    title: "Visual Learning Science | BrightBoard Blog",
    h1: "The Science of Visual Learning: Why Images Make Lessons Stick",
    description: "Humans process images 60,000 times faster than text. Learn how teachers can harness cognitive science to create lessons students remember weeks later.",
    ogType: "article",
  },
  "gamification": {
    title: "Gamification in the Classroom | BrightBoard Blog",
    h1: "Gamification in the Classroom: A Practical Guide for Teachers",
    description: "Apply game psychology to unlock student motivation. Learn quiz games, spinners, and challenge formats that drive deep engagement in every lesson.",
    ogType: "article",
  },
  "time-saving": {
    title: "How AI Saves Teachers 5+ Hours | BrightBoard Blog",
    h1: "How AI Saves Teachers 5+ Hours Every Week",
    description: "Teacher burnout is at record levels. AI content tools give educators hours back each week. Here is exactly where the time savings happen.",
    ogType: "article",
  },
  "inclusive-education": {
    title: "Inclusive Classrooms with AI | BrightBoard Blog",
    h1: "Creating Inclusive Classrooms with AI: A Practical Guide",
    description: "AI tools make differentiation achievable for every teacher. Reach diverse learners with multiple languages, reading levels, and visual supports.",
    ogType: "article",
  },
  "lesson-planning": {
    title: "AI Lesson Planning Guide | BrightBoard Blog",
    h1: "The Complete Guide to AI-Assisted Lesson Planning",
    description: "Transform lesson planning from a burden into a creative process. Learn how AI tools help build complete resource packs aligned to curriculum standards.",
    ogType: "article",
  },
  "vocabulary-visual": {
    title: "Vocabulary Teaching with Visuals | BrightBoard Blog",
    h1: "Teaching Vocabulary with Visuals: Why Pictures Beat Definitions",
    description: "Most vocabulary instruction is ineffective. Pairing words with visual images produces dramatically better retention. Here is the research and practice.",
    ogType: "article",
  },
  "worksheet-design": {
    title: "Effective Worksheet Design | BrightBoard Blog",
    h1: "How to Design Effective Worksheets Students Actually Learn From",
    description: "Most worksheets are busy work. Learn to design worksheets that engage Bloom's higher-order thinking and produce genuine understanding.",
    ogType: "article",
  },
  "mind-mapping": {
    title: "Mind Mapping in Education | BrightBoard Blog",
    h1: "The Power of Mind Mapping in Education: A Research Guide",
    description: "Mind maps match how the brain organises knowledge. Learn how to use them for brainstorming, note-taking, revision, and concept introduction in any subject.",
    ogType: "article",
  },
  "stem-africa": {
    title: "STEM Education in Africa | BrightBoard Blog",
    h1: "STEM Education in Africa: Why Science and Technology Must Come First",
    description: "Africa's tech economy is growing fast. Discover practical strategies for teaching STEM without a laboratory and making science relevant to African students.",
    ogType: "article",
  },
  "storytelling-education": {
    title: "Storytelling in Education | BrightBoard Blog",
    h1: "The Art of Storytelling in Education: Making Every Lesson Memorable",
    description: "The brain is wired for narrative. Learn five storytelling techniques that work in any subject, and how to build a story library that transforms your teaching.",
    ogType: "article",
  },
  "differentiated-instruction": {
    title: "Differentiated Instruction Guide | BrightBoard Blog",
    h1: "Differentiated Instruction: A Practical Guide for Busy Teachers",
    description: "Meet every learner where they are without tripling your workload. Practical tiered activities, choice boards, and flexible grouping strategies.",
    ogType: "article",
  },
  "classroom-culture": {
    title: "Building Positive Classroom Culture | BrightBoard Blog",
    h1: "Building a Positive Classroom Culture: From Chaos to Community",
    description: "The most effective classroom management is about belonging, not control. How to build and sustain a classroom community where students want to learn.",
    ogType: "article",
  },
  "assessment-learning": {
    title: "Assessment for Learning | BrightBoard Blog",
    h1: "Assessment for Learning: Moving Beyond Tests and Grades",
    description: "Formative assessment is the most powerful improvement tool. Learn exit tickets, think-pair-share, and feedback techniques that move learning forward.",
    ogType: "article",
  },
  "teacher-self-care": {
    title: "Teacher Self-Care and Burnout Prevention | BrightBoard Blog",
    h1: "Teacher Self-Care: The Professional Case for Looking After Yourself",
    description: "Teacher burnout hurts students. The professional case for sustainable teaching practice, work-life balance, and using AI tools to reclaim your evenings.",
    ogType: "article",
  },
  "project-based-learning": {
    title: "Project-Based Learning Guide | BrightBoard Blog",
    h1: "Project-Based Learning: A Complete Classroom Guide",
    description: "PBL develops real-world skills while covering curriculum content. A complete guide to designing driving questions, managing group work, and assessing PBL.",
    ogType: "article",
  },
  "early-childhood": {
    title: "Early Childhood Education | BrightBoard Blog",
    h1: "Early Childhood Education: Building the Foundations That Last a Lifetime",
    description: "What happens in the first eight years shapes learning for life. The science of brain development, play-based learning, and stimulating early childhood environments.",
    ogType: "article",
  },
  "parent-teacher": {
    title: "Parent-Teacher Communication | BrightBoard Blog",
    h1: "Parent-Teacher Communication: Building Partnerships That Help Students Thrive",
    description: "When parents and teachers work together, students perform better. Practical strategies for proactive communication, parent engagement, and bridging cultural gaps.",
    ogType: "article",
  },
};

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/": {
    title: DEFAULT_TITLE,
    h1: "AI-Powered Educational Content for Teachers",
    description: DEFAULT_DESC,
  },
  "/features": {
    title: "Features | BrightBoard for Teachers",
    h1: "Powerful AI Features for Educators",
    description: "Explore BrightBoard's AI features: custom educational images, presentations, printable worksheets, interactive games, video storyboards, and rich text content.",
  },
  "/how-it-works": {
    title: "How BrightBoard Works | AI for Teachers",
    h1: "How BrightBoard Works",
    description: "Create professional educational content in four simple steps. No design skills required. Describe what you need and AI generates it instantly.",
  },
  "/pricing": {
    title: "Pricing | BrightBoard Free & Premium Plans",
    h1: "BrightBoard Pricing",
    description: "Start free with BrightBoard. Upgrade to Premium for unlimited AI-generated presentations, worksheets, games, images and more. Localised pricing available.",
  },
  "/about": {
    title: "About BrightBoard | AI Tools for Teachers",
    h1: "About BrightBoard",
    description: "Founded in Uganda, built for teachers worldwide. Our mission is to give every teacher access to professional-quality educational content creation tools.",
  },
  "/blog": {
    title: "Teaching Resources & Insights | BrightBoard",
    h1: "Teaching Resources & Insights",
    description: "Expert articles, practical strategies, and research-backed tips for educators. AI in education, visual learning, gamification, lesson planning, and more.",
  },
  "/contact": {
    title: "Contact BrightBoard | Teacher Support",
    h1: "Contact BrightBoard",
    description: "Get in touch with the BrightBoard team. We are here to help with questions, feedback, and support for teachers using our AI educational content tools.",
  },
  "/affiliate": {
    title: "Affiliate Program | Earn with BrightBoard",
    h1: "BrightBoard Affiliate Program",
    description: "Join the BrightBoard affiliate program and earn commission for every teacher you refer. Share AI-powered educational tools and get paid.",
  },
  "/terms": {
    title: "Terms of Service | BrightBoard",
    h1: "Terms of Service",
    description: "BrightBoard's Terms of Service. Learn about your rights and responsibilities when using our AI-powered educational content creation platform.",
  },
  "/privacy": {
    title: "Privacy Policy | BrightBoard",
    h1: "Privacy Policy",
    description: "BrightBoard's Privacy Policy. Learn how we collect, use, and protect your personal information when you use our educational content creation tools.",
  },
  "/refund": {
    title: "Refund Policy | BrightBoard",
    h1: "Refund Policy",
    description: "BrightBoard's Refund Policy. Learn about our refund process for Premium subscriptions and content generation services.",
  },
  "/resources": {
    title: "Free Teaching Resources | BrightBoard",
    h1: "Free Teaching Resources for Educators",
    description: "Free lesson plan templates, worksheet guides, game formats, assessment tools, and classroom management resources for teachers. Download and use immediately.",
  },
  "/teaching-tips": {
    title: "30 Teaching Tips Every Educator Should Know | BrightBoard",
    h1: "30 Research-Backed Teaching Tips",
    description: "30 practical teaching tips covering engagement, assessment, feedback, classroom management, and teacher wellbeing — each with the research behind it.",
  },
  "/studio": {
    title: "Teacher Studio | AI Content Creator for Teachers | BrightBoard",
    h1: "Teacher Studio — AI-Powered Content for Every Lesson",
    description: "Create worksheets, presentations, games, mind maps, and storyboards with AI. Teacher Studio by BrightBoard gives every teacher a professional content suite.",
  },
};

function generateBlogHtml(slug: string): string {
  const article = blogArticles[slug];
  if (!article) return "";
  const sectionsHtml = article.sections.map(s => `
    <section>
      <h2>${s.heading}</h2>
      ${s.paragraphs.map(p => `<p>${p}</p>`).join("")}
    </section>`).join("");
  return `
  <div id="ssr-article" style="font-family:Georgia,serif;max-width:780px;margin:0 auto;padding:24px 20px;color:#1a1a1a;line-height:1.75">
    <nav style="margin-bottom:16px;font-size:14px">
      <a href="${BASE}" style="color:#7c3aed;text-decoration:none">BrightBoard</a>
      &rsaquo; <a href="${BASE}/blog" style="color:#7c3aed;text-decoration:none">Blog</a>
      &rsaquo; ${article.category}
    </nav>
    <article>
      <h1 style="font-size:2rem;font-weight:700;line-height:1.25;margin-bottom:16px">${article.title}</h1>
      <p style="font-size:1.125rem;color:#555;border-left:4px solid #7c3aed;padding-left:16px;margin-bottom:32px">${article.excerpt}</p>
      ${sectionsHtml}
      <div style="margin-top:40px;padding:24px;background:#f5f3ff;border-radius:12px;text-align:center">
        <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px">Put this into practice with BrightBoard</h3>
        <p style="color:#555;margin-bottom:16px">Create AI-powered presentations, worksheets, games and more — designed specifically for teachers.</p>
        <a href="${BASE}/signup" style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">Get Started Free</a>
      </div>
    </article>
  </div>`;
}

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
    h1: "BrightBoard",
    description: DEFAULT_DESC,
    canonical: `${BASE}${path}`,
  };
}

// Internal links footer injected into every static page so crawlers always find outgoing links
const INTERNAL_LINKS_FOOTER = `
  <footer id="ssr-links" style="font-family:sans-serif;max-width:780px;margin:32px auto;padding:24px 20px;border-top:1px solid #e5e7eb;color:#555;font-size:14px">
    <p style="font-weight:600;margin-bottom:12px">Explore BrightBoard</p>
    <nav style="display:flex;flex-wrap:wrap;gap:12px">
      <a href="${BASE}/" style="color:#7c3aed;text-decoration:none">Home</a>
      <a href="${BASE}/features" style="color:#7c3aed;text-decoration:none">Features</a>
      <a href="${BASE}/how-it-works" style="color:#7c3aed;text-decoration:none">How It Works</a>
      <a href="${BASE}/pricing" style="color:#7c3aed;text-decoration:none">Pricing</a>
      <a href="${BASE}/about" style="color:#7c3aed;text-decoration:none">About</a>
      <a href="${BASE}/blog" style="color:#7c3aed;text-decoration:none">Blog</a>
      <a href="${BASE}/resources" style="color:#7c3aed;text-decoration:none">Free Resources</a>
      <a href="${BASE}/teaching-tips" style="color:#7c3aed;text-decoration:none">Teaching Tips</a>
      <a href="${BASE}/studio" style="color:#7c3aed;text-decoration:none">Teacher Studio</a>
      <a href="${BASE}/contact" style="color:#7c3aed;text-decoration:none">Contact</a>
      <a href="${BASE}/affiliate" style="color:#7c3aed;text-decoration:none">Affiliate Program</a>
      <a href="${BASE}/privacy" style="color:#7c3aed;text-decoration:none">Privacy Policy</a>
      <a href="${BASE}/terms" style="color:#7c3aed;text-decoration:none">Terms of Service</a>
      <a href="${BASE}/refund" style="color:#7c3aed;text-decoration:none">Refund Policy</a>
    </nav>
  </footer>`;

export function injectSEOMeta(html: string, url: string): string {
  const { title, description, h1, canonical, ogType, image } = getRouteMeta(url);
  const img = image ?? DEFAULT_IMAGE;
  const type = ogType ?? "website";

  const headTags = `
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

  const navLinksHtml = NAV_LINKS.map(l => `<a href="${BASE}${l.href}">${l.label}</a>`).join("\n");
  const bodyNoscript = `
<noscript>
<nav>${navLinksHtml}</nav>
<h1>${h1}</h1>
<p>${description}</p>
</noscript>`;

  html = html.replace(/<title>[^<]*<\/title>/, "");
  html = html.replace(/<meta name="description"[^>]*>/g, "");
  html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, "");
  html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, "");

  html = html.replace("<head>", `<head>${headTags}`);
  html = html.replace("<body>", `<body>${bodyNoscript}`);

  const path = url.split("?")[0].replace(/\/$/, "");
  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const blogHtml = generateBlogHtml(blogMatch[1]);
    if (blogHtml) {
      html = html.replace('<div id="root"></div>', `<div id="root">${blogHtml}</div>`);
    }
  } else {
    // Inject outgoing links footer into all non-blog pages so every page has crawlable outgoing links
    html = html.replace('<div id="root"></div>', `<div id="root">${INTERNAL_LINKS_FOOTER}</div>`);
  }

  return html;
}
