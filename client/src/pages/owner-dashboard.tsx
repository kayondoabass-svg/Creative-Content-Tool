import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Crown, Zap, BarChart3, Calendar, Mail, Clock, DollarSign, ArrowLeft, Video, Settings, UserCheck, UserX, Link2, Building2, Receipt, CreditCard, MapPin, FileText, Landmark, ShieldCheck, RefreshCw, Search, Activity, AlertTriangle, ChevronRight, ChevronDown, Send, Trophy, Eye, GraduationCap, Megaphone, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
  const [activationSending, setActivationSending] = useState(false);

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

  const sendActivationEmails = async () => {
    if (!confirm(`Send activation emails to eligible inactive users (verified, 24h+ old, never generated)?`)) return;
    setActivationSending(true);
    try {
      const res = await apiRequest("POST", "/api/owner/send-activation-emails", {});
      const data = await res.json();
      toast({ title: "Activation emails sent!", description: `Sent to ${data.sent} users (${data.total} eligible).` });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setActivationSending(false);
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={blastSending || activationSending}
                variant="outline"
                data-testid="button-send-emails-dropdown"
                className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
              >
                <Mail className="h-4 w-4 mr-1" />
                {blastSending || activationSending ? "Sending..." : "Send Emails"}
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Choose email campaign</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={sendActivationEmails}
                disabled={activationSending}
                data-testid="button-send-activation"
                className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-2 font-medium">
                  <UserPlus className="h-4 w-4 text-amber-600" />
                  Activation Emails
                </div>
                <p className="text-xs text-muted-foreground pl-6">Verified users who never generated content</p>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={sendMarketingBlast}
                disabled={blastSending}
                data-testid="button-send-marketing-blast"
                className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Megaphone className="h-4 w-4 text-purple-600" />
                  Marketing Blast
                </div>
                <p className="text-xs text-muted-foreground pl-6">All free users — feature highlight email</p>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <ActivitySection />

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

      <FunnelSection />
      <div className="grid gap-6 lg:grid-cols-2">
        <RetentionSection />
        <GeminiCostSection />
      </div>
      <TopGeneratorsSection />
      <UserLookupSection />
      <AffiliateManagement />
    </div>
  );
}

// ── User Funnel + Activation Panel ──────────────────────────────────────────
function FunnelSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const { data: funnel, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/funnel"],
  });

  const sendActivation = async () => {
    if (!confirm(`Send activation emails to ${funnel?.activationEligible ?? 0} eligible inactive users?`)) return;
    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/owner/send-activation-emails", {});
      const data = await res.json();
      toast({ title: "Activation emails sent!", description: `Sent to ${data.sent} users.` });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/funnel"] });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const steps = [
    { label: "Registered", value: funnel?.total ?? 0, icon: Users, color: "bg-blue-500" },
    { label: "Email Verified", value: funnel?.verified ?? 0, icon: ShieldCheck, color: "bg-purple-500" },
    { label: "Generated Content", value: funnel?.generated ?? 0, icon: Zap, color: "bg-amber-500" },
    { label: "Premium", value: funnel?.premium ?? 0, icon: Crown, color: "bg-green-500" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            User Conversion Funnel
          </CardTitle>
          <CardDescription>Where users drop off on their journey to premium</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, i) => {
                const pct = steps[0].value > 0 ? Math.round((step.value / steps[0].value) * 100) : 0;
                const dropPct = i > 0 && steps[i-1].value > 0
                  ? Math.round(((steps[i-1].value - step.value) / steps[i-1].value) * 100)
                  : null;
                return (
                  <div key={step.label} data-testid={`funnel-step-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <step.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{step.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {dropPct !== null && dropPct > 0 && (
                          <span className="text-rose-500 text-xs">−{dropPct}% drop</span>
                        )}
                        <span className="font-bold">{step.value.toLocaleString()}</span>
                        <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${step.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Activation Emails
          </CardTitle>
          <CardDescription>Re-engage users who never generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Eligible to email</p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-200" data-testid="activation-eligible-count">
                  {funnel?.activationEligible ?? 0}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Verified, 24h+ old, never generated, not yet emailed
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Already sent</p>
                <p className="text-2xl font-bold" data-testid="activation-sent-count">{funnel?.activationSent ?? 0}</p>
              </div>
              <Button
                className="w-full"
                onClick={sendActivation}
                disabled={sending || (funnel?.activationEligible ?? 0) === 0}
                data-testid="button-send-activation"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : `Send Now (${funnel?.activationEligible ?? 0})`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Retention Stats ──────────────────────────────────────────────────────────
function RetentionSection() {
  const { data: retention, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/retention"],
  });

  const cards = [
    { label: "Active last 7 days", value: retention?.active7d ?? 0, icon: Activity, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" },
    { label: "Active last 30 days", value: retention?.active30d ?? 0, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
    { label: "Inactive 30+ days", value: retention?.inactive30d ?? 0, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800" },
    { label: "Hit free limit (intent)", value: retention?.limitHitters ?? 0, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Retention & Activity
        </CardTitle>
        <CardDescription>User engagement and inactivity signals</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map(c => (
              <div key={c.label} className={`rounded-lg border p-3 ${c.bg}`} data-testid={`retention-${c.label.toLowerCase().replace(/\s+/g,'-')}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                  <p className={`text-xs font-medium ${c.color}`}>{c.label}</p>
                </div>
                <p className="text-2xl font-bold">{(c.value as number).toLocaleString()}</p>
                {retention?.total > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((c.value / retention.total) * 100)}% of users
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Google Gemini AI Cost Tracker ────────────────────────────────────────────
function GeminiCostSection() {
  const { data: costs, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/ai-costs"],
  });

  const fmt = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`;

  const typeEmoji: Record<string, string> = {
    image: "🖼️", presentation: "📊", mindmap: "🗺️",
    worksheet: "📝", text: "✍️", activity: "🎮", storyboard: "🎬",
  };

  const maxTypeVal = costs?.byType ? Math.max(...Object.values(costs.byType as Record<string, number>), 1) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Gemini AI Generation Cost
        </CardTitle>
        <CardDescription>Estimated Gemini 2.5 Flash spend per content generation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Today", value: costs?.today ?? 0 },
                { label: "This Week", value: costs?.week ?? 0 },
                { label: "This Month", value: costs?.month ?? 0 },
                { label: "All Time", value: costs?.allTime ?? 0 },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-muted/50 p-3" data-testid={`gemini-cost-${s.label.toLowerCase().replace(/\s+/g,'-')}`}>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(s.value)}</p>
                </div>
              ))}
            </div>

            {costs?.byType && Object.keys(costs.byType).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Cost by Content Type</p>
                <div className="space-y-2">
                  {Object.entries(costs.byType as Record<string, number>)
                    .sort(([,a],[,b]) => b - a)
                    .map(([type, amount]) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-sm w-4">{typeEmoji[type] ?? "📄"}</span>
                        <span className="text-sm capitalize w-24 text-muted-foreground">{type}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.round((amount / maxTypeVal) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{fmt(amount)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {costs?.recentCount === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No AI generation costs logged yet. Costs are tracked automatically when users generate content.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Top Generators ───────────────────────────────────────────────────────────
function TopGeneratorsSection() {
  const { data: topUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/top-generators"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Top Generators
        </CardTitle>
        <CardDescription>Most active users by total content created</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : topUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No generations yet.</p>
        ) : (
          <div className="space-y-2">
            {topUsers.map((u, i) => {
              const isPremium = u.subscriptionTier !== "free" && u.subscriptionStatus === "active";
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Anonymous";
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`top-generator-${i}`}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    {i + 1}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{u.totalGenerations} generated</p>
                    <Badge variant={isPremium ? "default" : "secondary"} className={`text-xs ${isPremium ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}`}>
                      {u.subscriptionTier}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── User Search & Lookup ─────────────────────────────────────────────────────
function UserLookupSection() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: foundUser, isLoading, isFetching } = useQuery<any>({
    queryKey: ["/api/owner/user-lookup", query],
    queryFn: async () => {
      if (!query) return null;
      const res = await fetch(`/api/owner/user-lookup?email=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!query,
  });

  const updateSub = async (userId: string, tier: string, status: string) => {
    try {
      await apiRequest("PATCH", `/api/owner/user/${userId}/subscription`, { tier, status });
      toast({ title: "Subscription updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/user-lookup", query] });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const FREE_LIMITS: Record<string, number> = { image: 2, presentation: 1, mindmap: 2, worksheet: 2, text: 3, activity: 2, storyboard: 1 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          User Lookup
        </CardTitle>
        <CardDescription>Search for any user by email address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="user@example.com"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && setQuery(search.trim())}
            data-testid="input-user-lookup"
            className="flex-1"
          />
          <Button onClick={() => setQuery(search.trim())} data-testid="button-user-lookup">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {(isLoading || isFetching) && <Skeleton className="h-40 w-full" />}

        {!isLoading && !isFetching && query && foundUser === null && (
          <p className="text-center text-muted-foreground py-4">No user found with that email.</p>
        )}

        {foundUser && !isLoading && (
          <div className="rounded-lg border p-4 space-y-4" data-testid="user-lookup-result">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {(foundUser.firstName || foundUser.email || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{[foundUser.firstName, foundUser.lastName].filter(Boolean).join(" ") || "—"}</p>
                  <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant={foundUser.emailVerified ? "default" : "secondary"} className="text-xs">
                      {foundUser.emailVerified ? "Verified" : "Unverified"}
                    </Badge>
                    <Badge variant={foundUser.subscriptionTier !== "free" ? "default" : "secondary"}
                      className={`text-xs ${foundUser.subscriptionTier !== "free" ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}`}>
                      {foundUser.subscriptionTier}
                    </Badge>
                    {foundUser.isOwner && <Badge className="text-xs bg-yellow-500">Owner</Badge>}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Joined {new Date(foundUser.createdAt).toLocaleDateString()}</p>
                <p>Active {foundUser.lastActiveAt ? new Date(foundUser.lastActiveAt).toLocaleDateString() : "never"}</p>
                {foundUser.activationEmailSentAt && <p className="text-xs">Activation email sent</p>}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Daily Usage (today's counts)</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Object.entries(FREE_LIMITS).map(([type, limit]) => {
                  const countKey = type === "storyboard" ? "freeVideoCount"
                    : type === "image" ? "freeImageCount"
                    : type === "presentation" ? "freePresentationCount"
                    : `free${type.charAt(0).toUpperCase()}${type.slice(1)}Count`;
                  const used = foundUser[countKey] ?? 0;
                  const full = used >= limit;
                  return (
                    <div key={type} className={`rounded p-2 text-center text-xs border ${full ? "border-rose-300 bg-rose-50 dark:bg-rose-950/30" : "border-border bg-muted/30"}`}>
                      <p className="font-medium capitalize">{type}</p>
                      <p className={`font-bold ${full ? "text-rose-600" : ""}`}>{used}/{limit}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {foundUser.subscriptionTier === "free" ? (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => updateSub(foundUser.id, "monthly", "active")} data-testid="button-grant-monthly">
                  <Crown className="h-3 w-3 mr-1" /> Grant Monthly
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateSub(foundUser.id, "yearly", "active")} data-testid="button-grant-yearly">
                  <Crown className="h-3 w-3 mr-1" /> Grant Yearly
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => updateSub(foundUser.id, "free", "inactive")} data-testid="button-revoke-premium">
                Revoke Premium
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

// ── Traffic & Activity Analytics ─────────────────────────────────────────────
function ActivitySection() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");

  const { data, isLoading } = useQuery<{
    period: string;
    series: { label: string; signups: number; logins: number; pageViews: number; generations: number }[];
    totals: { signups: number; logins: number; pageViews: number; generations: number; uniqueVisitors: number };
    allTime: { signups: number; logins: number; pageViews: number; realPageViews: number; botPageViews: number; uniqueVisitors: number; generations: number };
  }>({
    queryKey: ["/api/owner/activity", period],
    queryFn: () => fetch(`/api/owner/activity?period=${period}`).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const METRICS = [
    { key: "pageViews",   label: "Page Views",   color: "#6366f1", icon: Eye },
    { key: "logins",      label: "Logins",        color: "#10b981", icon: UserCheck },
    { key: "signups",     label: "New Accounts",  color: "#f59e0b", icon: UserPlus },
    { key: "generations", label: "Generations",   color: "#8b5cf6", icon: Zap },
  ] as const;

  const periodLabel = period === "24h" ? "24 h" : period === "7d" ? "7 days" : "30 days";

  const botPct = data?.allTime.pageViews
    ? Math.round((data.allTime.botPageViews / data.allTime.pageViews) * 100)
    : 0;

  const totalCards = [
    {
      label: "Unique Visitors",
      allTime: data?.allTime.uniqueVisitors ?? 0,
      period: data?.totals.uniqueVisitors ?? 0,
      sub: `${data?.allTime.realPageViews.toLocaleString() ?? 0} real views`,
      color: "text-indigo-600",
      bg: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800",
      icon: Eye,
    },
    {
      label: "Logins",
      allTime: data?.allTime.logins ?? 0,
      period: data?.totals.logins ?? 0,
      sub: null,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
      icon: UserCheck,
    },
    {
      label: "Total Users",
      allTime: data?.allTime.signups ?? 0,
      period: data?.totals.signups ?? 0,
      sub: null,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
      icon: UserPlus,
    },
    {
      label: "Generations",
      allTime: data?.allTime.generations ?? 0,
      period: data?.totals.generations ?? 0,
      sub: `${botPct}% bot traffic`,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
      icon: Zap,
    },
  ];

  return (
    <Card data-testid="section-activity">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Traffic & Activity
            </CardTitle>
            <CardDescription>Visitors, logins, signups and content generation over time</CardDescription>
          </div>
          <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
            {(["24h", "7d", "30d"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                data-testid={`activity-period-${p}`}
                className={`px-3 py-1.5 transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {p === "24h" ? "24 Hours" : p === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Totals row — big number = all time, small = selected period */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {totalCards.map(c => (
            <div key={c.label} className={`rounded-lg border p-3 ${c.bg}`} data-testid={`activity-card-${c.label.toLowerCase().replace(/\s+/g,"-")}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                <p className={`text-xs font-medium ${c.color}`}>{c.label}</p>
              </div>
              {isLoading ? (
                <div className="h-7 w-16 rounded bg-muted animate-pulse" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{c.allTime.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    +{c.period.toLocaleString()} in {periodLabel}
                  </p>
                  {c.sub && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{c.sub}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        {isLoading ? (
          <div className="h-64 w-full rounded bg-muted/50 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.series ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {METRICS.map(m => (
                  <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={m.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {METRICS.map(m => (
                <Area
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  fill={`url(#grad-${m.key})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}

        <p className="text-xs text-muted-foreground">
          Large numbers = all-time totals (every user since launch) · Small numbers = activity in the selected period · Chart shows selected period trend
        </p>
      </CardContent>
    </Card>
  );
}
