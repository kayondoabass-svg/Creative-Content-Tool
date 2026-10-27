import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Copy, Download, RefreshCw, Search, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "wouter";
import { ReferralPaymentReview } from "./referral-payment-review";

type Policy = { active: boolean; mode: "percentage" | "fixed"; percent: number; fixedCurrency: string; fixedRates: { weekly: number; monthly: number; institution: number }; holdDays: number; minimumByCurrency: Record<string, number>; attributionDays: number; updatedAt?: string };
type Affiliate = { id: string; name: string; email: string; website?: string; socialMedia?: string; audience?: string; reason: string; referralCode?: string; status: string; totalReferrals: number; totalEarnings: number; createdAt: string; approvedAt?: string; rejectedReason?: string; payoutMethod?: string; payoutDetails?: string; termsAcceptedAt?: string };
type Commission = { id: string; orderId: string; amount: number; currency: string; status: string; availableAt: string; createdAt: string; payoutId?: string; note?: string; providerState?: string; providerCheckedAt?: string };
type Payout = { id: string; affiliateId: string; currency: string; amount: number; status: string; method: string; details: string; reference?: string; createdAt: string; updatedAt: string };
type Activity = { id: string; action: string; note?: string; createdAt: string };
type Workspace = { affiliate: Affiliate | null; policy: Policy; commissions: Commission[]; adjustments?: { id: string; currency: string; exposure: number; status: string; recoveredAmount?: number; commissionReference?: string }[]; payouts: Payout[]; balances: { currency: string; held: number; available: number; reserved: number; paid: number; reversed: number; review?: number }[]; activity: Activity[]; referrals: { id: string; joinedAt: string }[]; stats: { linkVisits: number; signups: number; completedPaymentCount: number } };
type OwnerList = { affiliates: Affiliate[]; policy: Policy; payouts: Payout[]; pagination: { page: number; pageSize: number; total: number; totalPages: number }; counts: Record<string, number> };
type OwnerDetail = Workspace & { referrals: (Workspace["referrals"][number] & { firstName?: string | null; lastName?: string | null; email?: string | null })[] };
type Notification = { id: string; eventKey: string; subject: string; status: string; attempts: number; lastError?: string; createdAt: string; sentAt?: string };

const policyDefault: Policy = { active: false, mode: "percentage", percent: 30, fixedCurrency: "USD", fixedRates: { weekly: 100, monthly: 200, institution: 500 }, holdDays: 30, minimumByCurrency: { USD: 5000 }, attributionDays: 90 };
const money = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
const date = (value?: string) => value ? new Date(value).toLocaleDateString() : "—";
const statusTone = (s: string) => s === "approved" || s === "available" || s === "paid" || s === "sent" ? "default" : s === "rejected" || s === "reversed" || s === "failed" ? "destructive" : "secondary";
function useReferralMutation<T>(fn: (payload: T) => Promise<unknown>, keys: unknown[][]) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => { await Promise.all(keys.map(queryKey => qc.invalidateQueries({ queryKey }))); toast({ title: "Changes saved" }); },
    onError: async (error: Error) => {
      await Promise.all(keys.map(queryKey => qc.invalidateQueries({ queryKey })));
      toast({ title: "Could not complete that action", description: error.message, variant: "destructive" });
    },
  });
}
async function jsonRequest<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
}
function ErrorBox({ error, retry }: { error: Error | null; retry: () => void }) {
  if (!error) return null;
  const needsSignIn = error.message.startsWith("401");
  const verify = error.message.startsWith("403");
  return <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-semibold">{needsSignIn ? "Sign in to continue" : verify ? "Confirm your email first" : "We could not load this workspace"}</p>
    <p className="mt-1">{needsSignIn ? "Sign in to the BrightBoard account connected to this application." : verify ? "Referral workspaces require a verified email address. Check your inbox and finish email confirmation, then return here." : error.message}</p>
    {!needsSignIn && !verify && <Button className="mt-3" size="sm" variant="outline" onClick={retry}>Try again</Button>}
    {needsSignIn && <Link className="mt-3 inline-flex font-medium underline" href="/login">Go to sign in</Link>}
  </div>;
}
function PolicySummary({ policy }: { policy: Policy }) {
  return <Card className="border-primary/20 bg-primary/[0.035]">
    <CardHeader><CardTitle className="text-lg">Program terms</CardTitle><CardDescription>{policy.active ? "Current confirmed settings" : "Terms are not active yet"}</CardDescription></CardHeader>
    <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
      <p><span className="text-muted-foreground">Commission:</span> {policy.active ? policy.mode === "percentage" ? `${policy.percent}% of eligible completed payments` : `Fixed rates in ${policy.fixedCurrency}` : "Not confirmed — no rate is currently promised"}</p>
      {policy.active && policy.mode === "fixed" && <p><span className="text-muted-foreground">Tiers:</span> weekly {money(policy.fixedRates.weekly, policy.fixedCurrency)}; monthly {money(policy.fixedRates.monthly, policy.fixedCurrency)}; institution {money(policy.fixedRates.institution, policy.fixedCurrency)}</p>}
      <p><span className="text-muted-foreground">Clearing period:</span> {policy.active ? `${policy.holdDays} days` : "To be confirmed"}</p>
      <p><span className="text-muted-foreground">Attribution window:</span> 90 days</p>
      <p><span className="text-muted-foreground">Minimum payout:</span> {policy.active ? Object.entries(policy.minimumByCurrency).map(([c, n]) => `${money(n, c)} ${c}`).join(" · ") || "Not configured" : "Not confirmed"}</p>
      <p className="sm:col-span-2 text-muted-foreground">Payouts are reviewed and transferred manually outside BrightBoard. No automatic transfer is provided.</p>
    </CardContent>
  </Card>;
}

export function Affiliate() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [apply, setApply] = useState({ name: "", website: "", socialMedia: "", audience: "", reason: "" });
  const [terms, setTerms] = useState(false);
  const [section, setSection] = useState<"overview" | "apply" | "workspace">("overview");
  const [destination, setDestination] = useState({ payoutMethod: "paypal", payoutDetails: "" });
  const policyQuery = useQuery<Policy>({ queryKey: ["/api/referrals/policy"], queryFn: () => jsonRequest("/api/referrals/policy") });
  const meQuery = useQuery<Workspace>({ queryKey: ["/api/referrals/me", user?.id], queryFn: () => jsonRequest("/api/referrals/me"), enabled: !!user, retry: false, gcTime: 0 });
  const policy = policyQuery.data || policyDefault;
  const applyMutation = useReferralMutation((body: typeof apply & { termsAccepted: true }) => apiRequest("POST", "/api/referrals/apply", body), [["/api/referrals/me"]]);
  const saveDestination = useReferralMutation((body: typeof destination) => apiRequest("PATCH", "/api/referrals/me/payout-details", body), [["/api/referrals/me"]]);
  const requestPayout = useReferralMutation((currency: string) => apiRequest("POST", "/api/referrals/me/payouts", { currency }), [["/api/referrals/me"]]);
  const data = meQuery.data;
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast({ title: "Copied to clipboard" }); } catch { toast({ title: "Clipboard unavailable", description: "Select and copy the link manually.", variant: "destructive" }); } };
  const link = data?.affiliate?.referralCode ? `${window.location.origin}/signup?ref=${encodeURIComponent(data.affiliate.referralCode)}` : "";
  const loadState = authLoading || policyQuery.isLoading;
  return <div className="min-h-[100dvh] page-shell flex flex-col">
    <main className="bb-page max-w-5xl flex-1 py-8 md:py-12">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> BrightBoard home</Link>
      <div className="mb-8 grid gap-5 md:grid-cols-[1.3fr_.7fr] md:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-primary">BrightBoard partners</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Good teaching travels.</h1><p className="mt-3 max-w-xl text-muted-foreground">A private workspace for educators who share classroom resources with their community. Your application and financial records stay attached to your signed-in account.</p></div>
        <div className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Private by design</div><p className="mt-2 text-sm text-muted-foreground">You and the BrightBoard founder can view your partner records. Other applicants cannot access your status, activity or payout details.</p></div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Referral workspace sections">
        {(["overview", "apply", "workspace"] as const).map((tab) => <Button key={tab} role="tab" aria-selected={section === tab} variant={section === tab ? "default" : "outline"} onClick={() => setSection(tab)}>{tab === "overview" ? "Program" : tab === "apply" ? "Apply" : "My workspace"}</Button>)}
      </div>
      {policyQuery.isError && <ErrorBox error={policyQuery.error as Error} retry={() => policyQuery.refetch()} />}
      {loadState ? <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div> :
        section === "overview" ? <div className="space-y-5">
          <PolicySummary policy={policy} />
          <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]">
            <Card><CardHeader><CardTitle>Who this is for</CardTitle><CardDescription>People helping teachers find better tools.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><p>Classroom teachers sharing what works.</p><p>Education writers and resource creators.</p><p>School leaders and curriculum communities.</p></CardContent></Card>
            <Card><CardHeader><CardTitle>How the program works</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3 text-sm"><div><b className="block">01 · Apply</b><span className="text-muted-foreground">Tell us who you teach and where you share.</span></div><div><b className="block">02 · Review</b><span className="text-muted-foreground">The BrightBoard team reviews every application.</span></div><div><b className="block">03 · Track</b><span className="text-muted-foreground">Approved partners see itemized, private records here.</span></div></CardContent></Card>
          </div>
          <Button size="lg" onClick={() => setSection(user ? data?.affiliate ? "workspace" : "apply" : "workspace")}>{user ? data?.affiliate ? "Open my workspace" : "Start an application" : "Sign in to apply"}</Button>
        </div> :
        section === "apply" ? <Card><CardHeader><CardTitle>Partner application</CardTitle><CardDescription>We use your verified BrightBoard account email. No separate email lookup or application account.</CardDescription></CardHeader><CardContent>
          {!user ? <ErrorBox error={new Error("401: sign in")} retry={() => {}} /> : meQuery.isLoading ? <Skeleton className="h-32 w-full" /> : meQuery.isError ? <ErrorBox error={meQuery.error as Error} retry={() => meQuery.refetch()} /> : data?.affiliate && data.affiliate.status !== "rejected" ? <div className="rounded-xl bg-muted/50 p-5"><Badge variant={statusTone(data.affiliate.status) as any}>{data.affiliate.status}</Badge><p className="mt-3 text-sm">An application is already associated with your account. View its status and records in My workspace.</p><Button className="mt-4" onClick={() => setSection("workspace")}>Open my workspace</Button></div> :
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!terms) return; applyMutation.mutate({ ...apply, termsAccepted: true }, { onSuccess: () => { setSection("workspace"); meQuery.refetch(); } }); }}>
            <PolicySummary policy={policy} />
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="ref-name">Name</Label><Input id="ref-name" required value={apply.name} onChange={e => setApply({ ...apply, name: e.target.value })} /></div><div><Label htmlFor="ref-email">Account email</Label><Input id="ref-email" disabled value={user?.email || ""} /></div><div><Label htmlFor="ref-website">Website (optional)</Label><Input id="ref-website" value={apply.website} onChange={e => setApply({ ...apply, website: e.target.value })} /></div><div><Label htmlFor="ref-social">Social profile (optional)</Label><Input id="ref-social" value={apply.socialMedia} onChange={e => setApply({ ...apply, socialMedia: e.target.value })} /></div></div>
            <div><Label htmlFor="ref-audience">Who is your audience? (optional)</Label><Input id="ref-audience" value={apply.audience} onChange={e => setApply({ ...apply, audience: e.target.value })} /></div>
            <div><Label htmlFor="ref-reason">Why would you like to partner with BrightBoard?</Label><Textarea id="ref-reason" required rows={4} value={apply.reason} onChange={e => setApply({ ...apply, reason: e.target.value })} /></div>
            <div className="flex items-start gap-3"><Checkbox id="ref-terms" checked={terms} onCheckedChange={v => setTerms(v === true)} /><Label htmlFor="ref-terms" className="text-sm leading-relaxed">I have reviewed the program terms immediately above. I understand terms remain inactive until BrightBoard confirms them and payouts are manually transferred.</Label></div>
            <Button type="submit" disabled={!terms || applyMutation.isPending}>{applyMutation.isPending ? "Submitting…" : "Submit application"}</Button>
          </form>}
        </CardContent></Card> :
        !user ? <Card><CardHeader><CardTitle>Your private workspace</CardTitle><CardDescription>Sign in to access your application and partner records.</CardDescription></CardHeader><CardContent><ErrorBox error={new Error("401: sign in")} retry={() => {}} /></CardContent></Card> :
        meQuery.isLoading ? <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-52 w-full" /></div> :
        meQuery.isError ? <ErrorBox error={meQuery.error as Error} retry={() => meQuery.refetch()} /> :
        !data?.affiliate ? <Card><CardHeader><CardTitle>No application yet</CardTitle><CardDescription>Your workspace will appear here after you apply.</CardDescription></CardHeader><CardContent><Button onClick={() => setSection("apply")}>Start an application</Button></CardContent></Card> :
        <PartnerWorkspace data={data} link={link} destination={destination} setDestination={setDestination} onReapply={() => setSection("apply")} onSave={() => saveDestination.mutate(destination)} saving={saveDestination.isPending} onRequest={currency => requestPayout.mutate(currency)} requesting={requestPayout.isPending} copy={copy} policy={policy} retry={() => meQuery.refetch()} />}
    </main><Footer />
  </div>;
}

function PartnerWorkspace({ data, link, destination, setDestination, onReapply, onSave, saving, onRequest, requesting, copy, policy, retry }: { data: Workspace; link: string; destination: { payoutMethod: string; payoutDetails: string }; setDestination: (v: { payoutMethod: string; payoutDetails: string }) => void; onReapply: () => void; onSave: () => void; saving: boolean; onRequest: (c: string) => void; requesting: boolean; copy: (v: string) => void; policy: Policy; retry: () => void }) {
  const a = data.affiliate!;
  const [currency, setCurrency] = useState("");
  const selectedBalance = data.balances.find(balance => balance.currency === currency);
  const minimum = currency ? policy.minimumByCurrency[currency] : undefined;
  const payoutEligible = !!selectedBalance && minimum !== undefined && selectedBalance.available >= minimum && selectedBalance.available > 0;
  useEffect(() => { if (a.status === "approved") setDestination({ payoutMethod: a.payoutMethod || "paypal", payoutDetails: a.payoutDetails || "" }); }, [a.id, a.status, a.payoutMethod, a.payoutDetails, setDestination]);
  return <div className="space-y-5">
    <ReferralPaymentReview affiliateId={a.id} adjustments={data.adjustments} />
    <Card><CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>{a.name}'s partner desk</CardTitle><CardDescription>Application received {date(a.createdAt)} · account {a.email}</CardDescription></div><Badge variant={statusTone(a.status) as any} className="capitalize">{a.status}</Badge></CardHeader>
      <CardContent className="space-y-4">
        {a.status === "pending" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your application is with the BrightBoard team. You can revisit this page for updates.</p>}
        {a.status === "rejected" && <div className="rounded-lg bg-muted p-3 text-sm"><p>{a.rejectedReason || "The team has not added a reason."}</p><p className="mt-1 text-muted-foreground">You may submit a new application using the same signed-in account.</p></div>}
        {a.status === "suspended" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Partner activity is currently paused. Contact BrightBoard if you need clarification.</p>}
        {a.status === "rejected" && <Button onClick={onReapply}>Reapply</Button>}
        {a.status === "approved" && <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-4"><Label>Referral code</Label><div className="mt-2 flex gap-2"><code className="flex-1 break-all text-lg font-semibold">{a.referralCode || "Not assigned"}</code><Button aria-label="Copy referral code" variant="outline" size="icon" onClick={() => a.referralCode && copy(a.referralCode)}><Copy className="h-4 w-4" /></Button></div></div><div className="rounded-xl bg-muted/50 p-4"><Label>Your referral link</Label><div className="mt-2 flex gap-2"><code className="flex-1 break-all text-xs">{link || "Not assigned"}</code><Button aria-label="Copy referral link" variant="outline" size="icon" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button></div></div></div>}
      </CardContent></Card>
    <PolicySummary policy={data.policy || policy} />
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Link visits", value: data.stats?.linkVisits ?? 0 },
          { label: "Signups", value: data.stats?.signups ?? 0 },
          { label: "Commissioned payments", value: data.stats?.completedPaymentCount ?? 0 },
        ].map(item => <div key={item.label} className="rounded-xl border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{item.value.toLocaleString()}</p></div>)}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Link visits are raw valid referral-link requests, not unique visitors.</p>
    </div>
    <div className="rounded-xl border border-primary/20 bg-primary/[.035] p-4 text-sm text-muted-foreground">
      Historical payments from before the program policy was activated are not automatically credited. Reserved commissions are already included in payout requests.
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.balances.map(b => <div key={b.currency} className="rounded-xl border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{b.currency} balance</p><p className="mt-2 text-xl font-semibold">{money(b.available, b.currency)}</p><p className="mt-1 text-xs text-muted-foreground">Available · held {money(b.held, b.currency)} · reserved {money(b.reserved, b.currency)}</p><p className="mt-1 text-xs text-muted-foreground">Paid {money(b.paid, b.currency)} · reversed {money(b.reversed, b.currency)}</p></div>)}</div>
    <Card><CardHeader><CardTitle>Commission statement</CardTitle><CardDescription>Order identifiers are shown for your records; referred customers' personal information is not shown.</CardDescription></CardHeader><CardContent><TableEmpty rows={data.commissions} empty="No commission entries yet." headers={["Date", "Order", "Amount", "Status", "Available"]} render={(c: Commission) => <tr key={c.id} className="border-t"><td>{date(c.createdAt)}</td><td className="font-mono text-xs">{c.orderId}</td><td>{money(c.amount, c.currency)}</td><td><Badge variant={statusTone(c.status) as any}>{c.status}</Badge></td><td>{date(c.availableAt)}</td></tr>} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Payout history</CardTitle></CardHeader><CardContent><TableEmpty rows={data.payouts} empty="No payout requests yet." headers={["Requested", "Amount", "Method", "Status", "Reference"]} render={(p: Payout) => <tr key={p.id} className="border-t"><td>{date(p.createdAt)}</td><td>{money(p.amount, p.currency)}</td><td>{p.method}</td><td><Badge variant={statusTone(p.status) as any}>{p.status}</Badge></td><td>{p.reference || "—"}</td></tr>} /></CardContent></Card>
    {a.status === "approved" && <>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Payout destination</CardTitle><CardDescription>Provide transfer instructions or a contact reference only. Never enter passwords or card numbers. Transfers are handled manually.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="max-w-xs"><Label>Method</Label><Select value={destination.payoutMethod} onValueChange={v => setDestination({ ...destination, payoutMethod: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paypal">PayPal</SelectItem><SelectItem value="bank">Bank transfer</SelectItem></SelectContent></Select></div><div><Label htmlFor="pay-details">Payout instructions / contact reference</Label><Textarea id="pay-details" rows={3} value={destination.payoutDetails} onChange={e => setDestination({ ...destination, payoutDetails: e.target.value })} placeholder="For example, a PayPal contact address or bank-transfer instructions" /></div><Button onClick={onSave} disabled={saving || !destination.payoutDetails.trim()}>{saving ? "Saving…" : "Save payout destination"}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Request a payout</CardTitle><CardDescription>Requests reserve your full available balance in the selected currency. BrightBoard reviews and transfers manually.</CardDescription></CardHeader><CardContent className="flex flex-wrap items-end gap-3"><div className="w-full max-w-xs"><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue placeholder="Choose a balance currency" /></SelectTrigger><SelectContent>{data.balances.map(b => <SelectItem key={b.currency} value={b.currency}>{b.currency} · available {money(b.available, b.currency)} · minimum {policy.minimumByCurrency[b.currency] === undefined ? "not configured" : money(policy.minimumByCurrency[b.currency], b.currency)}</SelectItem>)}</SelectContent></Select></div><Button disabled={!payoutEligible || requesting} onClick={() => onRequest(currency)}>{requesting ? "Requesting…" : "Request available balance"}</Button>{currency && !payoutEligible && <p className="w-full text-xs text-muted-foreground">{minimum === undefined ? "A payout minimum has not been configured for this currency." : `A payout request requires at least ${money(minimum, currency)} available.`}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Referral activity</CardTitle><CardDescription>Referral records do not disclose customer identity.</CardDescription></CardHeader><CardContent><TableEmpty rows={data.referrals} empty="No referral signups recorded." headers={["Joined"]} render={(r: Workspace["referrals"][number]) => <tr key={r.id} className="border-t"><td>{date(r.joinedAt)}</td></tr>} /></CardContent></Card>
    </>}
    <Card><CardHeader><CardTitle>Application activity</CardTitle></CardHeader><CardContent>{data.activity.length ? <ul className="space-y-3">{data.activity.map(item => <li key={item.id} className="border-l-2 border-primary/30 pl-3 text-sm"><div className="font-medium">{item.action}</div>{item.note && <p className="text-muted-foreground">{item.note}</p>}<time className="text-xs text-muted-foreground">{date(item.createdAt)}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}</CardContent></Card>
    <button className="text-sm text-muted-foreground underline" onClick={retry}>Refresh workspace</button>
  </div>;
}
function TableEmpty<T>({ rows, empty, headers, render }: { rows: T[]; empty: string; headers: string[]; render: (row: T) => React.ReactNode }) {
  if (!rows.length) return <p className="rounded-lg bg-muted/40 p-5 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr>{headers.map(h => <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(render)}</tbody></table></div>;
}

export function ReferralOwner() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [policy, setPolicy] = useState<Policy>(policyDefault);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [notificationConfirm, setNotificationConfirm] = useState<string | null>(null);
  const listQuery = useQuery<OwnerList>({ queryKey: ["/api/referrals/owner", q, status, page], queryFn: () => jsonRequest(`/api/referrals/owner?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status === "all" ? "" : status)}&page=${page}`), retry: false });
  const detailQuery = useQuery<OwnerDetail>({ queryKey: ["/api/referrals/owner", selected], queryFn: () => jsonRequest(`/api/referrals/owner/${encodeURIComponent(selected!)}`), enabled: !!selected, retry: false });
  if (listQuery.data && !policyLoaded) { setPolicy(listQuery.data.policy); setPolicyLoaded(true); }
  const invalidate = [["/api/referrals/owner"], ["/api/referrals/owner", selected]];
  const updatePartner = useReferralMutation(({ id, body }: { id: string; body: Record<string, unknown> }) => apiRequest("PATCH", `/api/referrals/owner/${id}`, body), invalidate);
  const commission = useReferralMutation(({ id, action, note }: { id: string; action: string; note: string }) => apiRequest("POST", `/api/referrals/owner/commissions/${id}`, { action, note }), invalidate);
  const payout = useReferralMutation(({ id, body }: { id: string; body: Record<string, unknown> }) => apiRequest("POST", `/api/referrals/owner/payouts/${id}`, body), invalidate);
  const savePolicy = useReferralMutation((body: Policy & { confirmed: true }) => apiRequest("PATCH", "/api/referrals/owner/policy", body), [["/api/referrals/owner"], ["/api/referrals/policy"], ["/api/referrals/me"]]);
  const reconcile = useReferralMutation((body: { affiliateId?: string }) => apiRequest("POST", "/api/referrals/owner/reconcile", body), invalidate);
  const retryNotification = useReferralMutation(({ id, acknowledgeDuplicateRisk }: { id: string; acknowledgeDuplicateRisk?: true }) => apiRequest("POST", `/api/referrals/owner/notifications/${id}/retry`, { acknowledgeDuplicateRisk }), [["/api/referrals/owner/notifications"]]);
  const notifications = useQuery<{ notifications: Notification[] }>({ queryKey: ["/api/referrals/owner/notifications"], queryFn: () => jsonRequest("/api/referrals/owner/notifications"), retry: false });
  const activePartner = detailQuery.data?.affiliate;
  const changeStatus = (next: string) => activePartner && updatePartner.mutate({ id: activePartner.id, body: { status: next, note: note.trim() || undefined, rejectedReason: next === "rejected" ? reason.trim() || undefined : undefined } }, { onSuccess: () => { setNote(""); setReason(""); } });
  const exportCsv = (affiliateId?: string) => { const anchor = document.createElement("a"); anchor.href = `/api/referrals/owner/export${affiliateId ? `?affiliateId=${encodeURIComponent(affiliateId)}` : ""}`; anchor.download = "brightboard-referrals.csv"; anchor.rel = "noreferrer"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); };
  const partners = listQuery.data?.affiliates || [];
  const pagination = listQuery.data?.pagination;
  const counts = listQuery.data?.counts || {};
  const firstVisible = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const lastVisible = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : 0;
  return <div className="space-y-5">
    {listQuery.isError ? <ErrorBox error={listQuery.error as Error} retry={() => listQuery.refetch()} /> : <>
      <Card><CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>Referral partner review</CardTitle><CardDescription>Private applications, commission ledger and manually settled payouts.</CardDescription></div><Button variant="outline" onClick={() => exportCsv()}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">{["pending", "approved", "rejected", "suspended"].map(s => <Badge key={s} variant={statusTone(s) as any}>{counts[s] || 0} {s}</Badge>)}</div>
        <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search referral partners" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email or referral code" /></div><Select value={status} onValueChange={value => { setStatus(value); setPage(1); }}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["pending", "approved", "rejected", "suspended"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{pagination ? `Showing ${firstVisible}–${lastVisible} of ${pagination.total} partners` : "Loading partner count…"}</span>{pagination && pagination.totalPages > 1 && <nav className="flex items-center gap-2" aria-label="Partner list pagination"><Button size="sm" variant="outline" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</Button><span aria-live="polite">Page {pagination.page} of {pagination.totalPages}</span><Button size="sm" variant="outline" disabled={page >= pagination.totalPages || listQuery.isFetching} onClick={() => setPage(current => Math.min(pagination.totalPages, current + 1))}>Next</Button></nav>}</div>
        {listQuery.isLoading ? <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : !partners.length ? <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-semibold">No partners match this view</p><p className="mt-1 text-sm text-muted-foreground">Try another status or search term.</p></div> : <ul className="divide-y rounded-xl border">{partners.map(a => <li key={a.id}><button className={`flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === a.id ? "bg-primary/[.06]" : ""}`} onClick={() => setSelected(a.id)} aria-label={`Open ${a.name}, ${a.status}`}><span><b className="block">{a.name}</b><span className="text-sm text-muted-foreground">{a.email} · applied {date(a.createdAt)}</span></span><span className="flex items-center gap-3"><Badge variant={statusTone(a.status) as any}>{a.status}</Badge><span className="text-xs text-muted-foreground">{a.totalReferrals} referrals</span></span></button></li>)}</ul>}
      </CardContent></Card>
      {selected && <OwnerDetailPanel key={selected} detail={detailQuery.data} isLoading={detailQuery.isLoading} error={detailQuery.error as Error | null} retry={() => detailQuery.refetch()} onClose={() => setSelected(null)} note={note} setNote={setNote} reason={reason} setReason={setReason} changeStatus={changeStatus} updating={updatePartner.isPending} commission={(id, action) => commission.mutate({ id, action, note: note.trim() })} payout={(id, body) => payout.mutate({ id, body })} exportCsv={exportCsv} />}
      <div className="grid gap-5 lg:grid-cols-2">
        <PolicyEditor key={policyLoaded ? `loaded-${JSON.stringify(listQuery.data?.policy.minimumByCurrency)}` : "loading"} policy={policy} setPolicy={setPolicy} onSave={() => savePolicy.mutate({ ...policy, attributionDays: 90, confirmed: true })} saving={savePolicy.isPending} />
        <Card><CardHeader><CardTitle>Reconcile eligible payments</CardTitle><CardDescription>Only completed payments eligible after policy activation are considered. This does not create historical pre-policy debt.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" disabled={reconcile.isPending} onClick={() => reconcile.mutate({})}><RefreshCw className="mr-2 h-4 w-4" />Reconcile all partners</Button>{selected && <Button variant="outline" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ affiliateId: selected })}>Selected partner only</Button>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Notification delivery history</CardTitle><CardDescription>Delivery is not guaranteed. Unknown results require explicit duplicate-risk acknowledgement before retry.</CardDescription></CardHeader><CardContent>
        {notifications.isError ? <ErrorBox error={notifications.error as Error} retry={() => notifications.refetch()} /> : notifications.isLoading ? <Skeleton className="h-24 w-full" /> : !notifications.data?.notifications.length ? <p className="rounded-lg bg-muted/40 p-5 text-center text-sm text-muted-foreground">No delivery attempts recorded.</p> :
        <div className="space-y-3">{notifications.data.notifications.map(n => <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><p className="truncate font-medium">{n.subject}</p><p className="text-xs text-muted-foreground">{n.eventKey} · {date(n.createdAt)} · {n.attempts} attempt(s)</p>{n.lastError && <p className="mt-1 text-xs text-destructive">{n.lastError}</p>}</div><div className="flex items-center gap-2"><Badge variant={statusTone(n.status) as any}>{n.status}</Badge>{(n.status === "failed" || n.status === "unknown") && <Button size="sm" variant="outline" onClick={() => n.status === "unknown" ? setNotificationConfirm(n.id) : retryNotification.mutate({ id: n.id })} disabled={retryNotification.isPending}>Retry</Button>}</div></div>)}</div>}
        {notificationConfirm && <div role="alertdialog" aria-modal="true" className="mt-4 rounded-xl border border-amber-400 bg-amber-50 p-4"><p className="font-semibold">Possible duplicate delivery</p><p className="mt-1 text-sm">The previous attempt has an unknown result. Retrying may send the same message twice.</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => { retryNotification.mutate({ id: notificationConfirm, acknowledgeDuplicateRisk: true }); setNotificationConfirm(null); }}>Acknowledge risk and retry</Button><Button size="sm" variant="outline" onClick={() => setNotificationConfirm(null)}>Cancel</Button></div></div>}
      </CardContent></Card>
    </>}
  </div>;
}
function OwnerDetailPanel({ detail, isLoading, error, retry, onClose, note, setNote, reason, setReason, changeStatus, updating, commission, payout, exportCsv }: { detail?: OwnerDetail; isLoading: boolean; error: Error | null; retry: () => void; onClose: () => void; note: string; setNote: (s: string) => void; reason: string; setReason: (s: string) => void; changeStatus: (s: string) => void; updating: boolean; commission: (id: string, action: string) => void; payout: (id: string, body: Record<string, unknown>) => void; exportCsv: (id: string) => void }) {
  if (isLoading) return <Card><CardContent className="space-y-3 p-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-28 w-full" /></CardContent></Card>;
  if (error || !detail?.affiliate) return <Card><CardContent className="p-5"><ErrorBox error={error || new Error("Partner details unavailable")} retry={retry} /></CardContent></Card>;
  const a = detail.affiliate;
  return <Card><CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>{a.name}</CardTitle><CardDescription>{a.email} · applied {date(a.createdAt)} · terms accepted {date(a.termsAcceptedAt)}</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => exportCsv(a.id)}><Download className="mr-2 h-4 w-4" />Statement CSV</Button><Button variant="ghost" size="sm" onClick={onClose}>Close</Button></div></CardHeader><CardContent className="space-y-5">
    <div className="flex flex-wrap gap-2"><Badge variant={statusTone(a.status) as any}>{a.status}</Badge><Badge variant="outline">{a.totalReferrals} referrals</Badge><Badge variant="outline">Legacy total {money(a.totalEarnings, "USD")} (not a ledger balance)</Badge></div>
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Link visits", value: detail.stats?.linkVisits ?? 0 },
          { label: "Signups", value: detail.stats?.signups ?? 0 },
          { label: "Commissioned payments", value: detail.stats?.completedPaymentCount ?? 0 },
        ].map(item => <div key={item.label} className="rounded-xl border bg-muted/30 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{item.value.toLocaleString()}</p></div>)}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Link visits are raw valid referral-link requests, not unique visitors.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 text-sm"><p><b>Website:</b> {a.website || "—"}</p><p><b>Social:</b> {a.socialMedia || "—"}</p><p><b>Audience:</b> {a.audience || "—"}</p><p><b>Reason:</b> {a.reason}</p><p><b>Payout method:</b> {a.payoutMethod || "—"}</p><p><b>Payout instructions:</b> {a.payoutDetails || "—"}</p><p><b>Referral code:</b> <code>{a.referralCode || "—"}</code></p></div>
    <div className="rounded-xl border p-4"><p className="mb-3 font-semibold">Review action</p><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="owner-reason">Rejection reason (when rejecting)</Label><Input id="owner-reason" value={reason} onChange={e => setReason(e.target.value)} /></div><div><Label htmlFor="owner-note">Internal review note (optional)</Label><Input id="owner-note" value={note} onChange={e => setNote(e.target.value)} /></div></div><div className="mt-3 flex flex-wrap gap-2">{["approved", "rejected", "suspended", "pending"].map(s => <Button key={s} size="sm" variant={s === "rejected" ? "destructive" : "outline"} disabled={updating || (s === "rejected" && !reason.trim())} onClick={() => changeStatus(s)}>{s === "pending" ? "Reopen review" : s[0].toUpperCase() + s.slice(1)}</Button>)}</div></div>
    <div><h3 className="mb-2 font-semibold">Balances by currency</h3><div className="flex flex-wrap gap-2">{detail.balances.map(b => <Badge key={b.currency} variant="outline">{b.currency}: available {money(b.available,b.currency)} · held {money(b.held,b.currency)} · reserved {money(b.reserved,b.currency)} · paid {money(b.paid,b.currency)} · reversed {money(b.reversed,b.currency)}</Badge>)}</div></div>
    <ReferralPaymentReview affiliateId={a.id} founder adjustments={detail.adjustments} commissions={detail.commissions} />
    <div><h3 className="mb-2 font-semibold">Commission ledger</h3><p className="mb-2 text-sm text-muted-foreground">For partial refunds or disputes, flag for review and enter the provider evidence reference in the required note. Release only after resolving the review; reverse only a fully ineligible unpaid commission.</p><TableEmpty rows={detail.commissions} empty="No commission entries." headers={["Date", "Order", "Amount", "Status", "Actions"]} render={(c: Commission) => <tr key={c.id} className="border-t"><td>{date(c.createdAt)}</td><td className="font-mono text-xs">{c.orderId}</td><td>{money(c.amount,c.currency)}</td><td><Badge variant={statusTone(c.status) as any}>{c.status}</Badge>{c.note && <span className="block max-w-40 truncate text-xs text-muted-foreground">{c.note}</span>}</td><td className="space-x-1">{["held", "review"].includes(c.status) && !c.payoutId && <Button size="sm" variant="outline" onClick={() => commission(c.id, "release")}>Resolve and release</Button>}{c.status !== "reversed" && c.status !== "paid" && !c.payoutId && <Button size="sm" variant="destructive" onClick={() => commission(c.id, "reverse")}>Reverse</Button>}{c.status !== "reversed" && <Button size="sm" variant="outline" onClick={() => commission(c.id, "flag")}>Flag refund/dispute</Button>}</td></tr>} /></div>
    <div><h3 className="mb-2 font-semibold">Payout queue</h3><TableEmpty rows={detail.payouts} empty="No payout requests." headers={["Date", "Amount", "Status", "Reference", "Actions"]} render={(p: Payout) => <PayoutRow key={p.id} payout={p} onUpdate={(body) => payout(p.id, body)} />}/></div>
    <div><h3 className="mb-2 font-semibold">Referred users · founder-only</h3><TableEmpty rows={detail.referrals} empty="No referred signups." headers={["Name", "Email", "Joined"]} render={(r: OwnerDetail["referrals"][number]) => <tr key={r.id} className="border-t"><td>{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td><td>{r.email || "—"}</td><td>{date(r.joinedAt)}</td></tr>} /></div>
    <div><h3 className="mb-2 font-semibold">Review history</h3>{detail.activity.length ? <ul className="space-y-2">{detail.activity.map(x => <li key={x.id} className="border-l-2 border-primary/30 pl-3 text-sm"><b>{x.action}</b>{x.note && <p className="text-muted-foreground">{x.note}</p>}<time className="text-xs text-muted-foreground">{date(x.createdAt)}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">No history yet.</p>}</div>
  </CardContent></Card>;
}
function PayoutRow({ payout, onUpdate }: { payout: Payout; onUpdate: (body: Record<string, unknown>) => void }) {
  const [ref, setRef] = useState(payout.reference || "");
  const [note, setNote] = useState("");
  const canReview = payout.status === "requested";
  const blocked = payout.status === "blocked";
  const canMarkPaid = payout.status === "approved";
  return <tr className="border-t"><td>{date(payout.createdAt)}</td><td>{money(payout.amount,payout.currency)}</td><td><Badge variant={statusTone(payout.status) as any}>{payout.status}</Badge><span className="block text-xs">{payout.method}: {payout.details}</span>{blocked && <span className="block text-xs">Reject to release unaffected earnings for a new request.</span>}</td><td><Input aria-label="Payout transfer reference" className="h-8 w-36" value={ref} onChange={e => setRef(e.target.value)} placeholder="Transfer reference" /></td><td>{(canReview || canMarkPaid || blocked) && <div className="flex flex-wrap gap-1">{canReview && <Button size="sm" variant="outline" onClick={() => onUpdate({ status: "approved", reference: ref, note })}>Approve</Button>}{canMarkPaid && <Button size="sm" onClick={() => onUpdate({ status: "paid", reference: ref, note })} disabled={!ref.trim()}>Mark paid</Button>}<Button size="sm" variant="destructive" onClick={() => onUpdate({ status: "rejected", note })}>{blocked ? "Reject blocked payout" : "Reject"}</Button></div>}<Input aria-label="Payout note" className="mt-1 h-8 w-36" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" /></td></tr>;
}
function PolicyEditor({ policy, setPolicy, onSave, saving }: { policy: Policy; setPolicy: (p: Policy) => void; onSave: () => void; saving: boolean }) {
  const [thresholds, setThresholds] = useState(Object.entries(policy.minimumByCurrency).map(([currency, cents]) => `${currency}=${cents}`).join("\n"));
  const update = (key: keyof Policy, value: any) => setPolicy({ ...policy, [key]: value });
  return <Card><CardHeader><CardTitle>Program policy</CardTitle><CardDescription>Draft starts inactive. Explicit confirmation is required to publish financial terms.</CardDescription></CardHeader><CardContent className="space-y-3">
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={policy.active} onCheckedChange={v => update("active", v === true)} />Program active</label>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Commission model</Label><Select value={policy.mode} onValueChange={v => update("mode", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed by plan</SelectItem></SelectContent></Select></div><div><Label>Attribution window</Label><Input readOnly value="90 days" aria-label="Fixed attribution window, 90 days" /></div><div><Label>Percentage</Label><Input type="number" min="0" max="100" step="0.1" value={policy.percent} disabled={policy.mode !== "percentage"} onChange={e => update("percent", Number(e.target.value))} /></div><div><Label>Hold days</Label><Input type="number" min="0" value={policy.holdDays} onChange={e => update("holdDays", Number(e.target.value))} /></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Fixed-rate currency</Label><Input value={policy.fixedCurrency} onChange={e => update("fixedCurrency", e.target.value.toUpperCase())} /></div><div className="grid grid-cols-3 gap-2">{(["weekly", "monthly", "institution"] as const).map(k => <div key={k}><Label className="capitalize">{k} cents</Label><Input type="number" min="0" value={policy.fixedRates[k]} onChange={e => update("fixedRates", { ...policy.fixedRates, [k]: Number(e.target.value) })} /></div>)}</div></div>
    <div><Label htmlFor="policy-minimums">Minimum payout thresholds · one CURRENCY=cents per line</Label><Textarea id="policy-minimums" value={thresholds} onChange={e => { setThresholds(e.target.value); const entries = e.target.value.split(/\n/).map(x => x.trim()).filter(Boolean).map(line => line.split("=")); const next: Record<string, number> = {}; entries.forEach(([c, n]) => { if (c && /^\d+$/.test(n || "")) next[c.toUpperCase()] = Number(n); }); update("minimumByCurrency", next); }} rows={3} /></div>
    <p className="text-xs text-muted-foreground">Amounts in fixed rates and thresholds are integer minor units (cents for USD). Saving explicitly confirms the current policy and activation date.</p>
    <Button disabled={saving} onClick={onSave}>{saving ? "Saving…" : "Confirm and save policy"}</Button>
  </CardContent></Card>;
}
