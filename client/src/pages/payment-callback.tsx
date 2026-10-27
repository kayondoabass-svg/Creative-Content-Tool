import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCallbackPage() {
  const [, setLocation] = useLocation();
  const orderId = new URLSearchParams(window.location.search).get("order")?.trim();

  useEffect(() => {
    if (orderId) {
      setLocation(`/checkout?order=${encodeURIComponent(orderId)}`);
    }
  }, [orderId, setLocation]);

  if (orderId) {
    return (
      <div className="bb-page flex min-h-[70dvh] items-center justify-center py-12">
        <Card className="w-full max-w-md border-border/80">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
            <h1 className="bb-display text-2xl font-bold">Returning to your order</h1>
            <p className="mt-2 text-sm text-muted-foreground">We’re reopening the payment status page for this reference.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bb-page flex min-h-[70dvh] items-center justify-center py-12">
      <Card className="w-full max-w-md border-border/80">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="bb-eyebrow mb-2">BrightBoard billing</p>
          <h1 className="bb-display text-2xl font-bold">Check your billing page</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This return link doesn’t include an order reference. We can’t confirm payment from a redirect alone.
          </p>
          <Button asChild className="mt-6 w-full">
            <a href="/billing">Open billing <ArrowRight className="ml-2 h-4 w-4" /></a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
