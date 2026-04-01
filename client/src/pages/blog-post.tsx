import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, BookOpen, CheckCircle2, Lightbulb, Sparkles, GraduationCap } from "lucide-react";
import { Footer } from "@/components/footer";
import { useEffect } from "react";
import { articles } from "../../../shared/blog-data";


export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const article = articles[slug];

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | BrightBoard Blog`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", article.excerpt);
      else {
        const m = document.createElement("meta");
        m.name = "description";
        m.content = article.excerpt;
        document.head.appendChild(m);
      }
    }
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container max-w-3xl mx-auto px-4 py-16 text-center flex-1">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Link href="/blog">
            <Button><ArrowLeft className="w-4 h-4 mr-2" />Back to Blog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-3xl mx-auto px-4 py-8 flex-1">
        <Link href="/blog">
          <Button variant="ghost" className="mb-6" data-testid="button-back-blog">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="text-xs font-medium">{article.category}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />{article.readTime}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-5" data-testid="text-article-title">
              {article.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
              {article.excerpt}
            </p>
          </header>

          <div className="space-y-10">
            {article.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-2xl font-semibold mb-5 flex items-center gap-2">
                  {i === 0 && <Lightbulb className="w-6 h-6 text-primary flex-shrink-0" />}
                  {i === 1 && <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />}
                  {i === 2 && <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />}
                  {section.heading}
                </h2>
                <div className="space-y-4">
                  {section.paragraphs.map((para, j) => (
                    <p key={j} className="text-foreground leading-relaxed">{para}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-8 text-center border border-primary/20">
            <GraduationCap className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Put this into practice with BrightBoard</h3>
            <p className="text-muted-foreground mb-5 max-w-lg mx-auto">
              Create AI-powered mind maps, presentations, worksheets, games and more — all designed specifically for teachers.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/signup">
                <Button data-testid="button-article-signup">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              <Link href="/blog">
                <Button variant="outline" data-testid="button-more-articles">
                  <BookOpen className="w-4 h-4 mr-2" />
                  More Articles
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </div>
      <Footer />
    </div>
  );
}
