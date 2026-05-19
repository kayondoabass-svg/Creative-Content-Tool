import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { useEffect, useState } from "react";
import { ArrowLeft, Lightbulb, Sparkles, GraduationCap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const allTips = [
  { id: 1, category: "Engagement", tip: "Start every lesson with a question, not an explanation. Curiosity opens the brain to learning far more effectively than a direct instruction.", why: "Questions activate prior knowledge, create cognitive dissonance, and signal to students that their thinking matters." },
  { id: 2, category: "Relationships", tip: "Use students' names as often as possible in class discussions and written feedback. It signals that you see them as individuals, not as a group.", why: "Research shows that being named by a teacher increases student engagement and sense of belonging significantly." },
  { id: 3, category: "Feedback", tip: "Praise the process, not the result. 'I can see how hard you thought through this problem' outlasts 'well done' by months in terms of motivational impact.", why: "Process praise builds a growth mindset. Result praise can make students fear trying difficult things in case they fail." },
  { id: 4, category: "Discussion", tip: "A two-minute pair discussion before whole-class sharing doubles the quality of contributions and triples the number of students willing to speak.", why: "Processing ideas with a partner reduces the anxiety of public contribution and improves the clarity of thinking." },
  { id: 5, category: "Professional Development", tip: "Read one research article about teaching every month. Even one actionable idea per month compounds into a dramatically different teacher over a five-year career.", why: "Teachers who stay connected to research continuously improve in ways that purely experience-based development does not produce." },
  { id: 6, category: "Classroom Environment", tip: "Display student work at students' eye level, not adults' eye level. It communicates clearly whose classroom this is and whose thinking is valued.", why: "Physical environment communicates values. Eye-level displays signal that children's perspectives are central." },
  { id: 7, category: "Questioning", tip: "The best classroom question is one you genuinely do not know the answer to. Students can tell the difference — and respond to real questions with real thinking.", why: "Authentic questions invite authentic responses. Performative questions invite performative answers." },
  { id: 8, category: "Assessment", tip: "End every lesson with an exit ticket — even just one question. It takes three minutes and tells you precisely what to teach differently tomorrow.", why: "Exit tickets are the most time-efficient formative assessment tool available. The information they provide is immediate and actionable." },
  { id: 9, category: "Wellbeing", tip: "Set a firm preparation time limit and stop when it is reached. The belief that more preparation always means better lessons is not supported by evidence.", why: "Teacher wellbeing directly affects student outcomes. Unsustainable preparation habits accelerate burnout without proportional benefit." },
  { id: 10, category: "Visual Learning", tip: "Add at least one image to every lesson that is not decorative — an image that carries part of the conceptual content students need to understand.", why: "Dual coding theory shows that information encoded in both verbal and visual channels is retained significantly better." },
  { id: 11, category: "Collaboration", tip: "Change group composition regularly. No student should spend the entire term in the same ability group — flexible grouping produces better outcomes for all.", why: "Fixed ability grouping reinforces self-concept limitations. Flexible grouping builds a more realistic, dynamic sense of competence." },
  { id: 12, category: "Engagement", tip: "Give students a genuine choice — of task format, topic, or approach — at least once per week. Autonomy is one of the three core drivers of intrinsic motivation.", why: "Self-determination theory shows that autonomy, competence, and relatedness are the foundations of sustained motivation." },
  { id: 13, category: "Classroom Management", tip: "Establish three to five class norms with student input at the start of the year — and refer back to them when they are violated, not just when they are observed.", why: "Student-created norms generate ownership and buy-in. They are more powerful than rules imposed by authority." },
  { id: 14, category: "Memory", tip: "Space your retrieval practice — instead of reviewing a topic immediately after teaching it, revisit it two days later, then a week later, then a month later.", why: "The spacing effect is one of the most robust findings in memory research. Spaced retrieval outperforms massed practice dramatically." },
  { id: 15, category: "Parent Communication", tip: "Send at least one positive communication to each student's family per term before any problem-related communication. It transforms the relationship fundamentally.", why: "Parents who receive only problem-related communications disengage. Parents who receive positive communications first become allies." },
  { id: 16, category: "Storytelling", tip: "Begin at least one lesson per week with a story, anecdote, or case study that illustrates the concept before you explain it abstractly.", why: "The brain prioritises narrative information. Stories create emotional and contextual hooks that abstract explanations do not." },
  { id: 17, category: "Differentiation", tip: "Create a 'challenge extension' question for every lesson — an open-ended question that students who finish early can engage with independently.", why: "Fast finishers who have nothing meaningful to do become disruptive. Extension questions channel their energy productively." },
  { id: 18, category: "Questioning", tip: "After asking a question, wait at least five seconds before accepting an answer. The quality of responses improves dramatically with extended wait time.", why: "Research shows that increasing wait time from one second to five seconds increases the length, complexity, and confidence of student responses." },
  { id: 19, category: "Engagement", tip: "Frame content in terms of real problems students might actually encounter. 'When would you need to know this?' is the question students are silently asking in every lesson.", why: "Relevance is one of the most powerful drivers of attention and memory. Abstract content presented without context is rapidly forgotten." },
  { id: 20, category: "Visual Learning", tip: "Use colour deliberately in your materials — the same colour for the same type of information across multiple resources. Colour coding builds pattern recognition.", why: "Consistent colour use reduces cognitive load by creating predictable visual shortcuts. Students spend less effort locating information." },
  { id: 21, category: "Wellbeing", tip: "Take five minutes at the end of the school day to write down one thing that went well. Over time, this habit builds professional resilience and perspective.", why: "Gratitude practices reduce work-related stress and improve emotional resilience. Small, consistent habits outperform large, occasional interventions." },
  { id: 22, category: "Assessment", tip: "Use self-assessment frequently. Students who can accurately evaluate their own work develop metacognitive skills that improve performance across all subjects.", why: "Metacognition — thinking about thinking — is one of the highest-impact learning strategies documented in education research." },
  { id: 23, category: "Relationships", tip: "Learn something specific about each student's life outside school — a sibling's name, a favourite activity, a dream — and reference it occasionally.", why: "Students who feel known by their teacher are significantly more engaged, more trusting, and more resilient in the face of difficulty." },
  { id: 24, category: "Collaboration", tip: "Assign specific roles in group work — recorder, presenter, facilitator, timekeeper — and rotate them. Unstructured group work typically benefits only the most confident students.", why: "Role assignment ensures equitable participation and develops a broader range of skills across all students." },
  { id: 25, category: "Memory", tip: "Ask students to explain a concept to a partner immediately after you have taught it. Teaching something is the most powerful consolidation activity known to learning science.", why: "The protégé effect: the act of explaining forces students to identify gaps in their own understanding and restructure their knowledge." },
  { id: 26, category: "Classroom Management", tip: "Address the first instance of a norm violation quietly and privately before it escalates. Public correction rarely changes behaviour and often makes things worse.", why: "Private correction preserves the student's dignity and removes the audience that often motivates disruptive behaviour." },
  { id: 27, category: "Professional Development", tip: "Observe a colleague's lesson at least once per term — not to evaluate but to notice. Even experienced teachers learn new techniques from watching others.", why: "Observation is one of the most underutilised professional development tools. It costs nothing and produces immediate, practical insights." },
  { id: 28, category: "Engagement", tip: "Use unexpected, counterintuitive, or surprising facts as hooks. The brain's surprise response prioritises attention and makes the content that follows more memorable.", why: "Surprise triggers a novelty response that increases dopamine release, which in turn enhances memory consolidation." },
  { id: 29, category: "Feedback", tip: "Give feedback on one or two things at a time — never list every error in a piece of work. Students can act on two pieces of feedback; they are overwhelmed by ten.", why: "Feedback overload reduces implementation. The goal of feedback is improvement, not documentation of every weakness." },
  { id: 30, category: "Inclusion", tip: "Assume competence — always. Give the most complex version of a task first, then offer scaffolds. Offering a simplified task first communicates low expectations.", why: "Pygmalion effect: students perform closer to their teacher's expectations than to their tested ability. High expectations produce high performance." },
];

const categories = ["All", ...Array.from(new Set(allTips.map(t => t.category)))];
const categoryColors: Record<string, string> = {
  "Engagement": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Relationships": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Feedback": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Discussion": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Professional Development": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Classroom Environment": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Questioning": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Assessment": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "Wellbeing": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Visual Learning": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Collaboration": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Classroom Management": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Memory": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Parent Communication": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  "Storytelling": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "Differentiation": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "Inclusion": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function TeachingTips() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "30 Teaching Tips Every Educator Should Know | BrightBoard";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "30 research-backed teaching tips covering engagement, assessment, feedback, classroom management, and teacher wellbeing. Practical advice for every educator.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const filtered = allTips.filter(t => {
    const matchCat = selectedCategory === "All" || t.category === selectedCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || t.tip.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.why.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Lightbulb className="w-8 h-8 text-amber-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-primary bg-clip-text text-transparent" data-testid="text-tips-title">
              30 Teaching Tips
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Research-backed advice for every classroom situation — covering engagement, assessment, relationships, wellbeing, and more. Each tip includes the why behind it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tips..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-tips"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              data-testid={`filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:border-primary/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow" data-testid={`tip-card-${t.id}`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{t.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[t.category] || "bg-muted text-muted-foreground"}`}>
                        {t.category}
                      </span>
                    </div>
                    <p className="font-medium text-foreground leading-relaxed mb-2">{t.tip}</p>
                    <div className="bg-muted/50 rounded-md px-3 py-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Why it works: </span>{t.why}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No tips match your search. Try a different keyword or category.</p>
            </div>
          )}
        </div>

        <div className="mt-12">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 text-center">
            <GraduationCap className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-3">Put These Tips Into Practice with AI</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              BrightBoard helps you act on these strategies — generate worksheets, games, presentations, and more in seconds, so you can focus on the teaching that matters.
            </p>
            <Button asChild size="lg" data-testid="button-tips-signup">
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
