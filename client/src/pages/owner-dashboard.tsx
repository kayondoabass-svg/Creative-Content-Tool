import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Crown, Zap, BarChart3, Calendar, Mail, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span className="text-sm font-medium">{typeLabels[type] || type}</span>
      <Badge variant="secondary">{count}</Badge>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Owner Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName}! Here's your app overview.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Clock className="h-3 w-3 mr-1" />
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
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
    </div>
  );
}
