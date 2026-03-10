import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, BarChart3, Crown, FileText, Image, Film, Gamepad2, BookOpen, Network, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Footer } from "@/components/footer";

interface Payment {
  id: number;
  orderId: string;
  amount: number;
  currency: string;
  tier: string;
  status: string;
  paymentMethod: string | null;
  confirmationCode: string | null;
  createdAt: string;
}

interface UsageBreakdown {
  usageByType: { featureType: string; count: number }[];
  totalGenerations: number;
  isPremium: boolean;
  tier: string;
}

const typeIcons: Record<string, any> = {
  image: Image,
  presentation: FileText,
  text: BookOpen,
  activity: Gamepad2,
  storyboard: Film,
  worksheet: Receipt,
  mindmap: Network,
};

const typeLabels: Record<string, string> = {
  image: "Images",
  presentation: "Presentations",
  text: "Text Content",
  activity: "Games & Activities",
  storyboard: "Video Storyboards",
  worksheet: "Worksheets",
  mindmap: "Mind Maps",
};

export default function BillingPage() {
  const { isAuthenticated } = useAuth();

  const { data: paymentData, isLoading: paymentsLoading } = useQuery<{ payments: Payment[] }>({
    queryKey: ["/api/payments/history"],
    enabled: isAuthenticated,
  });

  const { data: usageData, isLoading: usageLoading } = useQuery<UsageBreakdown>({
    queryKey: ["/api/usage/breakdown"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-muted-foreground mb-8">Sign in to view your billing and usage</p>
        <Button asChild>
          <a href="/login">Sign In</a>
        </Button>
      </div>
    );
  }

  const payments = paymentData?.payments || [];
  const usageByType = usageData?.usageByType || [];
  const totalGenerations = usageData?.totalGenerations || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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

      <h1 className="text-3xl font-bold mb-8" data-testid="text-billing-title">Billing & Usage</h1>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card data-testid="card-usage-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Usage Summary (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary" data-testid="text-total-generations">{totalGenerations}</div>
                  <div className="text-sm text-muted-foreground">Total Generations</div>
                </div>
                <div className="space-y-3">
                  {usageByType.map((item) => {
                    const Icon = typeIcons[item.featureType] || FileText;
                    return (
                      <div key={item.featureType} className="flex items-center justify-between" data-testid={`usage-row-${item.featureType}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{typeLabels[item.featureType] || item.featureType}</span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    );
                  })}
                  {usageByType.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No usage data yet</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-subscription-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              {usageData?.isPremium ? (
                <>
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-lg px-4 py-1 mb-3">
                    {usageData.tier?.toUpperCase()} PLAN
                  </Badge>
                  <p className="text-sm text-muted-foreground">You have unlimited generations and premium features.</p>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-lg px-4 py-1 mb-3">FREE PLAN</Badge>
                  <p className="text-sm text-muted-foreground mb-4">Limited to 4 slides per presentation and daily generation limits.</p>
                  <Button asChild data-testid="button-upgrade-billing">
                    <a href="/pricing">Upgrade to Premium</a>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-payment-history">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-payments">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Plan</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Method</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0" data-testid={`payment-row-${payment.id}`}>
                      <td className="py-3 px-2">
                        {new Date(payment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-2 font-mono text-xs">{payment.orderId}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{payment.tier}</Badge>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {payment.currency} {(payment.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{payment.paymentMethod || '-'}</td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={payment.status === 'completed' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'}
                        >
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No payments yet</p>
          )}
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
}
