import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, GraduationCap } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="flex flex-col h-screen w-full bg-background">
            {/* Header */}
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
              <ThemeToggle />
            </header>
            
            {/* Main Content */}
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
