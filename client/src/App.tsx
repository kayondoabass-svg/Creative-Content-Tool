import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoSettings } from "@/components/logo-settings";
import { FileConverter } from "@/components/file-converter";
import { Sparkles, GraduationCap, LogOut, Crown, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing";
import PricingPage from "@/pages/pricing";
import CEODashboard from "@/pages/ceo-dashboard";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Refund from "@/pages/refund";
import type { OrganizationSettings } from "@shared/schema";

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
      {/* Public pages - accessible without auth */}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/refund" component={Refund} />
      <Route path="/pricing" component={PricingPage} />
      
      {/* Protected pages - require auth */}
      {!isAuthenticated ? (
        <Route component={LandingPage} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/ceo" component={CEODashboard} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function UserMenu() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });
  const { data: ceoCheck } = useQuery<{ isCEO: boolean }>({
    queryKey: ["/api/ceo/check"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Button asChild size="sm" data-testid="button-login-header">
        <a href="/api/login">Sign In</a>
      </Button>
    );
  }

  const isPremium = (subscriptionStatus as any)?.isPremium;
  const isCEO = ceoCheck?.isCEO;
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
        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="/pricing" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span>{isPremium ? "Manage Subscription" : "Upgrade to Premium"}</span>
            {!isPremium && (
              <Badge variant="secondary" className="ml-auto text-xs">PRO</Badge>
            )}
          </a>
        </DropdownMenuItem>
        {isCEO && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a href="/ceo" className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>CEO Dashboard</span>
              </a>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" asChild>
          <a href="/api/logout" className="flex items-center gap-2 text-destructive">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderWithLogo() {
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
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            BrightBoard
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </h1>
          <p className="text-xs text-muted-foreground -mt-0.5">AI Content for Teachers</p>
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
        <LogoSettings />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="flex flex-col h-screen w-full bg-background">
            <HeaderWithLogo />
            
            <main className="flex-1 overflow-hidden">
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
