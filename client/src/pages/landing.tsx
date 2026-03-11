import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, Image, FileText, Presentation, Video, FileSpreadsheet, 
  ChevronLeft, ChevronRight, Shield, Clock, CreditCard, Users, 
  FileCheck, Play, Pause, Star, Gamepad2, Globe, Zap,
  GraduationCap, School, Award, Lightbulb, Mail, CheckCircle, 
  RefreshCw, X, ArrowRight, Download, Smartphone, Monitor, Apple
} from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { Footer } from "@/components/footer";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FACEBOOK_URL = "https://www.facebook.com/share/1Degjg2YnK/";

const showcaseSlidesData = [
  { titleKey: "slideImageTitle", descKey: "slideImageDesc", icon: Image, color: "from-pink-500 to-rose-500" },
  { titleKey: "slidePresentationTitle", descKey: "slidePresentationDesc", icon: Presentation, color: "from-blue-500 to-cyan-500" },
  { titleKey: "slideWorksheetTitle", descKey: "slideWorksheetDesc", icon: FileSpreadsheet, color: "from-orange-500 to-amber-500" },
  { titleKey: "slideGameTitle", descKey: "slideGameDesc", icon: Gamepad2, color: "from-green-500 to-emerald-500" },
  { titleKey: "slideVideoTitle", descKey: "slideVideoDesc", icon: Video, color: "from-purple-500 to-violet-500" },
  { titleKey: "slideTextTitle", descKey: "slideTextDesc", icon: FileText, color: "from-teal-500 to-cyan-500" },
];

const testimonialsData = [
  { nameKey: "testimonial1Name", roleKey: "testimonial1Role", locationKey: "testimonial1Location", quoteKey: "testimonial1Quote", rating: 5 },
  { nameKey: "testimonial2Name", roleKey: "testimonial2Role", locationKey: "testimonial2Location", quoteKey: "testimonial2Quote", rating: 5 },
  { nameKey: "testimonial3Name", roleKey: "testimonial3Role", locationKey: "testimonial3Location", quoteKey: "testimonial3Quote", rating: 5 },
  { nameKey: "testimonial4Name", roleKey: "testimonial4Role", locationKey: "testimonial4Location", quoteKey: "testimonial4Quote", rating: 5 },
];

const sampleContentData = [
  { typeKey: "samplePresentation", titleKey: "samplePresentationTitle", descKey: "samplePresentationDesc", gradient: "from-blue-500 to-purple-500", icon: Presentation },
  { typeKey: "sampleWorksheet", titleKey: "sampleWorksheetTitle", descKey: "sampleWorksheetDesc", gradient: "from-orange-500 to-red-500", icon: FileSpreadsheet },
  { typeKey: "sampleGame", titleKey: "sampleGameTitle", descKey: "sampleGameDesc", gradient: "from-green-500 to-teal-500", icon: Gamepad2 },
  { typeKey: "sampleStoryboard", titleKey: "sampleStoryboardTitle", descKey: "sampleStoryboardDesc", gradient: "from-purple-500 to-pink-500", icon: Video },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterName, setNewsletterName] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");
  const [newsletterStatusMessage, setNewsletterStatusMessage] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const dailyTipIndex = (() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return (dayOfYear % 30) + 1;
  })();

  const { data: stats } = useQuery<{ totalUsers: number; totalContent: number }>({
    queryKey: ['/api/public/stats'],
  });

  const { data: newsletterCount } = useQuery<{ count: number }>({
    queryKey: ['/api/newsletter/count'],
  });

  const newsletterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/newsletter/subscribe", {
        email: newsletterEmail,
        name: newsletterName || undefined,
      });
      return res.json();
    },
    onSuccess: (data: { success: boolean; message?: string }) => {
      if (data.message?.includes("already")) {
        setNewsletterStatus("success");
        setNewsletterStatusMessage(t('landing.newsletterAlready'));
      } else {
        setNewsletterStatus("success");
        setNewsletterStatusMessage(t('landing.newsletterSuccess'));
      }
      setNewsletterEmail("");
      setNewsletterName("");
      import("@/lib/queryClient").then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ['/api/newsletter/count'] });
      });
    },
    onError: () => {
      setNewsletterStatus("error");
    },
  });

  useEffect(() => {
    const visited = localStorage.getItem("bb_visited");
    if (visited) {
      setIsReturningVisitor(true);
      setShowWelcomeBack(true);
      setTimeout(() => setShowWelcomeBack(false), 8000);
    }
    localStorage.setItem("bb_visited", new Date().toISOString());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % showcaseSlidesData.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsAppInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsAppInstalled(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsAppInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const goToSlide = (index: number) => setCurrentSlide(index);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + showcaseSlidesData.length) % showcaseSlidesData.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % showcaseSlidesData.length);

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
              alt={t('common.appName')} 
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-bold text-xl">{t('common.appName')}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/features" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">{t('common.features')}</Link>
            <Link href="/how-it-works" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">{t('footer.howItWorks')}</Link>
            <Link href="/blog" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-blog">{t('footer.blog')}</Link>
            <Link href="/file-tools" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-file-tools">{t('common.fileTools')}</Link>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-facebook-nav"
              aria-label="Follow BrightBoard on Facebook"
              className="hidden sm:flex w-8 h-8 rounded-full bg-[#1877F2] items-center justify-center text-white hover:bg-[#1666d8] transition-colors shadow-sm"
            >
              <SiFacebook className="w-4 h-4" />
            </a>
            <LanguageSelector />
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <Link href="/login">{t('common.signIn')}</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-24 pb-16">
        {/* Welcome Back Banner */}
        {showWelcomeBack && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in slide-in-from-top duration-500">
            <Card className="p-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-teal-500/10 border-primary/30 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" data-testid="text-welcome-back">{t('landing.welcomeBackTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('landing.welcomeBackMessage')}</p>
                </div>
                <Button size="sm" asChild data-testid="button-welcome-back-cta">
                  <Link href="/signup">
                    {t('landing.welcomeBackCta')}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <button
                  onClick={() => setShowWelcomeBack(false)}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-dismiss-welcome"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          </div>
        )}

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
              {!isAppInstalled && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={deferredPrompt ? handleInstallApp : undefined}
                  asChild={!deferredPrompt}
                  data-testid="button-install-app-hero"
                  className="border-teal-500/50 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                >
                  {deferredPrompt ? (
                    <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Install Free App</span>
                  ) : (
                    <a href="#install-app" className="flex items-center gap-2">
                      <Download className="w-4 h-4" /> Install Free App
                    </a>
                  )}
                </Button>
              )}
              {isAppInstalled && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium border border-green-500/20">
                  <CheckCircle className="w-4 h-4" /> App Installed!
                </div>
              )}
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
                  {stats?.totalUsers ? stats.totalUsers.toLocaleString() : t('common.statsTeachersFallback')}+
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Users className="w-4 h-4" />
                  {t('landing.teachersJoined')}
                </div>
              </Card>
              <Card className="text-center p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-500/20">
                <div className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400">
                  {stats?.totalContent ? stats.totalContent.toLocaleString() : t('common.statsContentFallback')}+
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
                  {showcaseSlidesData.map((slide, index) => {
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
                        <h3 className="text-2xl font-bold mb-2">{t(`landing.${slide.titleKey}`)}</h3>
                        <p className="text-muted-foreground text-lg max-w-md">{t(`landing.${slide.descKey}`)}</p>
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
                {showcaseSlidesData.map((_, index) => (
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
              <video
                ref={videoRef}
                src="/demo-video.mp4"
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => setIsVideoPlaying(false)}
                data-testid="demo-video"
              />
              
              <div 
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 cursor-pointer ${
                  isVideoPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                } bg-gradient-to-br from-slate-900/80 to-slate-800/80`}
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  if (isVideoPlaying) {
                    video.pause();
                  } else {
                    video.muted = true;
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(() => {
                        video.muted = true;
                        video.play().catch(() => {});
                      });
                    }
                  }
                }}
                data-testid="demo-video-container"
              >
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg" data-testid="button-play-demo">
                    {isVideoPlaying 
                      ? <Pause className="w-10 h-10 text-white" />
                      : <Play className="w-10 h-10 text-white ml-1" />
                    }
                  </div>
                  {!isVideoPlaying && (
                    <>
                      <p className="text-white/80 text-lg">{t('landing.demoPlayButton')}</p>
                      <p className="text-white/60 text-sm mt-2">{t('landing.demoPlaySubtext')}</p>
                    </>
                  )}
                </div>
              </div>
              
              {!isVideoPlaying && (
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
              )}
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
            {sampleContentData.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Card key={index} className="group hover-elevate overflow-hidden" data-testid={`sample-card-${index}`}>
                  <div className={`h-32 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <IconComponent className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardContent className="p-4">
                    <div className="text-xs text-primary font-medium mb-1">{t(`landing.${item.typeKey}`)}</div>
                    <h3 className="font-semibold mb-1">{t(`landing.${item.titleKey}`)}</h3>
                    <p className="text-sm text-muted-foreground">{t(`landing.${item.descKey}`)}</p>
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
              {testimonialsData.map((testimonial, index) => (
                <Card key={index} className="p-6" data-testid={`testimonial-card-${index}`}>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{t(`landing.${testimonial.quoteKey}`)}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                      {t(`landing.${testimonial.nameKey}`).charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{t(`landing.${testimonial.nameKey}`)}</div>
                      <div className="text-sm text-muted-foreground">{t(`landing.${testimonial.roleKey}`)} - {t(`landing.${testimonial.locationKey}`)}</div>
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

        {/* Daily Teaching Tip */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <Card className="overflow-hidden border-amber-200 dark:border-amber-800">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg" data-testid="text-daily-tip-title">{t('landing.dailyTipTitle')}</h3>
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {t('landing.dailyTipRefresh')}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-daily-tip-content">
                      {t(`landing.dailyTip${dailyTipIndex}`)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Newsletter Subscription */}
        <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-primary/5 via-purple-500/5 to-teal-500/5">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4" data-testid="text-newsletter-title">{t('landing.newsletterTitle')}</h2>
            <p className="text-muted-foreground text-lg mb-8">
              {t('landing.newsletterSubtitle')}
            </p>

            {newsletterStatus === "success" ? (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-4 rounded-xl" data-testid="text-newsletter-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{newsletterStatusMessage}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                  <Input
                    type="email"
                    placeholder={t('landing.newsletterPlaceholderEmail')}
                    value={newsletterEmail}
                    onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterStatus("idle"); }}
                    className="flex-1"
                    data-testid="input-newsletter-email"
                  />
                  <Input
                    type="text"
                    placeholder={t('landing.newsletterPlaceholderName')}
                    value={newsletterName}
                    onChange={(e) => setNewsletterName(e.target.value)}
                    className="flex-1 sm:max-w-[180px]"
                    data-testid="input-newsletter-name"
                  />
                </div>
                <Button
                  size="lg"
                  onClick={() => newsletterMutation.mutate()}
                  disabled={!newsletterEmail || !newsletterEmail.includes("@") || newsletterMutation.isPending}
                  className="w-full sm:w-auto min-w-[200px]"
                  data-testid="button-newsletter-subscribe"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {newsletterMutation.isPending ? t('landing.newsletterSubscribing') : t('landing.newsletterButton')}
                </Button>
                {newsletterStatus === "error" && (
                  <p className="text-sm text-red-500" data-testid="text-newsletter-error">{t('landing.newsletterError')}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('landing.newsletterPrivacy')}</p>
                {(newsletterCount?.count ?? 0) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">{newsletterCount?.count?.toLocaleString()}</span> {t('landing.newsletterCount')}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Install App Section */}
        <section id="install-app" className="container mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Download className="w-4 h-4" />
              Free App — No App Store Needed
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Install BrightBoard on Your Device</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Add BrightBoard to your phone or computer home screen. Works like a native app — fast, offline-ready, and always one tap away.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow border-2 hover:border-teal-500/30">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto mb-4 shadow-md">
                <Apple className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">iPhone / iPad</h3>
              <ol className="text-sm text-muted-foreground text-left space-y-2">
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span> Open in <strong>Safari</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span> Tap the <strong>Share</strong> button (box with arrow)</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span> Tap <strong>"Add to Home Screen"</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">4</span> Tap <strong>Add</strong> — done!</li>
              </ol>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow border-2 hover:border-teal-500/30">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-md">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Android Phone</h3>
              <ol className="text-sm text-muted-foreground text-left space-y-2">
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span> Open in <strong>Chrome</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span> A popup says <strong>"Add to Home Screen"</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span> Or tap <strong>⋮ menu → Install App</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">4</span> Tap <strong>Install</strong> — done!</li>
              </ol>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow border-2 hover:border-teal-500/30">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-md">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Computer (Windows / Mac)</h3>
              <ol className="text-sm text-muted-foreground text-left space-y-2">
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span> Open in <strong>Chrome or Edge</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span> Click the <strong>⊕ install icon</strong> in the address bar</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span> Click <strong>Install</strong></li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">4</span> BrightBoard opens like a desktop app!</li>
              </ol>
            </Card>
          </div>

          {/* One-click install for Android/Desktop */}
          <div className="text-center">
            {isAppInstalled ? (
              <div className="inline-flex items-center gap-3 bg-green-500/10 text-green-600 dark:text-green-400 px-6 py-3 rounded-xl font-semibold border border-green-500/20">
                <CheckCircle className="w-5 h-5" />
                BrightBoard is installed on this device!
              </div>
            ) : deferredPrompt ? (
              <Button size="lg" onClick={handleInstallApp} data-testid="button-install-app-main" className="bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl gap-2">
                <Download className="w-5 h-5" />
                Install BrightBoard Now — It's Free!
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Follow the steps above for your device. No App Store or payment needed.</p>
            )}
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
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  data-testid="button-facebook-cta"
                  className="border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/10"
                >
                  <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                    <SiFacebook className="w-5 h-5 mr-2" />
                    Follow on Facebook
                  </a>
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
