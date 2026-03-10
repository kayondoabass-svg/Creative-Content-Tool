import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";

export default function PaymentCallbackPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardContent className="p-8 text-center">
          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-payment-success">Payment Successful!</h1>
              <p className="text-muted-foreground mb-6" data-testid="text-payment-success-desc">
                Your premium subscription is now active. You have access to all premium features including unlimited generations, HD/4K quality, and up to 20 slides per presentation.
              </p>
              <p className="text-sm text-muted-foreground mb-6">A receipt has been sent to your email address.</p>
              <Button asChild className="w-full" data-testid="button-start-creating">
                <a href="/">Start Creating</a>
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-payment-failed">Payment Failed</h1>
              <p className="text-muted-foreground mb-6" data-testid="text-payment-failed-desc">
                Your payment could not be processed. Please try again or use a different payment method.
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full" data-testid="button-try-again">
                  <a href="/pricing">Try Again</a>
                </Button>
                <Button variant="outline" asChild className="w-full" data-testid="button-go-home">
                  <a href="/">Go Home</a>
                </Button>
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-payment-pending">Payment Processing</h1>
              <p className="text-muted-foreground mb-6" data-testid="text-payment-pending-desc">
                Your payment is being processed. This may take a few moments. Your subscription will be activated once the payment is confirmed.
              </p>
              <Button asChild className="w-full" data-testid="button-go-home-pending">
                <a href="/">Go Home</a>
              </Button>
            </>
          )}

          {!status && (
            <>
              <h1 className="text-2xl font-bold mb-4">Payment</h1>
              <p className="text-muted-foreground mb-6">No payment information available.</p>
              <Button asChild className="w-full">
                <a href="/">Go Home</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
