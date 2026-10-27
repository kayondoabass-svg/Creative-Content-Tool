import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

type PaymentStatus =
  | "initializing"
  | "pending"
  | "completed"
  | "failed"
  | "reversed"
  | "creation_failed"
  | "creation_unknown";

interface PaymentDetails {
  orderId: string;
  status: PaymentStatus;
  tier: string;
  amount: number;
  currency: string;
  activated: boolean;
  checkoutUrl: string | null;
  receiptStatus: "queued" | "accepted" | "not_sent";
}

const POLL_LIMIT_MS = 3 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 1000;

function displayAmount(amount: number, currency: string) {
  try {
    const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
    // BrightBoard stores all existing payment amounts in hundredths, including UGX.
    return formatter.format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function statusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    initializing: "Preparing secure checkout",
    pending: "Awaiting confirmation",
    completed: "Payment confirmed",
    failed: "Payment not completed",
    reversed: "Payment reversed",
    creation_failed: "Checkout could not be created",
    creation_unknown: "Checkout status needs checking",
  };
  return labels[status];
}

export default function CheckoutPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const orderId = new URLSearchParams(window.location.search).get("order")?.trim() || "";
  const loginHref = `/login?redirect=${encodeURIComponent(orderId ? `/checkout?order=${encodeURIComponent(orderId)}` : "/checkout")}`;
  const startedAt = useRef(Date.now());
  const lastFocusCheckAt = useRef(0);
  const invalidatedForOrder = useRef<string | null>(null);
  const [pollingExpired, setPollingExpired] = useState(false);

  const paymentQuery = useQuery<PaymentDetails>({
    queryKey: ["/api/payments", orderId],
    enabled: Boolean(orderId) && isAuthenticated,
    queryFn: async () => {
      const response = await fetch(`/api/payments/${encodeURIComponent(orderId)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "We couldn't retrieve this payment yet.");
      }
      return response.json();
    },
    refetchInterval: (query) => {
      const payment = query.state.data as PaymentDetails | undefined;
      const stillChecking = !payment
        || payment.status === "initializing"
        || payment.status === "pending"
        || (payment.status === "completed" && !payment.activated);
      const remaining = POLL_LIMIT_MS - (Date.now() - startedAt.current);
      if (!stillChecking || remaining <= 0) return false;
      return Math.min(POLL_INTERVAL_MS, remaining);
    },
  });

  useEffect(() => {
    if (!orderId || !isAuthenticated || pollingExpired) return;
    const remaining = Math.max(0, POLL_LIMIT_MS - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => setPollingExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [orderId, isAuthenticated, pollingExpired]);

  useEffect(() => {
    if (!orderId || !isAuthenticated) return;
    const checkOnFocus = () => {
      const remaining = POLL_LIMIT_MS - (Date.now() - startedAt.current);
      const now = Date.now();
      if (remaining > 0 && now - lastFocusCheckAt.current > 1500) {
        lastFocusCheckAt.current = now;
        void paymentQuery.refetch();
      } else if (remaining <= 0) {
        setPollingExpired(true);
      }
    };
    window.addEventListener("focus", checkOnFocus);
    return () => window.removeEventListener("focus", checkOnFocus);
  }, [orderId, isAuthenticated, paymentQuery.refetch]);

  const payment = paymentQuery.data;
  useEffect(() => {
    if (payment?.activated && invalidatedForOrder.current !== payment.orderId) {
      invalidatedForOrder.current = payment.orderId;
      void queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, [payment?.activated, payment?.orderId, queryClient]);

  const checkoutIsTrusted = (() => {
    if (!payment?.checkoutUrl) return false;
    try {
      const url = new URL(payment.checkoutUrl);
      return url.origin === "https://pay.pesapal.com" && !url.username && !url.password &&
        url.pathname.startsWith("/pesapaliframe/");
    } catch {
      return false;
    }
  })();
  const terminalStatus = payment && ["failed", "reversed", "creation_failed", "creation_unknown"].includes(payment.status);
  const statusIcon = payment?.activated
    ? <CheckCircle2 className="h-5 w-5 text-emerald-700" />
    : terminalStatus
      ? <CircleAlert className="h-5 w-5 text-rose-700" />
      : <Clock3 className="h-5 w-5 text-amber-700" />;

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <a href="/pricing" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </a>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
          <section className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary p-2.5 shadow-sm">
                <img src="/brand-logo.png" alt="BrightBoard" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">BrightBoard checkout</p>
                <h1 className="bb-display text-2xl font-bold tracking-tight sm:text-3xl">A little more room to teach.</h1>
              </div>
            </div>

            {authLoading ? (
              <Card className="border-border/80">
                <CardContent className="space-y-5 p-6 sm:p-8">
                  <div className="h-5 w-44 animate-pulse rounded bg-muted" />
                  <div className="h-12 animate-pulse rounded-xl bg-muted" />
                  <div className="h-[50dvh] min-h-[300px] animate-pulse rounded-xl bg-muted" />
                </CardContent>
              </Card>
            ) : !isAuthenticated ? (
              <Card className="border-border/80">
                <CardContent className="p-7 sm:p-10">
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <p className="bb-eyebrow mb-2">Sign-in required</p>
                  <h2 className="bb-display text-2xl font-bold">Your order is ready to resume.</h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                    Sign in to securely view this payment and continue where you left off.
                  </p>
                  {orderId && <p className="mt-5 break-all rounded-lg bg-muted/70 px-3 py-2 font-mono text-xs">Order reference: {orderId}</p>}
                  <Button asChild className="mt-6">
                    <a href={loginHref}>Sign in to continue</a>
                  </Button>
                </CardContent>
              </Card>
            ) : !orderId ? (
              <Card className="border-border/80">
                <CardContent className="p-7 sm:p-10">
                  <CircleAlert className="mb-4 h-8 w-8 text-amber-700" />
                  <h2 className="bb-display text-2xl font-bold">We need an order reference.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Choose a plan to start a secure checkout, or return to your billing page.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild><a href="/pricing">View plans</a></Button>
                    <Button asChild variant="outline"><a href="/billing">Billing &amp; usage</a></Button>
                  </div>
                </CardContent>
              </Card>
            ) : paymentQuery.isLoading ? (
              <Card className="border-border/80">
                <CardContent className="space-y-5 p-6 sm:p-8">
                  <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-16 animate-pulse rounded-xl bg-muted" />
                  <div className="h-[55dvh] min-h-[360px] animate-pulse rounded-xl bg-muted" />
                </CardContent>
              </Card>
            ) : paymentQuery.isError ? (
              <Card className="border-border/80">
                <CardContent className="p-7 sm:p-10">
                  <CircleAlert className="mb-4 h-8 w-8 text-amber-700" />
                  <p className="bb-eyebrow mb-2">Payment lookup</p>
                  <h2 className="bb-display text-2xl font-bold">We couldn't load this order.</h2>
                  <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Order reference: {orderId}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{(paymentQuery.error as Error)?.message || "Please check your connection and try again."}</p>
                  <Button className="mt-6" onClick={() => void paymentQuery.refetch()} disabled={paymentQuery.isFetching}>
                    {paymentQuery.isFetching && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : payment ? (
              <Card className="overflow-hidden border-border/80 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-card px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                      {statusIcon}
                      <div>
                        <h2 className="font-semibold">{payment.activated ? "You’re all set" : statusLabel(payment.status)}</h2>
                        <p className="text-xs text-muted-foreground">
                          {payment.activated ? "Your subscription is active." : "Payment is verified by the provider before access is granted."}
                        </p>
                      </div>
                    </div>
                    {paymentQuery.isFetching && <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Checking payment" />}
                  </div>

                  {payment.activated ? (
                    <div className="p-6 sm:p-8">
                      <div className="mb-6 rounded-2xl border border-emerald-900/10 bg-emerald-50/80 p-5 dark:bg-emerald-950/30">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                          <div>
                            <h3 className="font-semibold text-emerald-950 dark:text-emerald-100">Premium access is active</h3>
                            <p className="mt-1 text-sm leading-6 text-emerald-900/80 dark:text-emerald-100/75">
                              Your payment confirmation has been received. You can head back to your teaching workspace.
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="mb-5 text-sm text-muted-foreground" role="status">
                        {payment.receiptStatus === "accepted"
                          ? "Your receipt was accepted for email delivery; this does not confirm it has reached your inbox."
                          : payment.receiptStatus === "queued"
                            ? "Your receipt is queued for processing."
                            : "A receipt email was not sent for this payment."}
                      </p>
                      <Button asChild className="w-full sm:w-auto"><a href="/">Start creating</a></Button>
                    </div>
                  ) : (
                    <>
                      {payment.status === "pending" && checkoutIsTrusted && (
                        <div className="bg-muted/25 p-3 sm:p-5">
                          <iframe
                            src={payment.checkoutUrl!}
                            title="Secure PesaPal payment checkout"
                            className="h-[64dvh] min-h-[520px] w-full rounded-xl border border-border bg-card sm:h-[70dvh]"
                            referrerPolicy="no-referrer"
                            allow="payment"
                          />
                        </div>
                      )}
                      <div className="px-5 py-5 sm:px-7">
                        {(payment.status === "initializing" || payment.status === "pending") && (
                          <p className="text-sm leading-6 text-muted-foreground">
                            Approve the payment in your bank or mobile-money app if prompted. You may need to return here after approval; this page will check the verified status automatically.
                          </p>
                        )}
                        {payment.status === "pending" && !checkoutIsTrusted && (
                          <p className="text-sm leading-6 text-muted-foreground">The secure payment panel is not available for this order. Check the payment status below or contact support.</p>
                        )}
                        {terminalStatus && (
                          <div className="rounded-xl border border-amber-900/15 bg-amber-50/70 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                            {payment.status === "failed" && "The provider reports that this payment was not completed. You can check again before starting another attempt."}
                            {payment.status === "reversed" && "The provider reports that this payment was reversed. BrightBoard access is not active for this order."}
                            {payment.status === "creation_failed" && "The provider checkout could not be created. Check this order's status before trying again."}
                            {payment.status === "creation_unknown" && "We could not confirm whether the provider checkout was created. Check this order before starting another payment."}
                          </div>
                        )}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs leading-5 text-muted-foreground">
                            Never enter your payment PIN or banking password on BrightBoard. Approval happens with your payment provider.
                          </p>
                          {(pollingExpired || terminalStatus) && (
                            <Button variant="outline" className="shrink-0" onClick={() => {
                              void paymentQuery.refetch();
                            }} disabled={paymentQuery.isFetching}>
                              {paymentQuery.isFetching ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Check payment status
                            </Button>
                          )}
                        </div>
                        {pollingExpired && !terminalStatus && (
                          <p className="mt-3 text-sm text-muted-foreground" role="status">
                            Automatic checks have paused after three minutes. You can check again whenever you’re ready.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <Card className="border-border/80">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <CreditCard className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[.14em]">Order summary</p>
                </div>
                {payment ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize">{payment.tier} plan</p>
                        <p className="mt-1 text-xs text-muted-foreground">BrightBoard subscription</p>
                      </div>
                      <p className="text-right font-semibold tabular-nums">{displayAmount(payment.amount, payment.currency)}</p>
                    </div>
                    <div className="my-4 border-t border-border/70" />
                  </>
                ) : (
                  <div className="mb-4 space-y-2">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  </div>
                )}
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Order reference</p>
                <p className="mt-1 break-all font-mono text-xs leading-5">{payment?.orderId || orderId || "—"}</p>
              </CardContent>
            </Card>
            <div className="rounded-2xl border border-border/70 bg-primary/[.045] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">
                  Payments are securely handled by PesaPal. Bank or mobile-money approval prompts may appear during checkout.
                </p>
              </div>
            </div>
            <a href="/billing" className="block text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Need help? Visit billing
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}
