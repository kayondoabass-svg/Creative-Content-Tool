import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, Globe, BarChart3, Briefcase, Plus, Pencil, Trash2, Crown, Image, Presentation, FileText, Gamepad2, Video, FileSpreadsheet, Loader2, ShieldX } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserStats {
  totalUsers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  freeUsers: number;
  premiumUsers: number;
  weeklySubscribers: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
}

interface CountryStats {
  country: string;
  userCount: number;
}

interface FeatureStats {
  featureType: string;
  usageCount: number;
}

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description?: string;
  requirements?: string;
  salary?: string;
  isActive: boolean;
  createdAt: string;
}

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  country?: string;
  createdAt?: string;
  lastActiveAt?: string;
}

const featureIcons: Record<string, any> = {
  image: Image,
  presentation: Presentation,
  text: FileText,
  activity: Gamepad2,
  storyboard: Video,
  worksheet: FileSpreadsheet,
};

const featureColors: Record<string, string> = {
  image: "from-pink-500 to-rose-500",
  presentation: "from-blue-500 to-cyan-500",
  text: "from-teal-500 to-emerald-500",
  activity: "from-green-500 to-lime-500",
  storyboard: "from-purple-500 to-violet-500",
  worksheet: "from-orange-500 to-amber-500",
};

export default function CEODashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "",
    location: "",
    type: "full-time",
    description: "",
    requirements: "",
    salary: "",
  });

  // Check CEO access first
  const { data: ceoCheck, isLoading: ceoLoading } = useQuery<{ isCEO: boolean }>({
    queryKey: ["/api/ceo/check"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/ceo/stats"],
    enabled: ceoCheck?.isCEO === true,
  });

  const { data: countries, isLoading: countriesLoading } = useQuery<CountryStats[]>({
    queryKey: ["/api/ceo/countries"],
    enabled: ceoCheck?.isCEO === true,
  });

  const { data: features, isLoading: featuresLoading } = useQuery<FeatureStats[]>({
    queryKey: ["/api/ceo/features"],
    enabled: ceoCheck?.isCEO === true,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/ceo/users"],
    enabled: ceoCheck?.isCEO === true,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<JobPosting[]>({
    queryKey: ["/api/ceo/jobs"],
    enabled: ceoCheck?.isCEO === true,
  });

  // Show loading state
  if (ceoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied for non-CEO users
  if (!ceoCheck?.isCEO) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-center">You need to be logged in as the CEO to view this page.</p>
        <div className="flex gap-4">
          <Button onClick={() => setLocation("/login")} data-testid="button-login">
            Log In
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = statsLoading || countriesLoading || featuresLoading || usersLoading || jobsLoading;

  const createJobMutation = useMutation({
    mutationFn: async (job: typeof jobForm) => {
      return await apiRequest("POST", "/api/ceo/jobs", job);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ceo/jobs"] });
      setIsJobDialogOpen(false);
      resetJobForm();
      toast({ title: "Job posting created!" });
    },
    onError: () => {
      toast({ title: "Failed to create job posting", variant: "destructive" });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, ...job }: { id: string } & Partial<typeof jobForm & { isActive?: boolean }>) => {
      return await apiRequest("PATCH", `/api/ceo/jobs/${id}`, job);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ceo/jobs"] });
      setIsJobDialogOpen(false);
      setEditingJob(null);
      resetJobForm();
      toast({ title: "Job posting updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update job posting", variant: "destructive" });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/ceo/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ceo/jobs"] });
      toast({ title: "Job posting deleted!" });
    },
    onError: () => {
      toast({ title: "Failed to delete job posting", variant: "destructive" });
    },
  });

  const resetJobForm = () => {
    setJobForm({
      title: "",
      department: "",
      location: "",
      type: "full-time",
      description: "",
      requirements: "",
      salary: "",
    });
  };

  const handleEditJob = (job: JobPosting) => {
    setEditingJob(job);
    setJobForm({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description || "",
      requirements: job.requirements || "",
      salary: job.salary || "",
    });
    setIsJobDialogOpen(true);
  };

  const handleSubmitJob = () => {
    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, ...jobForm });
    } else {
      createJobMutation.mutate(jobForm);
    }
  };

  const totalFeatureUsage = features?.reduce((acc, f) => acc + f.usageCount, 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-8 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            CEO Dashboard
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground mt-1">BrightBoard Analytics & Management</p>
        </div>
      </div>

      {/* User Statistics */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-primary">{stats?.totalUsers || 0}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-green-500">+{stats?.newToday || 0}</div>
              <div className="text-sm text-muted-foreground">New Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-blue-500">+{stats?.newThisWeek || 0}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-purple-500">+{stats?.newThisMonth || 0}</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-amber-500">{stats?.premiumUsers || 0}</div>
              <div className="text-sm text-muted-foreground">Premium Users</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Subscription Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Free Users</span>
                  <Badge variant="secondary">{stats?.freeUsers || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Weekly Subscribers</span>
                  <Badge className="bg-blue-500">{stats?.weeklySubscribers || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monthly Subscribers</span>
                  <Badge className="bg-purple-500">{stats?.monthlySubscribers || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Yearly Subscribers</span>
                  <Badge className="bg-amber-500">{stats?.yearlySubscribers || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Users by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-auto">
                {countries?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No country data yet</p>
                )}
                {countries?.slice(0, 10).map((c) => (
                  <div key={c.country} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{c.country}</span>
                    <Badge variant="outline">{c.userCount}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Usage Analytics */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Feature Usage Analytics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {features?.map((feature) => {
            const Icon = featureIcons[feature.featureType] || FileText;
            const colorClass = featureColors[feature.featureType] || "from-gray-500 to-slate-500";
            const percentage = totalFeatureUsage > 0 ? Math.round((feature.usageCount / totalFeatureUsage) * 100) : 0;
            
            return (
              <Card key={feature.featureType} className="hover-elevate">
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold">{feature.usageCount}</div>
                  <div className="text-xs text-muted-foreground capitalize">{feature.featureType}</div>
                  <div className="text-xs text-muted-foreground mt-1">{percentage}%</div>
                </CardContent>
              </Card>
            );
          })}
          {(!features || features.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-muted-foreground">
                No feature usage data yet. Usage will appear as users generate content.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Hiring / Job Postings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Hiring & Job Postings
          </h2>
          <Dialog open={isJobDialogOpen} onOpenChange={(open) => {
            setIsJobDialogOpen(open);
            if (!open) {
              setEditingJob(null);
              resetJobForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-job">
                <Plus className="h-4 w-4 mr-1" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingJob ? "Edit Job Posting" : "Create Job Posting"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Job Title</Label>
                  <Input
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g., Senior Frontend Developer"
                    data-testid="input-job-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                      placeholder="e.g., Engineering"
                      data-testid="input-job-department"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      placeholder="e.g., Remote, USA"
                      data-testid="input-job-location"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Job Type</Label>
                    <Select value={jobForm.type} onValueChange={(v) => setJobForm({ ...jobForm, type: v })}>
                      <SelectTrigger data-testid="select-job-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Salary Range</Label>
                    <Input
                      value={jobForm.salary}
                      onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                      placeholder="e.g., $80k - $120k"
                      data-testid="input-job-salary"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Job description..."
                    rows={3}
                    data-testid="input-job-description"
                  />
                </div>
                <div>
                  <Label>Requirements</Label>
                  <Textarea
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    placeholder="Job requirements..."
                    rows={3}
                    data-testid="input-job-requirements"
                  />
                </div>
                <Button 
                  onClick={handleSubmitJob} 
                  className="w-full"
                  disabled={!jobForm.title || !jobForm.department || !jobForm.location}
                  data-testid="button-submit-job"
                >
                  {editingJob ? "Update Job" : "Create Job"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell className="capitalize">{job.type}</TableCell>
                    <TableCell>{job.salary || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={job.isActive ? "default" : "secondary"}>
                        {job.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditJob(job)}
                          data-testid={`button-edit-job-${job.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateJobMutation.mutate({ id: job.id, isActive: !job.isActive })}
                          data-testid={`button-toggle-job-${job.id}`}
                        >
                          {job.isActive ? "Pause" : "Resume"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteJobMutation.mutate(job.id)}
                          className="text-destructive"
                          data-testid={`button-delete-job-${job.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!jobs || jobs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No job postings yet. Click "Add Position" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Recent Users */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Users
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.slice(0, 20).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName || ""} {user.lastName || ""}
                      {!user.firstName && !user.lastName && <span className="text-muted-foreground">Unknown</span>}
                    </TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{user.country || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant={user.subscriptionTier === "free" || !user.subscriptionTier ? "secondary" : "default"}>
                        {user.subscriptionTier || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!users || users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
