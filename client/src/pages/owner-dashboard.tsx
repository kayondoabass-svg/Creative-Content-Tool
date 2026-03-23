import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Crown, Zap, BarChart3, Calendar, Mail, Clock, DollarSign, ArrowLeft, Video, Settings, UserCheck, UserX, Link2, Building2, Receipt, CreditCard, MapPin, FileText, Landmark, ShieldCheck, RefreshCw, Search, Activity, AlertTriangle, ChevronRight, Send, Trophy, Eye, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface OwnerStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    premium: number;
    free: number;
  };
  content: {
    totalGenerations: number;
    byType: Array<{ type: string; count: number }>;
  };
  subscriptions: Array<{ tier: string; status: string; count: number }>;
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    tier: string;
  }>;
}

interface TrendData {
  signups: Array<{ date: string; count: number }>;
  generations: Array<{ date: string; count: number }>;
}

interface RevenueData {
  totals: {
    allTime: number;
    thisYear: number;
    thisMonth: number;
    today: number;
    totalTransactions: number;
  };
  byTier: Record<string, { count: number; revenue: number }>;
  byMethod: Record<string, { count: number; revenue: number }>;
  byCurrency: Record<string, { count: number; revenue: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
  tax: {
    tin: string;
    businessName: string;
    registrationNumber: string;
    address: string;
    vatRate: number;
    estimatedVAT: number;
    incomeBeforeVAT: number;
    taxableRevenue: number;
    financialYear: string;
  };
  recentPayments: Array<{
    id: number;
    userId: string;
    orderId: string;
    amount: number;
    currency: string;
    tier: string;
    status: string;
    paymentMethod: string | null;
    confirmationCode: string | null;
    createdAt: string;
  }>;
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  loading 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: any;
  trend?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ContentTypeCard({ type, count }: { type: string; count: number }) {
  const typeLabels: Record<string, string> = {
    image: "Images",
    presentation: "Presentations",
    text: "Text Content",
    activity: "Games",
    storyboard: "Storyboards",
    worksheet: "Worksheets",
    mindmap: "Mind Maps",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span className="text-sm font-medium">{typeLabels[type] || type}</span>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}

const NO_DECIMAL_CURRENCIES = new Set(["UGX", "VND", "IDR", "TZS", "RWF", "NGN", "XAF", "XOF", "MWK", "ZMW", "COP", "ARS", "CLP", "KHR", "MMK", "BDT", "PKR", "LKR", "NPR", "EGP"]);
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", UGX: "UGX ", VND: "₫", KES: "KSh ", TZS: "TSh ",
  RWF: "FRw ", NGN: "₦", GHS: "GH₵", ZAR: "R", INR: "₹", AED: "AED ", SAR: "SAR ",
  CAD: "CA$", AUD: "A$", MWK: "MK ", ZMW: "ZK ", ETB: "Br ", XAF: "FCFA ", XOF: "CFA ",
  EGP: "E£", MAD: "MAD ", PHP: "₱", IDR: "Rp ", THB: "฿", MYR: "RM", SGD: "S$",
  KHR: "៛", MMK: "K ", BDT: "৳", PKR: "Rs ", LKR: "Rs ", NPR: "Rs ", BRL: "R$",
  MXN: "MX$", COP: "COP$", ARS: "AR$", CLP: "CLP$", PEN: "S/", TRY: "₺", ILS: "₪",
};

function formatAmount(amount: number, currency: string = "USD") {
  const actual = amount / 100;
  const sym = CURRENCY_SYMBOLS[currency] ?? (currency + " ");
  if (NO_DECIMAL_CURRENCIES.has(currency)) {
    return `${sym}${Math.round(actual).toLocaleString()}`;
  }
  return `${sym}${actual.toFixed(2)}`;
}

function RevenueSection() {
  const { data: revenue, isLoading } = useQuery<RevenueData>({
    queryKey: ["/api/owner/revenue"],
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const recheckMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiRequest("POST", "/api/owner/recheck-payment", { orderId }),
    onSuccess: async (data: any, orderId) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/owner/revenue"] });
      if (data.updated) {
        toast({ title: `Payment updated → ${data.newStatus}`, description: `PesaPal says: ${data.pesapalStatus}` });
      } else {
        toast({ title: "No change", description: `PesaPal still reports: ${data.pesapalStatus}` });
      }
      setRecheckingId(null);
    },
    onError: (error: any) => {
      toast({ title: "Recheck failed", description: error.message, variant: "destructive" });
      setRecheckingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!revenue) return null;

  const tierColors: Record<string, string> = {
    weekly: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",
    monthly: "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    yearly: "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
  };

  const statusColors: Record<string, string> = {
    completed: "bg-green-500",
    pending: "bg-yellow-500",
    failed: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatAmount(revenue.totals.allTime)}
          description={`${revenue.totals.totalTransactions} transactions`}
          icon={DollarSign}
        />
        <StatCard
          title="Revenue This Year"
          value={formatAmount(revenue.totals.thisYear)}
          description={`FY ${revenue.tax.financialYear}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue This Month"
          value={formatAmount(revenue.totals.thisMonth)}
          description="Last 30 days"
          icon={Calendar}
        />
        <StatCard
          title="Revenue Today"
          value={formatAmount(revenue.totals.today)}
          description="Today's earnings"
          icon={Zap}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Revenue by Tier
            </CardTitle>
            <CardDescription>Breakdown by subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(revenue.byTier).length > 0 ? (
              Object.entries(revenue.byTier).map(([tier, data]) => (
                <div key={tier} className={`flex items-center justify-between p-3 rounded-lg border ${tierColors[tier] || "bg-muted/50"}`}>
                  <div>
                    <span className="text-sm font-medium capitalize">{tier}</span>
                    <p className="text-xs text-muted-foreground">{data.count} payments</p>
                  </div>
                  <Badge variant="secondary" className="font-mono">{formatAmount(data.revenue)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>How customers pay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(revenue.byMethod).length > 0 ? (
              Object.entries(revenue.byMethod).map(([method, data]) => (
                <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="text-sm font-medium capitalize">{method}</span>
                    <p className="text-xs text-muted-foreground">{data.count} transactions</p>
                  </div>
                  <Badge variant="secondary" className="font-mono">{formatAmount(data.revenue)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No payment data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue Trend
            </CardTitle>
            <CardDescription>Revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            {revenue.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {revenue.monthlyTrend.slice(-6).map((item) => (
                  <div key={item.month} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm text-muted-foreground">{item.month}</span>
                    <span className="text-sm font-medium font-mono">{formatAmount(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No revenue trend data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-600" />
              URA Tax Summary
            </CardTitle>
            <CardDescription>Uganda Revenue Authority - VAT @ {revenue.tax.vatRate}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <p className="text-xs text-muted-foreground">Taxable Revenue (FY {revenue.tax.financialYear})</p>
                <p className="text-lg font-bold font-mono">{formatAmount(revenue.tax.taxableRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <p className="text-xs text-muted-foreground">Estimated VAT ({revenue.tax.vatRate}%)</p>
                <p className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">{formatAmount(revenue.tax.estimatedVAT)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Income Before VAT</p>
                <p className="text-lg font-bold font-mono">{formatAmount(revenue.tax.incomeBeforeVAT)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Transactions</p>
                <p className="text-lg font-bold">{revenue.totals.totalTransactions}</p>
              </div>
            </div>
            <div className="pt-3 border-t space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">TIN:</span>
                <span className="font-mono font-medium">{revenue.tax.tin}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                VAT is calculated as {revenue.tax.vatRate}% of gross revenue (inclusive). Consult your tax advisor for actual filing amounts.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Business Registration
            </CardTitle>
            <CardDescription>Keyo Technologies - URSB Registered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="text-sm font-medium">Keyo Technologies</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Registration Number (URSB)</p>
                  <p className="text-sm font-mono font-medium">80030812159711</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">TIN (Uganda Revenue Authority)</p>
                  <p className="text-sm font-mono font-medium">1008176770</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Owner / Director</p>
                  <p className="text-sm font-medium">Abass Kayondo (kayondoabass@gmail.com)</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Registered Office</p>
                  <p className="text-sm font-medium">P.O. Box 22900, Kampala</p>
                  <p className="text-xs text-muted-foreground">Central Division, Nakivuubo Shauriyako Parish, Shauriyako A Village, Uganda</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Payments
          </CardTitle>
          <CardDescription>Last 50 payment transactions (all statuses)</CardDescription>
        </CardHeader>
        <CardContent>
          {revenue.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-recent-payments">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Order ID</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Tier</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Method</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Confirmation</th>
                    <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0" data-testid={`payment-row-${payment.id}`}>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{payment.orderId.slice(0, 12)}...</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline" className="capitalize">{payment.tier}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono font-medium">{formatAmount(payment.amount, payment.currency)}</td>
                      <td className="py-2.5 pr-4 capitalize">{payment.paymentMethod || "-"}</td>
                      <td className="py-2.5 pr-4">
                        <Badge className={statusColors[payment.status] || "bg-gray-500"}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{payment.confirmationCode || "-"}</td>
                      <td className="py-2.5">
                        {(payment.status === 'pending' || payment.status === 'failed') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={recheckingId === payment.orderId}
                            onClick={() => {
                              setRecheckingId(payment.orderId);
                              recheckMutation.mutate(payment.orderId);
                            }}
                            data-testid={`button-recheck-${payment.id}`}
                          >
                            {recheckingId === payment.orderId ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <><RefreshCw className="w-3 h-3 mr-1" />Recheck</>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OwnerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
    enabled: !!user?.isOwner,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendData>({
    queryKey: ["/api/owner/trends"],
    enabled: !!user?.isOwner,
  });

  const queryClient = useQueryClient();
  
  interface VideoSettings {
    showWatermark: boolean;
    watermarkPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    showEndLogo: boolean;
  }
  
  const { data: videoSettings } = useQuery<VideoSettings>({
    queryKey: ["/api/owner/video-settings"],
    enabled: !!user?.isOwner,
  });
  
  const updateVideoSettings = useMutation({
    mutationFn: async (updates: Partial<VideoSettings>) => {
      return apiRequest("PATCH", "/api/owner/video-settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/video-settings"] });
    },
  });

  const { toast } = useToast();
  const [blastSending, setBlastSending] = useState(false);

  const sendMarketingBlast = async () => {
    if (!confirm(`Send a marketing email to all free users highlighting BrightBoard's features? This cannot be undone.`)) return;
    setBlastSending(true);
    try {
      const res = await apiRequest("POST", "/api/owner/send-marketing-blast", {});
      const data = await res.json();
      toast({
        title: `Marketing emails sent!`,
        description: `Sent: ${data.sent}, Failed: ${data.failed}, Total free users: ${data.total}`,
      });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setBlastSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCard key={i} title="" value="" icon={Users} loading />
          ))}
        </div>
      </div>
    );
  }

  if (!user?.isOwner) {
    return (
      <div className="container mx-auto p-6 text-center">
        <div className="max-w-md mx-auto">
          <Crown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            This page is only accessible to the owner of BrightBoard.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="text-primary hover:underline"
            data-testid="link-go-home"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const loading = statsLoading || trendsLoading;
  const conversionRate = stats?.users.total 
    ? ((stats.users.premium / stats.users.total) * 100).toFixed(1) 
    : "0";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              Owner Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.firstName}! Here's your app overview.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={sendMarketingBlast}
            disabled={blastSending}
            variant="outline"
            data-testid="button-send-marketing-blast"
            className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
          >
            <Mail className="h-4 w-4 mr-1" />
            {blastSending ? "Sending..." : "Email Free Users"}
          </Button>
          <Link href="/owner-expenses">
            <Button variant="outline" data-testid="button-expenses">
              <DollarSign className="h-4 w-4 mr-1" />
              Expenses
            </Button>
          </Link>
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.users.total ?? 0}
          description="Registered accounts"
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="New Today"
          value={stats?.users.newToday ?? 0}
          description={`${stats?.users.newThisWeek ?? 0} this week`}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="Premium Subscribers"
          value={stats?.users.premium ?? 0}
          description={`${conversionRate}% conversion rate`}
          icon={Crown}
          loading={loading}
        />
        <StatCard
          title="Total Generations"
          value={stats?.content.totalGenerations ?? 0}
          description="All content created"
          icon={Zap}
          loading={loading}
        />
      </div>

      <RevenueSection />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Content Generation Stats
            </CardTitle>
            <CardDescription>
              Breakdown of content types created by users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.content.byType.length ? (
                  stats.content.byType.map((item) => (
                    <ContentTypeCard
                      key={item.type}
                      type={item.type}
                      count={Number(item.count)}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No content generated yet
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription Tiers
            </CardTitle>
            <CardDescription>User distribution by plan</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <span className="text-sm font-medium">Free</span>
                  <Badge>{stats?.users.free ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <span className="text-sm font-medium">Weekly</span>
                  <Badge className="bg-purple-500">
                    {stats?.subscriptions.filter(s => s.tier === "weekly" && s.status === "active").reduce((sum, s) => sum + Number(s.count), 0) ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <span className="text-sm font-medium">Monthly</span>
                  <Badge className="bg-blue-500">
                    {stats?.subscriptions.filter(s => s.tier === "monthly" && s.status === "active").reduce((sum, s) => sum + Number(s.count), 0) ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <span className="text-sm font-medium">Yearly</span>
                  <Badge className="bg-green-500">
                    {stats?.subscriptions.filter(s => s.tier === "yearly" && s.status === "active").reduce((sum, s) => sum + Number(s.count), 0) ?? 0}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Signups
          </CardTitle>
          <CardDescription>Latest users who joined BrightBoard</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : stats?.recentSignups.length ? (
            <div className="space-y-3">
              {stats.recentSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`user-row-${signup.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {signup.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{signup.name}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {signup.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={signup.tier === "free" ? "secondary" : "default"}
                      className={
                        signup.tier !== "free"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : ""
                      }
                    >
                      {signup.tier}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(signup.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No signups yet. Share your app to get users!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signup Trend (30 days)</CardTitle>
            <CardDescription>New user registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : trends?.signups.length ? (
              <div className="h-40 flex items-end gap-1">
                {trends.signups.slice(-14).map((day, i) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-primary/80 rounded-t hover-elevate"
                    style={{
                      height: `${Math.max(10, (Number(day.count) / Math.max(...trends.signups.map(d => Number(d.count)), 1)) * 100)}%`,
                    }}
                    title={`${day.date}: ${day.count} signups`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No signup data yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation Trend (30 days)</CardTitle>
            <CardDescription>Content created over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : trends?.generations.length ? (
              <div className="h-40 flex items-end gap-1">
                {trends.generations.slice(-14).map((day, i) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-green-500/80 rounded-t hover-elevate"
                    style={{
                      height: `${Math.max(10, (Number(day.count) / Math.max(...trends.generations.map(d => Number(d.count)), 1)) * 100)}%`,
                    }}
                    title={`${day.date}: ${day.count} generations`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No generation data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Branding Settings
          </CardTitle>
          <CardDescription>Control watermarks and branding on exported videos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-watermark">Show Watermark (Free Tier)</Label>
              <p className="text-sm text-muted-foreground">
                Display "Made with BrightBoard" watermark on free user videos
              </p>
            </div>
            <Switch
              id="show-watermark"
              checked={videoSettings?.showWatermark ?? true}
              onCheckedChange={(checked) => updateVideoSettings.mutate({ showWatermark: checked })}
              data-testid="switch-show-watermark"
            />
          </div>
          
          {videoSettings?.showWatermark && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Watermark Position</Label>
                <p className="text-sm text-muted-foreground">
                  Where to display the watermark on videos
                </p>
              </div>
              <Select
                value={videoSettings?.watermarkPosition ?? "top-right"}
                onValueChange={(value) => updateVideoSettings.mutate({ watermarkPosition: value as any })}
              >
                <SelectTrigger className="w-[150px]" data-testid="select-watermark-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-end-logo">BrightBoard Logo at End</Label>
              <p className="text-sm text-muted-foreground">
                Always show BrightBoard logo at the end of all videos (like TikTok)
              </p>
            </div>
            <Switch
              id="show-end-logo"
              checked={videoSettings?.showEndLogo ?? true}
              onCheckedChange={(checked) => updateVideoSettings.mutate({ showEndLogo: checked })}
              data-testid="switch-show-end-logo"
            />
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Note: End logo branding is mandatory for all users to maintain app recognition.
              The watermark only applies to free tier users - premium users get clean videos.
            </p>
          </div>
        </CardContent>
      </Card>

      <AffiliateManagement />
    </div>
  );
}

function AffiliateManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: affiliatesData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/affiliates"],
  });

  const updateAffiliate = useMutation({
    mutationFn: async ({ id, status, rejectedReason }: { id: string; status: string; rejectedReason?: string }) => {
      await apiRequest("PATCH", `/api/affiliates/${id}`, { status, rejectedReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates"] });
    },
  });

  const pending = affiliatesData?.filter((a: any) => a.status === "pending") || [];
  const approved = affiliatesData?.filter((a: any) => a.status === "approved") || [];
  const rejected = affiliatesData?.filter((a: any) => a.status === "rejected") || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>{t("common.loading")}</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Affiliate Management
            </CardTitle>
            <CardDescription>
              {affiliatesData?.length || 0} total applications
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{pending.length} pending</Badge>
            <Badge className="bg-green-500">{approved.length} approved</Badge>
            <Badge variant="destructive">{rejected.length} rejected</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!affiliatesData || affiliatesData.length === 0) && (
          <p className="text-center text-muted-foreground py-8">No affiliate applications yet.</p>
        )}

        {pending.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Pending Review</h4>
            {pending.map((aff: any) => (
              <div key={aff.id} className="border rounded-md p-4 space-y-3" data-testid={`affiliate-pending-${aff.id}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium">{aff.name}</p>
                    <p className="text-sm text-muted-foreground">{aff.email}</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                {aff.website && <p className="text-sm"><span className="text-muted-foreground">Website:</span> {aff.website}</p>}
                {aff.socialMedia && <p className="text-sm"><span className="text-muted-foreground">Social:</span> {aff.socialMedia}</p>}
                {aff.audience && <p className="text-sm"><span className="text-muted-foreground">Audience:</span> {aff.audience}</p>}
                <p className="text-sm"><span className="text-muted-foreground">Reason:</span> {aff.reason}</p>
                <p className="text-xs text-muted-foreground">Applied: {new Date(aff.createdAt).toLocaleDateString()}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateAffiliate.mutate({ id: aff.id, status: "approved" })}
                    disabled={updateAffiliate.isPending}
                    data-testid={`button-approve-${aff.id}`}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt("Reason for rejection (optional):");
                      updateAffiliate.mutate({ id: aff.id, status: "rejected", rejectedReason: reason || undefined });
                    }}
                    disabled={updateAffiliate.isPending}
                    data-testid={`button-reject-${aff.id}`}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {approved.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Approved Affiliates</h4>
            {approved.map((aff: any) => (
              <div key={aff.id} className="border rounded-md p-4" data-testid={`affiliate-approved-${aff.id}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium">{aff.name}</p>
                    <p className="text-sm text-muted-foreground">{aff.email}</p>
                  </div>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-muted-foreground">Code: <code className="font-mono text-primary">{aff.referralCode}</code></span>
                  <span className="text-muted-foreground">Referrals: <strong>{aff.totalReferrals}</strong></span>
                  <span className="text-muted-foreground">Earnings: <strong>${((aff.totalEarnings || 0) / 100).toFixed(2)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {rejected.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Rejected</h4>
            {rejected.map((aff: any) => (
              <div key={aff.id} className="border rounded-md p-4 opacity-60" data-testid={`affiliate-rejected-${aff.id}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium">{aff.name}</p>
                    <p className="text-sm text-muted-foreground">{aff.email}</p>
                  </div>
                  <Badge variant="destructive">Rejected</Badge>
                </div>
                {aff.rejectedReason && <p className="text-sm mt-1 text-muted-foreground">{aff.rejectedReason}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
