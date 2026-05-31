import { Switch, Route, Link, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { LogoSettings } from "@/components/logo-settings";
import { FileConverter } from "@/components/file-converter";
import { GamesLauncher } from "@/components/games-launcher";
import { Sparkles, GraduationCap, LogOut, Crown, User, BarChart3, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing";
import PricingPage from "@/pages/pricing";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Refund from "@/pages/refund";
import Affiliate from "@/pages/affiliate";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import VerifyEmailPage from "@/pages/verify-email";
import FileToolsPage from "@/pages/file-tools";
import StudioPage from "@/pages/studio";
import GamesPage from "@/pages/games";
import OwnerDashboard from "@/pages/owner-dashboard";
import OwnerExpenses from "@/pages/owner-expenses";
import PaymentCallbackPage from "@/pages/payment-callback";
import BillingPage from "@/pages/billing";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import HowItWorks from "@/pages/how-it-works";
import Features from "@/pages/features";
import AdsLanding from "@/pages/ads-landing";
import Resources from "@/pages/resources";
import TeachingTips from "@/pages/teaching-tips";
import FlashcardsPage from "@/pages/flashcards";
import type { OrganizationSettings } from "@shared/schema";

function PageTracker() {
  const [location] = useLocation();
  useEffect(() => {
    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location }),
    }).catch(() => {});
  }, [location]);
  return null;
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Ad landing page - always public */}
      <Route path="/ads" component={AdsLanding} />

      {/* Public pages - accessible without auth */}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/refund" component={Refund} />
      <Route path="/affiliate" component={Affiliate} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/payment/callback" component={PaymentCallbackPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/file-tools" component={FileToolsPage} />
      <Route path="/studio" component={StudioPage} />
      <Route path="/games" component={GamesPage} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/features" component={Features} />
      <Route path="/resources" component={Resources} />
      <Route path="/teaching-tips" component={TeachingTips} />
      <Route path="/flashcards" component={FlashcardsPage} />
      
      {/* Owner pages - owner only */}
      <Route path="/owner-dashboard" component={OwnerDashboard} />
      <Route path="/owner-expenses" component={OwnerExpenses} />
      
      {/* Protected pages - require auth */}
      {!isAuthenticated ? (
        <Route component={LandingPage} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function UserMenu() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });
  
  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Button asChild size="sm" data-testid="button-login-header">
        <Link href="/login">{t("common.signIn")}</Link>
      </Button>
    );
  }

  const isPremium = (subscriptionStatus as any)?.isPremium;
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {isPremium && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-0.5">
              <Crown className="w-3 h-3 text-white" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        {user.isOwner && (
          <DropdownMenuItem className="cursor-pointer" asChild>
            <a href="/owner-dashboard" className="flex items-center gap-2" data-testid="link-owner-dashboard">
              <BarChart3 className="w-4 h-4" />
              <span>{t("common.ownerDashboard")}</span>
              <Badge className="ml-auto text-xs bg-yellow-500">{t("common.owner")}</Badge>
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="/pricing" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span>{isPremium ? t("common.manageSubscription") : t("common.upgrade")}</span>
            {!isPremium && (
              <Badge variant="secondary" className="ml-auto text-xs">PRO</Badge>
            )}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="/billing" className="flex items-center gap-2" data-testid="link-billing">
            <Receipt className="w-4 h-4" />
            <span>Billing & Usage</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer flex items-center gap-2 text-destructive" 
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>{t("common.signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderWithLogo() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { data: settings } = useQuery<OrganizationSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <img 
          src="/logo.png" 
          alt="BrightBoard" 
          className="h-12 w-12 rounded-lg object-contain bg-white"
          data-testid="img-brightboard-logo"
        />
        <div>
          <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            BrightBoard
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </h1>
          <p className="text-xs text-muted-foreground -mt-0.5">{t("common.tagline")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {settings?.logo && (
          <img
            src={settings.logo}
            alt="Organization logo"
            className="h-8 w-8 object-contain rounded"
            data-testid="img-header-logo"
          />
        )}
        <FileConverter />
        <GamesLauncher />
        <LogoSettings />
        <LanguageSelector />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col h-screen w-full bg-background">
        <HeaderWithLogo />
        <main className="flex-1 overflow-y-auto">
          <PageTracker />
          <Router />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <PageTracker />
      <Router />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppShell />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
