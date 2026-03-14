import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Presentation, FileSpreadsheet, Brain, BookOpen,
  Gamepad2, Video, CheckCircle, ArrowRight, Star, Users,
  Zap, Shield, Clock, Globe
} from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";

const features = [
  {
    icon: Presentation,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10",
    title: "AI Presentations",
    desc: "Create stunning slides with images, transitions & game-mode in minutes.",
    badge: "Most Popular",
  },
  {
    icon: Brain,
    color: "from-purple-500 to-violet-500",
    bg: "bg-purple-500/10",
    title: "Mind Maps",
    desc: "Visualise any topic with beautiful, downloadable AI mind maps.",
    badge: null,
  },
  {
    icon: FileSpreadsheet,
    color: "from-orange-500 to-amber-500",
    bg: "bg-orange-500/10",
    title: "Worksheets",
    desc: "Generate custom worksheets — fill-in-the-blank, MCQ, word search and more.",
    badge: null,
  },
  {
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
    bg: "bg-green-500/10",
    title: "Classroom Games",
    desc: "Turn any lesson into an exciting interactive game show.",
    badge: "🔥 New",
  },
  {
    icon: BookOpen,
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-500/10",
    title: "Illustrated Stories",
    desc: "AI-written stories with images — perfect for young learners and ESL.",
    badge: null,
  },
  {
    icon: Video,
    color: "from-teal-500 to-cyan-500",
    bg: "bg-teal-500/10",
    title: "Video Storyboards",
    desc: "Build explainer video scripts and storyboards with one prompt.",
    badge: null,
  },
];

const testimonials = [
  { name: "Maria Santos", role: "Primary Teacher, Philippines", quote: "I used to spend 3 hours making a worksheet. Now it takes 30 seconds. BrightBoard changed my life!", stars: 5 },
  { name: "Aditya Prabowo", role: "Corporate Trainer, Indonesia", quote: "My presentations have never looked so professional. The AI images are incredible.", stars: 5 },
  { name: "Soo-Jin Park", role: "ESL Teacher, Malaysia", quote: "The game mode gets my students SO excited. They actually ask for more worksheets now!", stars: 5 },
];

const audiences = [
  { emoji: "👩‍🏫", label: "Teachers" },
  { emoji: "🎤", label: "Public Speakers" },
  { emoji: "💼", label: "Corporate Trainers" },
  { emoji: "👨‍👩‍👧", label: "Homeschool Parents" },
  { emoji: "🌏", label: "ESL Educators" },
  { emoji: "🧑‍💻", label: "Online Tutors" },
];

const CtaButton = ({ label = "Get Started Free — No Credit Card", size = "lg" }: { label?: string; size?: "lg" | "default" }) => (
  <Button
    size={size}
    className="w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/30 text-base font-bold px-8 py-6 h-auto rounded-xl"
    asChild
    data-testid="button-ads-cta"
  >
    <Link href="/signup">
      <Sparkles className="w-5 h-5 mr-2" />
      {label}
      <ArrowRight className="w-5 h-5 ml-2" />
    </Link>
  </Button>
);

export default function AdsLanding() {
  const { data: stats } = useQuery<{ totalUsers: number; totalContent: number }>({
    queryKey: ['/api/public/stats'],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40 flex flex-col">

      {/* Minimal Nav */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="BrightBoard" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-lg">BrightBoard</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild data-testid="button-ads-login">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild className="bg-primary text-white" data-testid="button-ads-signup-nav">
            <Link href="/signup">Start Free</Link>
          </Button>
        </div>
      </nav>

      <main className="flex-1">

        {/* ── HERO ── */}
        <section className="px-4 pt-10 pb-8 text-center max-w-2xl mx-auto">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm font-medium" data-testid="badge-ads-hero">
            🌏 Trusted by educators across Southeast Asia
          </Badge>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent">
              Save 5 Hours Every Week
            </span>
            <span className="block mt-1 text-foreground text-3xl md:text-4xl">
              with AI-Powered Lesson Content
            </span>
          </h1>

          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            BrightBoard creates <strong>presentations, mind maps, worksheets, stories, games & videos</strong> in seconds — so you can focus on teaching, not designing.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
            <CtaButton />
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-green-500" /> 7-day money-back guarantee</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-500" /> Cancel anytime</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-teal-500" /> Available in 12+ languages</span>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="px-4 pb-8 max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20" data-testid="card-ads-stat-users">
              <div className="text-3xl font-bold text-primary">{stats?.totalUsers ? `${stats.totalUsers.toLocaleString()}+` : "2,000+"}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1"><Users className="w-3 h-3" /> Educators joined</div>
            </Card>
            <Card className="text-center p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/20" data-testid="card-ads-stat-content">
              <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">{stats?.totalContent ? `${stats.totalContent.toLocaleString()}+` : "15,000+"}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1"><Zap className="w-3 h-3" /> Resources created</div>
            </Card>
          </div>
        </section>

        {/* ── WHO IT'S FOR ── */}
        <section className="px-4 pb-8 max-w-2xl mx-auto">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Built for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {audiences.map((a) => (
              <div key={a.label} className="flex items-center gap-2 bg-muted/60 px-4 py-2 rounded-full text-sm font-medium" data-testid={`badge-audience-${a.label.toLowerCase().replace(/\s/g, '-')}`}>
                <span>{a.emoji}</span>
                <span>{a.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="px-4 pb-10 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Everything You Need</h2>
          <p className="text-center text-muted-foreground text-sm mb-6">Six powerful tools. One simple platform.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <Card key={f.title} className="p-4 hover:shadow-md transition-shadow" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${f.bg} flex-shrink-0`}>
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{f.title}</h3>
                      {f.badge && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">{f.badge}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="px-4 pb-10 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Teachers Love BrightBoard</h2>
          <div className="flex flex-col gap-4">
            {testimonials.map((t) => (
              <Card key={t.name} className="p-4 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent" data-testid={`card-testimonial-${t.name.split(' ')[0].toLowerCase()}`}>
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-3 italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="px-4 pb-16 max-w-2xl mx-auto">
          <Card className="p-6 md:p-8 text-center bg-gradient-to-br from-primary/10 via-purple-500/10 to-teal-500/10 border-primary/20">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to Save Hours Every Week?</h2>
            <p className="text-muted-foreground mb-6 text-sm">Join thousands of educators across Southeast Asia who create better content in less time.</p>
            <CtaButton label="Create Your Free Account Now" />
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span>No credit card required · Free to start · Cancel anytime</span>
            </div>
          </Card>
        </section>

      </main>

      {/* Minimal Footer */}
      <footer className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1 mb-2">
          <img src="/favicon.png" alt="BrightBoard" className="w-5 h-5 rounded" />
          <span className="font-semibold text-foreground">BrightBoard</span>
        </div>
        <p className="mb-2">AI-Powered Content Creation for Educators</p>
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
        <a
          href="https://www.facebook.com/share/1Degjg2YnK/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#1877F2] hover:underline"
        >
          <SiFacebook className="w-3 h-3" /> Follow us on Facebook
        </a>
      </footer>
    </div>
  );
}
