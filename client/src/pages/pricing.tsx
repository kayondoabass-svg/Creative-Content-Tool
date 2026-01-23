import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  isPremium: boolean;
  tier: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

const plans = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$4.99",
    period: "per week",
    priceId: "price_1SsnFDCWasGFUXr2lZC3cPyw",
    features: [
      "Unlimited content generations",
      "HD/4K image quality",
      "Premium slide transitions",
      "Tap-to-reveal animations",
      "Priority support"
    ]
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$14.99",
    period: "per month",
    badge: "Save 25%",
    priceId: "price_1SsnFDCWasGFUXr2zVsaPtkL",
    features: [
      "Unlimited content generations",
      "HD/4K image quality",
      "Premium slide transitions",
      "Tap-to-reveal animations",
      "Priority support"
    ]
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$99.99",
    period: "per year",
    badge: "Best Value",
    highlight: true,
    priceId: "price_1SsnFDCWasGFUXr2HG42jpNA",
    features: [
      "Unlimited content generations",
      "HD/4K image quality",
      "Premium slide transitions",
      "Tap-to-reveal animations",
      "Priority support",
      "2 months free"
    ]
  }
];

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest("POST", "/api/subscription/checkout", { priceId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Checkout Error",
        description: error.message || "Failed to start checkout",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/portal");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Portal Error",
        description: error.message || "Failed to open billing portal",
      });
    },
  });

  const handleSubscribe = (priceId: string) => {
    checkoutMutation.mutate(priceId);
  };

  const isPremium = subscriptionStatus?.isPremium;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-muted-foreground mb-8">Sign in to view subscription options</p>
        <Button asChild>
          <a href="/api/login">Sign In</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to BrightBoard
        </a>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">
          {isPremium ? "Manage Your Subscription" : "Upgrade to Premium"}
        </h1>
        <p className="text-muted-foreground">
          {isPremium 
            ? "You have access to all premium features. Manage your subscription below."
            : "Unlock unlimited content generation and premium features"
          }
        </p>
      </div>

      {isPremium && (
        <Card className="mb-8 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <CardTitle>Active Subscription</CardTitle>
              </div>
              <Badge variant="secondary">{subscriptionStatus?.tier?.toUpperCase()}</Badge>
            </div>
            <CardDescription>
              {subscriptionStatus?.currentPeriodEnd && (
                <>Renews on {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-subscription"
            >
              {portalMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isPremium && (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.highlight ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}
              <CardContent className="p-6 pt-8">
                <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={checkoutMutation.isPending}
                  data-testid={`button-subscribe-${plan.id}`}
                >
                  {checkoutMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include a 7-day free trial. Cancel anytime.</p>
        <p className="mt-2">Secure payment powered by Stripe.</p>
      </div>
    </div>
  );
}
