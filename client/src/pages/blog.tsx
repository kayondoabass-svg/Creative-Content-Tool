import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, Lightbulb, GraduationCap, Sparkles, Users, Brain, Target, Palette, Gamepad2, Presentation, FileText, Video, Image, FileSpreadsheet, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

const articles = [
  {
    id: "ai-classroom",
    icon: Brain,
    color: "from-purple-500 to-violet-500",
    category: "blog.categoryAI",
    titleKey: "blog.article1Title",
    excerptKey: "blog.article1Excerpt",
    readTime: "8 min",
    contentKeys: ["blog.article1P1", "blog.article1P2", "blog.article1P3", "blog.article1P4", "blog.article1P5", "blog.article1P6"],
    subtitleKeys: ["blog.article1Sub1", "blog.article1Sub2", "blog.article1Sub3"],
  },
  {
    id: "engagement-strategies",
    icon: Target,
    color: "from-teal-500 to-cyan-500",
    category: "blog.categoryTeaching",
    titleKey: "blog.article2Title",
    excerptKey: "blog.article2Excerpt",
    readTime: "10 min",
    contentKeys: ["blog.article2P1", "blog.article2P2", "blog.article2P3", "blog.article2P4", "blog.article2P5", "blog.article2P6"],
    subtitleKeys: ["blog.article2Sub1", "blog.article2Sub2", "blog.article2Sub3"],
  },
  {
    id: "visual-learning",
    icon: Palette,
    color: "from-pink-500 to-rose-500",
    category: "blog.categoryResearch",
    titleKey: "blog.article3Title",
    excerptKey: "blog.article3Excerpt",
    readTime: "7 min",
    contentKeys: ["blog.article3P1", "blog.article3P2", "blog.article3P3", "blog.article3P4", "blog.article3P5", "blog.article3P6"],
    subtitleKeys: ["blog.article3Sub1", "blog.article3Sub2", "blog.article3Sub3"],
  },
  {
    id: "gamification",
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
    category: "blog.categoryStrategy",
    titleKey: "blog.article4Title",
    excerptKey: "blog.article4Excerpt",
    readTime: "9 min",
    contentKeys: ["blog.article4P1", "blog.article4P2", "blog.article4P3", "blog.article4P4", "blog.article4P5", "blog.article4P6"],
    subtitleKeys: ["blog.article4Sub1", "blog.article4Sub2", "blog.article4Sub3"],
  },
  {
    id: "time-saving",
    icon: Clock,
    color: "from-amber-500 to-orange-500",
    category: "blog.categoryProductivity",
    titleKey: "blog.article5Title",
    excerptKey: "blog.article5Excerpt",
    readTime: "6 min",
    contentKeys: ["blog.article5P1", "blog.article5P2", "blog.article5P3", "blog.article5P4", "blog.article5P5", "blog.article5P6"],
    subtitleKeys: ["blog.article5Sub1", "blog.article5Sub2", "blog.article5Sub3"],
  },
  {
    id: "inclusive-education",
    icon: Users,
    color: "from-blue-500 to-indigo-500",
    category: "blog.categoryInclusion",
    titleKey: "blog.article6Title",
    excerptKey: "blog.article6Excerpt",
    readTime: "8 min",
    contentKeys: ["blog.article6P1", "blog.article6P2", "blog.article6P3", "blog.article6P4", "blog.article6P5", "blog.article6P6"],
    subtitleKeys: ["blog.article6Sub1", "blog.article6Sub2", "blog.article6Sub3"],
  },
];

export default function Blog() {
  const { t } = useTranslation();
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Teaching Resources & Insights | BrightBoard";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Expert articles, practical strategies, and research-backed tips for educators. Learn about AI in education, visual learning, gamification, and inclusive teaching.");
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Expert articles, practical strategies, and research-backed tips for educators. Learn about AI in education, visual learning, gamification, and inclusive teaching.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-5xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("blog.backHome")}
          </Button>
        </Link>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent" data-testid="text-blog-title">
              {t("blog.title")}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("blog.subtitle")}
          </p>
        </div>

        <div className="space-y-6">
          {articles.map((article) => {
            const IconComponent = article.icon;
            const isExpanded = expandedArticle === article.id;

            return (
              <Card key={article.id} className="overflow-hidden" data-testid={`blog-article-${article.id}`}>
                <CardHeader className="cursor-pointer" onClick={() => setExpandedArticle(isExpanded ? null : article.id)}>
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${article.color} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {t(article.category)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                      </div>
                      <CardTitle className="text-xl mb-2">{t(article.titleKey)}</CardTitle>
                      <p className="text-muted-foreground">{t(article.excerptKey)}</p>
                    </div>
                    <ArrowRight className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 mt-2 ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 pt-6">
                      <p className="text-foreground leading-relaxed">{t(article.contentKeys[0])}</p>

                      <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        {t(article.subtitleKeys[0])}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{t(article.contentKeys[1])}</p>
                      <p className="text-muted-foreground leading-relaxed">{t(article.contentKeys[2])}</p>

                      <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        {t(article.subtitleKeys[1])}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{t(article.contentKeys[3])}</p>
                      <p className="text-muted-foreground leading-relaxed">{t(article.contentKeys[4])}</p>

                      <h3 className="text-lg font-semibold flex items-center gap-2 mt-6">
                        <Sparkles className="w-5 h-5 text-primary" />
                        {t(article.subtitleKeys[2])}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{t(article.contentKeys[5])}</p>

                      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4 mt-6">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          {t("blog.tryBrightBoard")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <h2 className="text-2xl font-bold mb-3">{t("blog.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">{t("blog.ctaText")}</p>
            <Button asChild data-testid="button-blog-signup">
              <Link href="/signup">
                <Sparkles className="w-4 h-4 mr-2" />
                {t("common.getStarted")}
              </Link>
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
