import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { useEffect } from "react";
import {
  ArrowLeft, Download, FileText, Gamepad2, Image, Network, Video, BookOpen,
  ClipboardList, Lightbulb, Star, ArrowRight, GraduationCap, Sparkles
} from "lucide-react";

const resourceCategories = [
  {
    icon: ClipboardList,
    color: "from-purple-500 to-violet-500",
    title: "Lesson Plan Templates",
    description: "Ready-to-use lesson plan frameworks for primary and secondary teachers across all subjects.",
    resources: [
      { name: "5-Part Lesson Plan Template", desc: "Hook → Instruction → Practice → Assessment → Reflection structure. Works for any subject, any age group.", tag: "Free" },
      { name: "Inquiry-Based Lesson Framework", desc: "Structured template for discovery learning, with student question prompts and investigation stages.", tag: "Free" },
      { name: "Cross-Curricular Lesson Planner", desc: "Link literacy, numeracy, and subject content in a single integrated lesson plan.", tag: "Free" },
    ],
  },
  {
    icon: FileText,
    color: "from-teal-500 to-cyan-500",
    title: "Worksheet Design Guides",
    description: "Best-practice guides for creating worksheets that students actually engage with and learn from.",
    resources: [
      { name: "Bloom's Taxonomy Question Starters", desc: "60 question stems organised by cognitive level — from recall to evaluation. Print and keep on your desk.", tag: "Free" },
      { name: "Worksheet Formatting Checklist", desc: "12-point checklist covering font size, white space, visual hierarchy, and accessibility for diverse learners.", tag: "Free" },
      { name: "Differentiated Task Design Guide", desc: "How to create tiered tasks at three difficulty levels from a single activity idea.", tag: "Free" },
    ],
  },
  {
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
    title: "Classroom Game Guides",
    description: "Practical guides for using games to boost engagement, reinforce content, and assess understanding.",
    resources: [
      { name: "12 Game Formats for Any Topic", desc: "Complete descriptions of Lucky Spinner, Mystery Box, Memory Match, True/False, Odd One Out, and seven more formats you can use with any curriculum topic.", tag: "Free" },
      { name: "Gamification Without Technology", desc: "How to apply game psychology — challenge levels, immediate feedback, progress visibility — using only printed materials.", tag: "Free" },
      { name: "Team vs Individual Game Selector", desc: "Decision guide for choosing the right game format based on your learning objective and class dynamics.", tag: "Free" },
    ],
  },
  {
    icon: Image,
    color: "from-pink-500 to-rose-500",
    title: "Visual Learning Resources",
    description: "Tools and guides for incorporating visual content into lessons across all subjects.",
    resources: [
      { name: "Dual Coding Quick-Start Guide", desc: "How to pair text and images to create memory hooks that last. Includes examples for maths, science, language, and humanities.", tag: "Free" },
      { name: "Mind Map Planning Sheet", desc: "A structured planning template for creating effective mind maps — with guidance on branch count, image placement, and connection types.", tag: "Free" },
      { name: "Image Selection Criteria", desc: "Six criteria for evaluating whether an image will support or distract from the learning objective.", tag: "Free" },
    ],
  },
  {
    icon: Network,
    color: "from-blue-500 to-indigo-500",
    title: "Assessment & Feedback Tools",
    description: "Practical formative assessment strategies you can implement tomorrow, with no extra preparation required.",
    resources: [
      { name: "Exit Ticket Templates (10 Formats)", desc: "Ten different exit ticket designs — from single-question to structured reflection — for different lesson types and learning objectives.", tag: "Free" },
      { name: "Feedback Sentence Starters", desc: "30 effective feedback phrases that are specific, forward-looking, and action-oriented. Suitable for written and verbal feedback.", tag: "Free" },
      { name: "Self-Assessment Traffic Light Guide", desc: "How to implement traffic light self-assessment effectively, including how to respond to what students report.", tag: "Free" },
    ],
  },
  {
    icon: BookOpen,
    color: "from-amber-500 to-orange-500",
    title: "Classroom Management",
    description: "Evidence-based strategies for building positive classroom culture and managing behaviour effectively.",
    resources: [
      { name: "Morning Meeting Guide", desc: "A complete guide to implementing 15-minute daily morning meetings that reduce disruption and build community throughout the school year.", tag: "Free" },
      { name: "Restorative Conversation Framework", desc: "A structured approach to addressing classroom conflict that repairs relationships and prevents recurrence.", tag: "Free" },
      { name: "Collaborative Norms Builder", desc: "A step-by-step process for establishing classroom norms with student input, creating genuine buy-in from day one.", tag: "Free" },
    ],
  },
];

const teachingTips = [
  "Start every lesson with a question, not an explanation — curiosity opens the brain to learning.",
  "Display student work at students' eye level, not adults' eye level. It communicates whose classroom this is.",
  "Praise the process, not the result. 'I can see how hard you worked on this' outlasts 'well done' by months.",
  "A two-minute pair discussion before whole-class sharing doubles the quality of contributions.",
  "Read one research article about teaching per month. Even one new idea per month compounds enormously over a career.",
  "Use students' names as often as possible. It signals that you see them as individuals.",
  "The best classroom question is one you genuinely do not know the answer to.",
];

export default function Resources() {
  useEffect(() => {
    document.title = "Free Teaching Resources | BrightBoard";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Free lesson plan templates, worksheet guides, game formats, assessment tools, and classroom management resources for teachers. Download and use immediately.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-5xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Download className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent" data-testid="text-resources-title">
              Free Teaching Resources
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Practical templates, guides, and tools for classroom teachers — all free, all ready to use. Created by educators, reviewed by researchers.
          </p>
        </div>

        <div className="space-y-10">
          {resourceCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <section key={cat.title}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{cat.title}</h2>
                    <p className="text-muted-foreground text-sm">{cat.description}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {cat.resources.map((r) => (
                    <Card key={r.name} className="hover:shadow-md transition-shadow" data-testid={`resource-card-${r.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-snug">{r.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs shrink-0">{r.tag}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{r.desc}</p>
                        <Link href="/signup">
                          <Button size="sm" variant="outline" className="w-full" data-testid={`button-download-${r.name.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}>
                            <Download className="w-3 h-3 mr-2" />
                            Download Free
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-14 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8">
          <div className="flex items-center gap-2 mb-5">
            <Lightbulb className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-bold">Quick Teaching Tips</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {teachingTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 bg-white dark:bg-amber-900/30 rounded-lg p-3" data-testid={`tip-item-${i}`}>
                <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/teaching-tips">
              <Button variant="outline" size="sm" data-testid="button-more-tips">
                See All 30 Teaching Tips
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 text-center">
            <GraduationCap className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-3">Generate Custom Resources with AI</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              BrightBoard lets you create worksheets, presentations, games, and mind maps tailored to your exact topic, grade level, and curriculum — in seconds.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button asChild size="lg" data-testid="button-resources-signup">
                <Link href="/signup">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Started Free
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" data-testid="button-resources-studio">
                <Link href="/studio">
                  <Video className="w-4 h-4 mr-2" />
                  See Teacher Studio
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
