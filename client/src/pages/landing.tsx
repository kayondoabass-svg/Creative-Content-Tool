import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Image, FileText, Presentation, Gamepad2, Video, FileSpreadsheet, Check } from "lucide-react";

export default function LandingPage() {
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
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <section className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-teal-500 bg-clip-text text-transparent">
              AI-Powered Content for Busy Teachers
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Create stunning educational images, presentations, activities, worksheets, and video storyboards in seconds. Let AI do the heavy lifting so you can focus on what matters most - your students.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started Free</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No credit card required. Free plan available.</p>
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

        <section id="pricing" className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, Fair Pricing</h2>
          <p className="text-center text-muted-foreground mb-12">Start free, upgrade when you need more</p>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <PricingCard 
              name="Free"
              price="$0"
              period="forever"
              features={[
                "5 content generations/day",
                "Basic image quality (2D)",
                "Standard presentations",
                "Community support"
              ]}
              buttonText="Get Started"
              buttonVariant="outline"
            />
            <PricingCard 
              name="Weekly"
              price="$4.99"
              period="per week"
              features={[
                "Unlimited generations",
                "HD/4K image quality",
                "Premium animations",
                "Priority support"
              ]}
              buttonText="Start Free Trial"
              buttonVariant="default"
            />
            <PricingCard 
              name="Monthly"
              price="$14.99"
              period="per month"
              features={[
                "Unlimited generations",
                "HD/4K image quality",
                "Premium animations",
                "Priority support"
              ]}
              buttonText="Start Free Trial"
              buttonVariant="default"
              badge="Save 25%"
            />
            <PricingCard 
              name="Yearly"
              price="$99.99"
              period="per year"
              features={[
                "Unlimited generations",
                "HD/4K image quality",
                "Premium animations",
                "Priority support"
              ]}
              buttonText="Start Free Trial"
              buttonVariant="default"
              badge="Best Value"
              highlight
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

function PricingCard({ 
  name, 
  price, 
  period, 
  features, 
  buttonText, 
  buttonVariant,
  badge,
  highlight 
}: { 
  name: string; 
  price: string; 
  period: string; 
  features: string[];
  buttonText: string;
  buttonVariant: "default" | "outline";
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`relative ${highlight ? 'border-primary shadow-lg' : ''}`}>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}
      <CardContent className="p-6 pt-8">
        <h3 className="font-semibold text-lg mb-2">{name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground text-sm">/{period}</span>
        </div>
        <ul className="space-y-2 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button variant={buttonVariant} className="w-full" asChild data-testid={`button-pricing-${name.toLowerCase()}`}>
          <a href="/api/login">{buttonText}</a>
        </Button>
      </CardContent>
    </Card>
  );
}
