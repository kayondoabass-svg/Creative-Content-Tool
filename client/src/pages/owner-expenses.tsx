import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Bot,
  Mail,
  Cloud,
  Globe,
  ShoppingCart,
  Megaphone,
  CreditCard,
  MoreHorizontal,
  Edit2,
  Loader2
} from "lucide-react";
import { SiTiktok, SiFacebook, SiGoogle, SiAmazon, SiCloudflare } from "react-icons/si";

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  isAutomatic: boolean;
  metadata: string | null;
  createdAt: string;
}

interface ExpenseSummary {
  byCategory: { category: string; totalAmount: number; count: number }[];
  totals: { total: number; automatic: number; manual: number };
}

const categoryInfo: Record<string, { label: string; icon: any; color: string }> = {
  openai: { label: "Gemini API", icon: Bot, color: "bg-emerald-500" },
  gemini: { label: "Gemini API", icon: Bot, color: "bg-emerald-500" },
  resend: { label: "Resend Emails", icon: Mail, color: "bg-blue-500" },
  replit: { label: "Replit", icon: Cloud, color: "bg-orange-500" },
  cloudflare: { label: "Cloudflare", icon: SiCloudflare, color: "bg-yellow-500" },
  amazon: { label: "Amazon/AWS", icon: SiAmazon, color: "bg-amber-600" },
  paddle: { label: "Paddle Fees", icon: CreditCard, color: "bg-indigo-500" },
  tiktok_ads: { label: "TikTok Ads", icon: SiTiktok, color: "bg-pink-500" },
  meta_ads: { label: "Meta Ads", icon: SiFacebook, color: "bg-blue-600" },
  google_ads: { label: "Google Ads", icon: SiGoogle, color: "bg-red-500" },
  domain: { label: "Domain", icon: Globe, color: "bg-purple-500" },
  other: { label: "Other", icon: MoreHorizontal, color: "bg-gray-500" },
};

export default function OwnerExpenses() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/owner/expenses"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<ExpenseSummary>({
    queryKey: ["/api/owner/expenses/summary"],
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { category: string; description: string; amount: number; date: string }) => {
      const response = await apiRequest("POST", "/api/owner/expenses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses/summary"] });
      toast({ title: "Expense added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to add expense", description: error.message, variant: "destructive" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Expense> }) => {
      const response = await apiRequest("PATCH", `/api/owner/expenses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses/summary"] });
      toast({ title: "Expense updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update expense", description: error.message, variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/owner/expenses/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/expenses/summary"] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete expense", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
    };

    if (editingId) {
      updateExpenseMutation.mutate({ id: editingId, data });
    } else {
      addExpenseMutation.mutate(data);
    }
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: (expense.amount / 100).toFixed(2),
      date: new Date(expense.date).toISOString().split("T")[0],
    });
    setEditingId(expense.id);
    setShowAddForm(true);
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <CardTitle className="text-red-500">Access Denied</CardTitle>
          <CardDescription>Only the owner can access this page.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/owner-dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Expenses Tracker</h1>
              <p className="text-muted-foreground">Track all your business costs</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-expenses">
                {summaryLoading ? "..." : formatCurrency(summary?.totals.total || 0)}
              </div>
              <p className="text-xs text-muted-foreground">All time total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automatic Costs</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600" data-testid="text-auto-expenses">
                {summaryLoading ? "..." : formatCurrency(summary?.totals.automatic || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Gemini, Resend (tracked)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manual Entries</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-manual-expenses">
                {summaryLoading ? "..." : formatCurrency(summary?.totals.manual || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Ads, subscriptions, etc.</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {summary?.byCategory.map((cat) => {
                const info = categoryInfo[cat.category] || categoryInfo.other;
                const IconComponent = info.icon;
                return (
                  <div 
                    key={cat.category} 
                    className="p-3 rounded-lg border bg-card hover-elevate"
                    data-testid={`card-category-${cat.category}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${info.color}`}>
                        <IconComponent className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-medium truncate">{info.label}</span>
                    </div>
                    <div className="text-lg font-bold">{formatCurrency(cat.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground">{cat.count} entries</div>
                  </div>
                );
              })}
              {(!summary?.byCategory || summary.byCategory.length === 0) && !summaryLoading && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No expenses recorded yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Expense Button & Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expense Entries</CardTitle>
              <Button 
                onClick={() => setShowAddForm(!showAddForm)} 
                size="sm"
                data-testid="button-add-expense"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryInfo).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <info.icon className="h-3 w-3" />
                              {info.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., January TikTok campaign"
                      data-testid="input-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      data-testid="input-amount"
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      data-testid="input-date"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    type="submit" 
                    disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {(addExpenseMutation.isPending || updateExpenseMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    )}
                    {editingId ? "Update" : "Add"} Expense
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} data-testid="button-cancel">
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Expenses List */}
            <div className="space-y-2">
              {expensesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : expenses && expenses.length > 0 ? (
                expenses.map((expense) => {
                  const info = categoryInfo[expense.category] || categoryInfo.other;
                  const IconComponent = info.icon;
                  return (
                    <div 
                      key={expense.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                      data-testid={`expense-row-${expense.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${info.color}`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(expense.date).toLocaleDateString()}
                            {expense.isAutomatic && (
                              <Badge variant="secondary" className="text-xs">Auto</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{formatCurrency(expense.amount)}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(expense)}
                            data-testid={`button-edit-${expense.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteExpenseMutation.mutate(expense.id)}
                            disabled={deleteExpenseMutation.isPending}
                            data-testid={`button-delete-${expense.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No expenses recorded yet</p>
                  <p className="text-sm">Click "Add Expense" to track your costs</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Cost Tracking Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Gemini & Resend</strong>: Automatically tracked when content is generated or emails are sent</li>
              <li>• <strong>Replit</strong>: Add your monthly subscription cost (Core/Pro plan)</li>
              <li>• <strong>Cloudflare</strong>: Usually free for basic DNS, add if using paid features</li>
              <li>• <strong>Paddle Fees</strong>: ~5% + $0.50 per subscription transaction</li>
              <li>• <strong>Ad Spend</strong>: Track your TikTok, Meta (Facebook/Instagram), and Google ad campaigns</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
