import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Adjustment = { id: string; currency: string; exposure: number; status: string; recoveredAmount?: number; commissionReference?: string };
type CheckedCommission = { id: string; status: string; providerState?: string; providerCheckedAt?: string };

export function ReferralPaymentReview({ affiliateId, founder = false, adjustments = [], commissions = [] }: {
  affiliateId: string; founder?: boolean; adjustments?: Adjustment[]; commissions?: CheckedCommission[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const check = useMutation({
    mutationFn: () => apiRequest("POST", founder ? `/api/referrals/owner/${affiliateId}/check-payments` : "/api/referrals/me/check-payments"),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["/api/referrals/owner"] }), qc.invalidateQueries({ queryKey: ["/api/referrals/me"] })]);
      toast({ title: "Payment checks complete", description: "Review any held commissions or blocked payouts below." });
    },
    onError: (e: Error) => toast({ title: "Could not check payments", description: e.message, variant: "destructive" }),
  });
  return <section className="space-y-3 rounded-xl border p-4">
    <h3 className="font-semibold">Payment safety and recovery reviews</h3>
    <p className="text-sm text-muted-foreground">Commissions need a provider check before clearing or payout approval. Reversals and uncertain results require review. A blocked payout must be rejected before unaffected earnings can be requested again.</p>
    <Button variant="outline" onClick={() => check.mutate()} disabled={check.isPending}>{check.isPending ? "Checking payments…" : "Check provider payments"}</Button>
    {founder && <ul className="space-y-1 text-xs">{commissions.map(c => <li key={c.id}>Commission {c.id.slice(0, 8)} · {c.providerState || "not checked"} · {c.providerCheckedAt ? new Date(c.providerCheckedAt).toLocaleString() : "No provider verification yet"}</li>)}</ul>}
    <p className="text-sm text-muted-foreground">Paid commissions remain unchanged. The amounts below are maximum exposures for review, not automatic debts or deductions. Partial refunds and disputes need separate provider evidence.</p>
    {!adjustments.length ? <p className="text-sm">No paid-commission recovery reviews.</p> : adjustments.map(a => <div className="rounded-lg border p-3 text-sm" key={a.id}>
      <p className="font-medium">{a.commissionReference || "Paid referral commission"}</p>
      <p>Maximum exposure: {a.currency} {(a.exposure / 100).toFixed(2)} · {a.status}</p>
      {a.status === "recovered" && <p>Recovered separately: {a.currency} {((a.recoveredAmount || 0) / 100).toFixed(2)}. Remaining exposure closed without deduction.</p>}
      {founder && a.status === "review" && <RecoveryAction adjustment={a} />}
    </div>)}
  </section>;
}

function RecoveryAction({ adjustment }: { adjustment: Adjustment }) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const resolve = useMutation({
    mutationFn: (status: "recovered" | "waived") => apiRequest("POST", `/api/referrals/owner/adjustments/${adjustment.id}`, {
      status, amount: status === "recovered" ? Math.round(Number(amount) * 100) : undefined, reference, note,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/referrals/owner"] }),
    onError: (e: Error) => toast({ title: "Recovery not saved", description: e.message, variant: "destructive" }),
  });
  return <div className="mt-3 space-y-2">
    <Input aria-label="Separately recovered amount" type="number" min="0.01" max={adjustment.exposure / 100} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Separately recovered amount in ${adjustment.currency}`} />
    <Input aria-label="Recovery evidence reference" value={reference} onChange={e => setReference(e.target.value)} placeholder="Provider evidence / actual separate transfer reference" />
    <Input aria-label="Private recovery resolution note" value={note} onChange={e => setNote(e.target.value)} placeholder="Private evidence and resolution note (required)" />
    <p className="text-xs text-muted-foreground">Record only money already recovered separately. Closing a partial recovery waives the rest; no other earnings will be reduced.</p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={resolve.isPending || reference.trim().length < 3 || note.trim().length < 3 || !(Number(amount) > 0) || Number(amount) * 100 > adjustment.exposure} onClick={() => resolve.mutate("recovered")}>Record separate recovery</Button>
      <Button size="sm" variant="outline" disabled={resolve.isPending || reference.trim().length < 3 || note.trim().length < 3} onClick={() => resolve.mutate("waived")}>Close without recovery</Button>
    </div>
  </div>;
}
