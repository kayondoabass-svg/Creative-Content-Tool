import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, ArrowLeft, Loader2, Shield, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PricingPDFDownload } from "@/components/pricing-pdf";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubscriptionStatus {
  isPremium: boolean;
  tier: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

interface LocalizedPricing {
  currency: string;
  symbol: string;
  name: string;
  plans: Record<string, {
    amount: number;
    currency: string;
    symbol: string;
    days: number;
  }>;
}

const TIMEZONE_COUNTRY_MAP: Record<string, string> = {
  'Africa/Kampala': 'UG', 'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kigali': 'RW', 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH',
  'Africa/Johannesburg': 'ZA', 'Africa/Harare': 'ZA', 'Africa/Lusaka': 'ZM',
  'Africa/Blantyre': 'MW', 'Africa/Lilongwe': 'MW', 'Africa/Addis_Ababa': 'ET',
  'Africa/Douala': 'CM', 'Africa/Libreville': 'GA', 'Africa/Brazzaville': 'CG',
  'Africa/Ndjamena': 'TD', 'Africa/Bangui': 'CF', 'Africa/Malabo': 'GQ',
  'Africa/Dakar': 'SN', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF',
  'Africa/Abidjan': 'CI', 'Africa/Lome': 'TG', 'Africa/Porto-Novo': 'BJ',
  'Africa/Niamey': 'NE', 'Africa/Bissau': 'GW', 'Africa/Cairo': 'EG',
  'Africa/Casablanca': 'MA',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT',
  'Europe/Helsinki': 'FI', 'Europe/Athens': 'GR', 'Europe/Luxembourg': 'LU',
  'Europe/Dublin': 'IE',
  'Asia/Kolkata': 'IN', 'Asia/Mumbai': 'IN', 'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Pacific/Auckland': 'NZ',
};

function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY_MAP[tz] || 'US';
  } catch {
    return 'US';
  }
}

function formatPrice(amount: number, symbol: string, currency: string): string {
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  if (currency === 'GBP') return `£${amount.toFixed(2)}`;
  if (currency === 'EUR') return `€${amount.toFixed(2)}`;
  if (amount >= 1000) return `${symbol} ${amount.toLocaleString()}`;
  if (Number.isInteger(amount)) return `${symbol} ${amount}`;
  return `${symbol} ${amount.toFixed(2)}`;
}

const planFeatures = [
  "Unlimited content generations",
  "Up to 20 slides per presentation",
  "HD/4K image quality",
  "Premium slide transitions",
  "Tap-to-reveal animations",
  "Priority support"
];

export default function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [country, setCountry] = useState<string>(() => detectCountry());

  const { data: pricing, isLoading: pricingLoading } = useQuery<LocalizedPricing>({
    queryKey: ["/api/pricing", country],
    queryFn: async () => {
      const res = await fetch(`/api/pricing?country=${country}`);
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
  });

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of the billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Cancellation Error",
        description: error.message || "Failed to cancel subscription",
      });
    },
  });

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      // Save chosen plan and send them to sign up
      localStorage.setItem("pendingPlan", planId);
      setLocation(`/signup?redirect=/pricing`);
      return;
    }

    setLoadingPlan(planId);
    try {
      const response = await apiRequest("POST", "/api/pesapal/checkout", { 
        tier: planId,
        currency: pricing?.currency || 'USD',
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const isPremium = subscriptionStatus?.isPremium;

  // Auto-start checkout if user just signed up/logged in with a pending plan
  useEffect(() => {
    if (isAuthenticated && pricing) {
      const pendingPlan = localStorage.getItem("pendingPlan");
      if (pendingPlan) {
        localStorage.removeItem("pendingPlan");
        handleSubscribe(pendingPlan);
      }
    }
  }, [isAuthenticated, pricing]);

  const plans = pricing ? [
    {
      id: "weekly",
      name: "Weekly",
      price: formatPrice(pricing.plans.weekly.amount, pricing.symbol, pricing.currency),
      period: "per week",
      features: [...planFeatures],
    },
    {
      id: "monthly",
      name: "Monthly",
      price: formatPrice(pricing.plans.monthly.amount, pricing.symbol, pricing.currency),
      period: "per month",
      badge: "Save 25%",
      features: [...planFeatures],
    },
    {
      id: "yearly",
      name: "Yearly",
      price: formatPrice(pricing.plans.yearly.amount, pricing.symbol, pricing.currency),
      period: "per year",
      badge: "Best Value",
      highlight: true,
      features: [...planFeatures, "2 months free"],
    },
  ] : [];

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
        <h1 className="text-3xl font-bold mb-4" data-testid="text-pricing-title">
          {isPremium ? "Manage Your Subscription" : "Upgrade to Premium"}
        </h1>
        <p className="text-muted-foreground" data-testid="text-pricing-subtitle">
          {isPremium 
            ? "You have access to all premium features. Manage your subscription below."
            : "Unlock unlimited content generation and premium features"
          }
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <PricingPDFDownload />
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-[180px]" data-testid="select-currency-country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States (USD)</SelectItem>
                <SelectItem value="UG">Uganda (UGX)</SelectItem>
                <SelectItem value="KE">Kenya (KES)</SelectItem>
                <SelectItem value="TZ">Tanzania (TZS)</SelectItem>
                <SelectItem value="RW">Rwanda (RWF)</SelectItem>
                <SelectItem value="NG">Nigeria (NGN)</SelectItem>
                <SelectItem value="GH">Ghana (GHS)</SelectItem>
                <SelectItem value="ZA">South Africa (ZAR)</SelectItem>
                <SelectItem value="GB">United Kingdom (GBP)</SelectItem>
                <SelectItem value="DE">Europe (EUR)</SelectItem>
                <SelectItem value="IN">India (INR)</SelectItem>
                <SelectItem value="AE">UAE (AED)</SelectItem>
                <SelectItem value="SA">Saudi Arabia (SAR)</SelectItem>
                <SelectItem value="CA">Canada (CAD)</SelectItem>
                <SelectItem value="AU">Australia (AUD)</SelectItem>
                <SelectItem value="ET">Ethiopia (ETB)</SelectItem>
                <SelectItem value="ZM">Zambia (ZMW)</SelectItem>
                <SelectItem value="MW">Malawi (MWK)</SelectItem>
                <SelectItem value="EG">Egypt (EGP)</SelectItem>
                <SelectItem value="MA">Morocco (MAD)</SelectItem>
                <SelectItem value="SN">Senegal (CFA)</SelectItem>
                <SelectItem value="CM">Cameroon (FCFA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {pricing && pricing.currency !== 'USD' && (
          <p className="text-xs text-muted-foreground mt-2" data-testid="text-currency-note">
            Prices shown in {pricing.name} ({pricing.currency}). Approximate conversion from USD.
          </p>
        )}
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
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-subscription"
            >
              {cancelMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling...</>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isPremium && (
        <>
          <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secure payments powered by PesaPal — Mobile Money, Cards & more</span>
          </div>
          
          {pricingLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 pt-8">
                    <div className="h-6 bg-muted rounded w-20 mb-4" />
                    <div className="h-10 bg-muted rounded w-32 mb-6" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-4 bg-muted rounded w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${plan.highlight ? 'border-primary shadow-lg' : ''}`}
                  data-testid={`card-plan-${plan.id}`}
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
                      <span className="text-3xl font-bold" data-testid={`text-price-${plan.id}`}>{plan.price}</span>
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
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loadingPlan === plan.id}
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      {loadingPlan === plan.id ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                      ) : isAuthenticated ? (
                        "Subscribe Now"
                      ) : (
                        "Get Started"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-5 h-5 text-primary" />
              <span>7-Day Money Back Guarantee</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Check className="w-5 h-5 text-primary" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Crown className="w-5 h-5 text-primary" />
              <span>Instant Premium Access</span>
            </div>
          </div>
        </>
      )}

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All plans include a 7-day money-back guarantee. Cancel anytime.</p>
        <p className="mt-2">Payments processed securely by PesaPal.</p>
      </div>

      <Footer />
    </div>
  );
}
