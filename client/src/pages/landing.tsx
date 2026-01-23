import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Image, FileText, Presentation, Gamepad2, Video, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";

const showcaseSlides = [
  {
    title: "Generate Educational Images",
    description: "Create beautiful, child-friendly illustrations for any topic in seconds",
    icon: Image,
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Build Complete Presentations",
    description: "Full slide decks with images and speaker notes, ready to teach",
    icon: Presentation,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Create Engaging Activities",
    description: "Quizzes, matching games, and interactive exercises for your classroom",
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Design Printable Worksheets",
    description: "Fill-in-blanks, multiple choice, and writing prompts with answer keys",
    icon: FileSpreadsheet,
    color: "from-orange-500 to-amber-500",
  },
  {
    title: "Plan Video Storyboards",
    description: "Frame-by-frame visual guides for educational video production",
    icon: Video,
    color: "from-purple-500 to-violet-500",
  },
  {
    title: "Generate Text Content",
    description: "Stories, explanations, and learning materials for any grade level",
    icon: FileText,
    color: "from-teal-500 to-cyan-500",
  },
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % showcaseSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % showcaseSlides.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">BrightBoard</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <section className="container mx-auto px-4 py-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent">Voice or Text to Reality</span>
              <span className="block text-2xl md:text-4xl mt-2 text-foreground/80">Content for Busy Teachers</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Create stunning educational images, presentations, activities, worksheets, and video storyboards in seconds. Let AI do the heavy lifting so you can focus on what matters most - your students.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started Free</a>
              </Button>
            </div>
          </div>

          {/* Showcase Carousel */}
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border p-8">
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={prevSlide}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-background/80 hover:bg-background border flex items-center justify-center transition-colors"
                  data-testid="button-prev-slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 text-center min-h-[180px] flex flex-col items-center justify-center">
                  {showcaseSlides.map((slide, index) => {
                    const IconComponent = slide.icon;
                    return (
                      <div
                        key={index}
                        className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500 ${
                          index === currentSlide 
                            ? 'opacity-100 translate-x-0' 
                            : index < currentSlide 
                              ? 'opacity-0 -translate-x-full' 
                              : 'opacity-0 translate-x-full'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center mb-4 shadow-lg`}>
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{slide.title}</h3>
                        <p className="text-muted-foreground text-lg max-w-md">{slide.description}</p>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={nextSlide}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-background/80 hover:bg-background border flex items-center justify-center transition-colors"
                  data-testid="button-next-slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Slide indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {showcaseSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-primary w-6' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    data-testid={`button-slide-${index}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Create Amazing Content</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Image className="w-6 h-6" />}
              title="Educational Images"
              description="Generate beautiful, classroom-ready illustrations that bring concepts to life"
            />
            <FeatureCard 
              icon={<Presentation className="w-6 h-6" />}
              title="Presentations"
              description="Create complete slide decks with images and speaker notes in minutes"
            />
            <FeatureCard 
              icon={<FileText className="w-6 h-6" />}
              title="Text Content"
              description="Generate stories, explanations, and learning materials tailored to any grade level"
            />
            <FeatureCard 
              icon={<Gamepad2 className="w-6 h-6" />}
              title="Activities & Games"
              description="Design interactive quizzes, matching games, and engaging classroom activities"
            />
            <FeatureCard 
              icon={<Video className="w-6 h-6" />}
              title="Video Storyboards"
              description="Plan animated educational videos with frame-by-frame visual guides"
            />
            <FeatureCard 
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="Worksheets"
              description="Generate printable worksheets with questions, fill-in-blanks, and more"
            />
          </div>
        </section>

      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BrightBoard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

