import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, Image, FileText, Presentation, Video, FileSpreadsheet, 
  ChevronLeft, ChevronRight, Shield, Clock, CreditCard, Users, 
  FileCheck, Play, Star, Gamepad2, Globe, Zap,
  GraduationCap, School, Award
} from "lucide-react";
import { Footer } from "@/components/footer";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const showcaseSlides = [
  {
    titleKey: "Generate Educational Images",
    descriptionKey: "Create beautiful, child-friendly illustrations for any topic in seconds",
    icon: Image,
    color: "from-pink-500 to-rose-500",
  },
  {
    titleKey: "Build Complete Presentations",
    descriptionKey: "Full slide decks with images and speaker notes, ready to teach",
    icon: Presentation,
    color: "from-blue-500 to-cyan-500",
  },
  {
    titleKey: "Design Printable Worksheets",
    descriptionKey: "Fill-in-blanks, multiple choice, and writing prompts with answer keys",
    icon: FileSpreadsheet,
    color: "from-orange-500 to-amber-500",
  },
  {
    titleKey: "Create Interactive Games",
    descriptionKey: "Lucky Spinner, Memory Match, Quiz Show and more - playable online",
    icon: Gamepad2,
    color: "from-green-500 to-emerald-500",
  },
  {
    titleKey: "Plan Video Storyboards",
    descriptionKey: "Frame-by-frame visual guides with AI narration and background music",
    icon: Video,
    color: "from-purple-500 to-violet-500",
  },
  {
    titleKey: "Generate Text Content",
    descriptionKey: "Stories, explanations, and learning materials for any grade level",
    icon: FileText,
    color: "from-teal-500 to-cyan-500",
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Primary School Teacher",
    location: "United Kingdom",
    quote: "BrightBoard has transformed my lesson planning. What used to take hours now takes minutes. My students love the colorful presentations!",
    rating: 5,
  },
  {
    name: "James K.",
    role: "High School Science Teacher",
    location: "Kenya",
    quote: "The interactive games feature is amazing. My students are more engaged than ever. The Lucky Spinner has become a classroom favorite!",
    rating: 5,
  },
  {
    name: "Maria L.",
    role: "ESL Instructor",
    location: "Spain",
    quote: "As a language teacher, I love that BrightBoard supports multiple languages. Creating bilingual worksheets is now so easy!",
    rating: 5,
  },
  {
    name: "David O.",
    role: "Elementary Teacher",
    location: "Uganda",
    quote: "The video storyboards with AI narration have helped me create educational content that my students can watch at home. Incredible tool!",
    rating: 5,
  },
];

const sampleContent = [
  {
    type: "Presentation",
    title: "The Solar System",
    description: "10-slide presentation with images",
    gradient: "from-blue-500 to-purple-500",
    icon: Presentation,
  },
  {
    type: "Worksheet",
    title: "Math Practice",
    description: "Addition & subtraction exercises",
    gradient: "from-orange-500 to-red-500",
    icon: FileSpreadsheet,
  },
  {
    type: "Game",
    title: "Vocabulary Spinner",
    description: "Interactive word game",
    gradient: "from-green-500 to-teal-500",
    icon: Gamepad2,
  },
  {
    type: "Storyboard",
    title: "Photosynthesis",
    description: "8-frame animated video",
    gradient: "from-purple-500 to-pink-500",
    icon: Video,
  },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: stats } = useQuery<{ totalUsers: number; totalContent: number }>({
    queryKey: ['/api/public/stats'],
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % showcaseSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % showcaseSlides.length);

  const faqs = [
    { question: t('landing.faq1Question'), answer: t('landing.faq1Answer') },
    { question: t('landing.faq2Question'), answer: t('landing.faq2Answer') },
    { question: t('landing.faq3Question'), answer: t('landing.faq3Answer') },
    { question: t('landing.faq4Question'), answer: t('landing.faq4Answer') },
    { question: t('landing.faq5Question'), answer: t('landing.faq5Answer') },
    { question: t('landing.faq6Question'), answer: t('landing.faq6Answer') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/favicon.png" 
              alt="BrightBoard" 
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-bold text-xl">BrightBoard</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="#features" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">{t('common.features')}</a>
            <a href="#demo" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-demo">{t('landing.watchDemo')}</a>
            <Link href="/file-tools" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-file-tools">{t('common.fileTools')}</Link>
            <LanguageSelector />
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <Link href="/login">{t('common.signIn')}</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent">{t('landing.heroTitle')}</span>
              <span className="block text-2xl md:text-4xl mt-2 text-foreground/80">{t('landing.heroSubtitle')}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t('landing.heroDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" asChild data-testid="button-get-started">
                <Link href="/signup">{t('common.getStarted')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-watch-demo">
                <a href="#demo">
                  <Play className="w-4 h-4 mr-2" />
                  {t('landing.watchDemo')}
                </a>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span>{t('landing.trustMoneyBack')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span>{t('landing.trustCancel')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
                <span>{t('landing.trustSecure')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-500" />
                <span>{t('landing.trustLanguages')}</span>
              </div>
            </div>
          </div>

          {/* Usage Stats Counter */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {stats?.totalUsers ? stats.totalUsers.toLocaleString() : "500"}+
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Users className="w-4 h-4" />
                  {t('landing.teachersJoined')}
                </div>
              </Card>
              <Card className="text-center p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/20">
                <div className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400">
                  {stats?.totalContent ? stats.totalContent.toLocaleString() : "2,500"}+
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <FileCheck className="w-4 h-4" />
                  {t('landing.resourcesCreated')}
                </div>
              </Card>
            </div>
          </div>

          {/* Showcase Carousel */}
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border p-8">
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={prevSlide}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-background/80 border flex items-center justify-center transition-colors hover-elevate"
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
                        <h3 className="text-2xl font-bold mb-2">{slide.titleKey}</h3>
                        <p className="text-muted-foreground text-lg max-w-md">{slide.descriptionKey}</p>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={nextSlide}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-background/80 border flex items-center justify-center transition-colors hover-elevate"
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
                        : 'bg-muted-foreground/30'
                    }`}
                    data-testid={`button-slide-${index}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Video Demo Section */}
        <section id="demo" className="container mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">{t('landing.demoTitle')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.demoSubtitle')}
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/30 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-800/90">
                <div className="text-center" data-testid="demo-video-container">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg hover-elevate cursor-pointer" data-testid="button-play-demo">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                  <p className="text-white/80 text-lg">{t('landing.demoPlayButton')}</p>
                  <p className="text-white/60 text-sm mt-2">{t('landing.demoPlaySubtext')}</p>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 flex-wrap">
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white/90 text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  {t('landing.demoInstant')}
                </div>
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white/90 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  {t('landing.demoAIPowered')}
                </div>
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white/90 text-xs flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-blue-400" />
                  {t('landing.demoTeacherDesigned')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Content Gallery */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('landing.sampleTitle')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('landing.sampleSubtitle')}
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {sampleContent.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Card key={index} className="group hover-elevate overflow-hidden" data-testid={`sample-card-${index}`}>
                  <div className={`h-32 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <IconComponent className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardContent className="p-4">
                    <div className="text-xs text-primary font-medium mb-1">{item.type}</div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="text-center mt-8">
            <Button asChild data-testid="button-try-free">
              <Link href="/signup">
                <Sparkles className="w-4 h-4 mr-2" />
                {t('landing.tryFree')}
              </Link>
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t('landing.featuresTitle')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Image className="w-6 h-6" />}
              title={t('contentTypes.image')}
              description={t('contentTypes.imageDesc')}
            />
            <FeatureCard 
              icon={<Presentation className="w-6 h-6" />}
              title={t('contentTypes.presentation')}
              description={t('contentTypes.presentationDesc')}
            />
            <FeatureCard 
              icon={<FileText className="w-6 h-6" />}
              title={t('contentTypes.text')}
              description={t('contentTypes.textDesc')}
            />
            <FeatureCard 
              icon={<Video className="w-6 h-6" />}
              title={t('contentTypes.storyboard')}
              description={t('contentTypes.storyboardDesc')}
            />
            <FeatureCard 
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title={t('contentTypes.worksheet')}
              description={t('contentTypes.worksheetDesc')}
            />
            <FeatureCard 
              icon={<Gamepad2 className="w-6 h-6" />}
              title={t('contentTypes.activity')}
              description={t('contentTypes.activityDesc')}
            />
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('landing.testimonialTitle')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('landing.testimonialSubtitle')}
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6" data-testid={`testimonial-card-${index}`}>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role} - {testimonial.location}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('landing.faqTitle')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('landing.faqSubtitle')}
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline" data-testid={`faq-trigger-${index}`}>
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-16">
          <Card className="max-w-4xl mx-auto p-8 md:p-12 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('landing.ctaTitle')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t('landing.ctaSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild data-testid="button-start-free">
                  <Link href="/signup">
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t('landing.ctaButton')}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-view-pricing">
                  <Link href="/pricing">{t('landing.ctaViewPricing')}</Link>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4" />
                  <span>{t('landing.ctaCountries')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>{t('landing.ctaFreeDaily')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>{t('landing.ctaMadeForEducators')}</span>
                </div>
              </div>
            </div>
          </Card>
        </section>

      </main>

      <Footer />
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
