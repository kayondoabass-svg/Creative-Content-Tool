import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Clock, Brain, Target, Palette, Gamepad2, Users, ClipboardList, Network, Image, FileSpreadsheet, ArrowRight, Sparkles, GraduationCap, Heart } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useEffect } from "react";

const articles = [
  {
    id: "ai-classroom",
    icon: Brain,
    color: "from-purple-500 to-violet-500",
    category: "AI in Education",
    title: "How AI is Transforming Classroom Education in 2025",
    excerpt: "Artificial intelligence is no longer a futuristic concept — it is actively reshaping how teachers prepare lessons and how students experience learning. AI tools are collapsing preparation time from hours to minutes, freeing teachers to focus on what matters most: the human connection with students.",
    readTime: "8 min read",
  },
  {
    id: "engagement-strategies",
    icon: Target,
    color: "from-teal-500 to-cyan-500",
    category: "Teaching Strategies",
    title: "10 Student Engagement Strategies That Actually Work in 2025",
    excerpt: "Student disengagement costs years of learning. These research-backed strategies — enhanced with AI tools — are proven to recapture attention and deepen participation across all age groups and subjects.",
    readTime: "10 min read",
  },
  {
    id: "visual-learning",
    icon: Palette,
    color: "from-pink-500 to-rose-500",
    category: "Research",
    title: "The Science of Visual Learning: Why Images Make Lessons Stick",
    excerpt: "Decades of cognitive science research confirm that humans process images 60,000 times faster than text. Here is how teachers can harness this power to create lessons that students genuinely remember weeks and months later.",
    readTime: "7 min read",
  },
  {
    id: "gamification",
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
    category: "Teaching Strategy",
    title: "Gamification in the Classroom: A Practical Guide for Teachers",
    excerpt: "Gamification is not about turning lessons into video games — it is about applying the psychology of games to unlock motivation and deep engagement. Here is how to do it effectively, with specific activity formats that work.",
    readTime: "9 min read",
  },
  {
    id: "time-saving",
    icon: Clock,
    color: "from-amber-500 to-orange-500",
    category: "Productivity",
    title: "How AI Saves Teachers 5+ Hours Every Week",
    excerpt: "Teacher burnout is at record levels globally. AI content tools are giving educators hours back each week — here is exactly where the time savings happen and how to build habits that compound over the school year.",
    readTime: "6 min read",
  },
  {
    id: "inclusive-education",
    icon: Users,
    color: "from-blue-500 to-indigo-500",
    category: "Inclusion",
    title: "Creating Inclusive Classrooms with AI: A Practical Guide",
    excerpt: "Inclusive education means every student has access to learning that meets their needs. AI tools are making differentiation — previously one of the most time-consuming teaching skills — achievable for every teacher, in every classroom.",
    readTime: "8 min read",
  },
  {
    id: "lesson-planning",
    icon: ClipboardList,
    color: "from-violet-500 to-purple-500",
    category: "Teaching",
    title: "The Complete Guide to AI-Assisted Lesson Planning",
    excerpt: "A well-structured lesson plan is the foundation of effective teaching. AI tools are transforming lesson planning from a burden into a creative process — here is how to make the most of them, from objective setting to full resource packs.",
    readTime: "7 min read",
  },
  {
    id: "vocabulary-visual",
    icon: Image,
    color: "from-rose-500 to-pink-500",
    category: "Teaching",
    title: "Teaching Vocabulary with Visuals: Why Pictures Beat Definitions",
    excerpt: "Most vocabulary instruction is ineffective because it relies on definitions — one form of abstract text to explain another. Pairing words with strong visual images produces dramatically better retention, according to decades of linguistic research.",
    readTime: "9 min read",
  },
  {
    id: "worksheet-design",
    icon: FileSpreadsheet,
    color: "from-orange-500 to-amber-500",
    category: "Teaching Strategy",
    title: "How to Design Effective Worksheets That Students Actually Learn From",
    excerpt: "Most worksheets are busy work. The best ones are carefully calibrated to build skills and deepen understanding. Here is what the research says about effective worksheet design — and how AI is making it accessible to every teacher.",
    readTime: "8 min read",
  },
  {
    id: "mind-mapping",
    icon: Network,
    color: "from-teal-500 to-green-500",
    category: "Research",
    title: "The Power of Mind Mapping in Education: A Research-Based Guide",
    excerpt: "Mind maps are one of the most versatile and effective tools in education — useful for brainstorming, note-taking, revision, and concept introduction. Here is what cognitive science says about why they work and how to use them effectively.",
    readTime: "10 min read",
  },
  {
    id: "stem-africa",
    icon: GraduationCap,
    color: "from-green-600 to-teal-600",
    category: "Education Policy",
    title: "STEM Education in Africa: Why Science and Technology Must Come First",
    excerpt: "Africa's fastest-growing economies are being shaped by technology, engineering, and innovation. Yet STEM education in many schools remains underfunded and under-resourced. Here is what teachers can do right now — with or without a laboratory.",
    readTime: "9 min read",
  },
  {
    id: "storytelling-education",
    icon: BookOpen,
    color: "from-fuchsia-500 to-pink-500",
    category: "Teaching Strategies",
    title: "The Art of Storytelling in Education: Making Every Lesson Memorable",
    excerpt: "Humans have learned through stories for 100,000 years. The brain is wired for narrative in a way it is simply not wired for bullet points. Here is how to use storytelling to make any lesson in any subject dramatically more memorable.",
    readTime: "8 min read",
  },
  {
    id: "differentiated-instruction",
    icon: Users,
    color: "from-sky-500 to-blue-500",
    category: "Teaching Strategies",
    title: "Differentiated Instruction: A Practical Guide for Busy Teachers",
    excerpt: "Every class contains students at wildly different points in their learning journey. Differentiated instruction means meeting each of them where they are — without working three times as hard. Here is how to do it practically and sustainably.",
    readTime: "9 min read",
  },
  {
    id: "classroom-culture",
    icon: Heart,
    color: "from-rose-500 to-red-500",
    category: "Classroom Management",
    title: "Building a Positive Classroom Culture: From Chaos to Community",
    excerpt: "The most effective classroom management is not about control — it is about building a community where students want to behave well because they belong. Here is how to create that culture deliberately and sustain it through the pressures of a school year.",
    readTime: "8 min read",
  },
  {
    id: "assessment-learning",
    icon: ClipboardList,
    color: "from-orange-500 to-red-500",
    category: "Assessment",
    title: "Assessment for Learning: Moving Beyond Tests and Grades",
    excerpt: "The most powerful assessment tool is not a test — it is a well-timed question. Assessment for learning means using information about what students know to improve teaching in real time, rather than to rank students after the fact.",
    readTime: "8 min read",
  },
  {
    id: "teacher-self-care",
    icon: Sparkles,
    color: "from-amber-500 to-yellow-500",
    category: "Teacher Wellbeing",
    title: "Teacher Self-Care: The Professional Case for Looking After Yourself",
    excerpt: "Teacher burnout is not a personal failure — it is a systemic problem with serious consequences for students. Here is why self-care is a professional responsibility, not a luxury, and what sustainable teaching practice actually looks like.",
    readTime: "7 min read",
  },
  {
    id: "project-based-learning",
    icon: Target,
    color: "from-violet-600 to-purple-600",
    category: "Teaching Strategies",
    title: "Project-Based Learning: A Complete Classroom Guide",
    excerpt: "Project-based learning develops the real-world skills students will actually need — collaboration, problem-solving, communication, and self-management — while covering curriculum content. Here is how to design and deliver it effectively.",
    readTime: "10 min read",
  },
  {
    id: "early-childhood",
    icon: Image,
    color: "from-lime-500 to-green-500",
    category: "Early Years",
    title: "Early Childhood Education: Building the Foundations That Last a Lifetime",
    excerpt: "The research is unequivocal: what happens in the first eight years of a child's education shapes their academic trajectory, emotional wellbeing, and life outcomes more than any other period. Here is what every early years teacher needs to know.",
    readTime: "8 min read",
  },
  {
    id: "parent-teacher",
    icon: Users,
    color: "from-cyan-500 to-teal-500",
    category: "School Community",
    title: "Parent-Teacher Communication: Building Partnerships That Help Students Thrive",
    excerpt: "The most effective school communities treat parents as partners, not recipients of information. When teachers and parents work together, students perform better, attend more reliably, and develop stronger social skills.",
    readTime: "7 min read",
  },
];

export default function Blog() {
  useEffect(() => {
    document.title = "Teaching Resources & Insights | BrightBoard Blog";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Expert articles, practical strategies, and research-backed tips for educators. Learn about AI in education, visual learning, gamification, lesson planning, and inclusive teaching.";
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
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent" data-testid="text-blog-title">
              Teaching Resources & Insights
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Research-backed articles, practical strategies, and expert guidance for modern educators. Written to help teachers do their best work every day.
          </p>
        </div>

        <div className="space-y-5">
          {articles.map((article) => {
            const IconComponent = article.icon;
            return (
              <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`blog-article-${article.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${article.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs font-medium">{article.category}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                      </div>
                      <CardTitle className="text-xl mb-2 leading-snug">{article.title}</CardTitle>
                      <p className="text-muted-foreground text-sm leading-relaxed">{article.excerpt}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link href={`/blog/${article.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-read-${article.id}`}>
                      Read Full Article
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 text-center">
            <GraduationCap className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-3">Ready to Transform Your Teaching?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              BrightBoard gives you AI-powered mind maps, presentations, worksheets, games, and more — all built for teachers, all ready in seconds.
            </p>
            <Button asChild size="lg" data-testid="button-blog-signup">
              <Link href="/signup">
                <Sparkles className="w-4 h-4 mr-2" />
                Get Started Free
              </Link>
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
