import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

export default function Refund() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Refund Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: January 24, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
              <p className="text-muted-foreground">
                At BrightBoard, we want you to be completely satisfied with your subscription. This Refund 
                Policy outlines our guidelines for refunds and cancellations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Free Trial</h2>
              <p className="text-muted-foreground">
                We offer a free tier with limited features so you can try BrightBoard before subscribing. 
                We encourage you to use the free tier to ensure BrightBoard meets your needs before upgrading.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Subscription Refunds</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">7-Day Money-Back Guarantee</h3>
              <p className="text-muted-foreground">
                If you are not satisfied with your subscription, you may request a full refund within 
                <strong> 7 days</strong> of your initial purchase. This applies to first-time subscribers only.
              </p>

              <h3 className="text-lg font-medium mt-4 mb-2">After 7 Days</h3>
              <p className="text-muted-foreground">
                After the 7-day period, we generally do not offer refunds. However, we may consider refund 
                requests on a case-by-case basis for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Technical issues that prevented you from using the service</li>
                <li>Accidental duplicate purchases</li>
                <li>Billing errors</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Cancellation Policy</h2>
              <p className="text-muted-foreground">
                You may cancel your subscription at any time. Upon cancellation:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>You will retain access to premium features until the end of your current billing period</li>
                <li>Your subscription will not automatically renew</li>
                <li>No partial refunds are given for unused time within a billing period</li>
                <li>Your account will revert to the free tier after the paid period ends</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. How to Request a Refund</h2>
              <p className="text-muted-foreground">
                To request a refund, please contact us at: support@brightboardapp.com
              </p>
              <p className="text-muted-foreground mt-2">
                Include the following information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Your account email address</li>
                <li>Date of purchase</li>
                <li>Reason for refund request</li>
                <li>Order/transaction ID (if available)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Refund Processing</h2>
              <p className="text-muted-foreground">
                Approved refunds will be processed within 5-10 business days. The refund will be issued 
                to the original payment method. Please note that your bank or payment provider may take 
                additional time to reflect the refund in your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Subscription Tiers</h2>
              <div className="bg-muted/50 rounded-lg p-4 mt-2">
                <ul className="space-y-2 text-muted-foreground">
                  <li><strong>Weekly Plan ($4.99/week):</strong> 7-day money-back guarantee on first subscription</li>
                  <li><strong>Monthly Plan ($14.99/month):</strong> 7-day money-back guarantee on first subscription</li>
                  <li><strong>Yearly Plan ($99.99/year):</strong> 7-day money-back guarantee on first subscription</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Exceptions</h2>
              <p className="text-muted-foreground">
                Refunds will not be granted in cases of:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Violation of our Terms of Service</li>
                <li>Account suspension due to abuse</li>
                <li>Requests made after the eligible refund period</li>
                <li>Promotional or discounted subscriptions (unless otherwise stated)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about our Refund Policy, please contact us at: support@brightboardapp.com
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
