import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CreditCard, Mail } from "lucide-react";
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
            <p className="text-muted-foreground">Last updated: February 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            
            <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">Important: No Refunds Policy</h3>
                  <p className="text-amber-700 dark:text-amber-300">
                    Due to the high costs of AI content generation, we unfortunately cannot offer refunds once 
                    content has been generated. AI compute costs are incurred immediately upon generation and 
                    cannot be recovered.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">1. Why We Cannot Offer Refunds</h2>
              <p className="text-muted-foreground">
                BrightBoard uses advanced AI technology (including OpenAI's GPT and image generation models) 
                to create educational content. Each time you generate content, we incur real costs for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>AI text generation (presentations, worksheets, activities)</li>
                <li>AI image generation (educational illustrations, storyboards)</li>
                <li>AI video processing (animated storyboards, MP4 exports)</li>
                <li>Server processing and storage</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                These costs are charged to us immediately when you generate content, regardless of whether 
                you use the final output. For this reason, <strong>all sales are final and non-refundable</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Free Tier Available</h2>
              <p className="text-muted-foreground">
                We offer a <strong>free tier with 5 generations per day</strong> so you can try BrightBoard 
                before subscribing. We strongly encourage you to use the free tier to ensure BrightBoard 
                meets your needs before upgrading to a paid plan.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Subscription Cancellation</h2>
              <p className="text-muted-foreground">
                You can cancel your subscription at any time. Upon cancellation:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Cancel at least 48 hours before your next billing date to avoid the next charge</li>
                <li>You will retain access to premium features until the end of your current billing period</li>
                <li>Your subscription will not automatically renew</li>
                <li>No partial refunds are given for unused time within a billing period</li>
                <li>Your account will revert to the free tier after the paid period ends</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. How to Cancel</h2>
              <p className="text-muted-foreground">
                To cancel your subscription:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Go to your Profile menu and click "Manage Subscription"</li>
                <li>Follow the instructions in the Paddle customer portal</li>
                <li>Or contact us at support@brightboardapp.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Exceptions</h2>
              <p className="text-muted-foreground">
                We may consider exceptions on a case-by-case basis only for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Technical issues on our end that prevented you from using the service entirely</li>
                <li>Accidental duplicate purchases (within 24 hours)</li>
                <li>Billing errors caused by our system</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                These exceptions are at our sole discretion and do not guarantee a refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Subscription Plans</h2>
              <div className="bg-muted/50 rounded-lg p-4 mt-2">
                <ul className="space-y-2 text-muted-foreground">
                  <li><strong>Weekly Plan ($4.99/week):</strong> Non-refundable, cancel anytime</li>
                  <li><strong>Monthly Plan ($14.99/month):</strong> Non-refundable, cancel anytime</li>
                  <li><strong>Yearly Plan ($99.99/year):</strong> Non-refundable, cancel anytime</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Merchant of Record</h2>
              <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-4">
                <CreditCard className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">
                  <strong>Paddle.com Market Limited</strong> is our Merchant of Record and handles all payment 
                  processing, invoicing, and subscription management. All purchases are subject to 
                  Paddle's Checkout Buyer Terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-muted-foreground">
                    If you have any questions about our Refund Policy or need assistance with cancellation, 
                    please contact us at:
                  </p>
                  <p className="text-primary font-medium mt-2">support@brightboardapp.com</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
