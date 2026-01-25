import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Users, TrendingUp, Gift, Mail } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

export default function Affiliate() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-4xl mx-auto px-4 py-8 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Affiliate Program
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn money by sharing BrightBoard with fellow educators. Help teachers save time while earning passive income.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">30% Commission</h3>
              <p className="text-sm text-muted-foreground">
                Earn 30% recurring commission on every subscription you refer
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Recurring Revenue</h3>
              <p className="text-sm text-muted-foreground">
                Get paid every month as long as your referrals stay subscribed
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Easy Payouts</h3>
              <p className="text-sm text-muted-foreground">
                Monthly payouts via PayPal or bank transfer, minimum $50
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Apply to Join</h4>
                <p className="text-muted-foreground">
                  Fill out our simple application form. We review applications within 24-48 hours.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Get Your Unique Link</h4>
                <p className="text-muted-foreground">
                  Once approved, you'll receive a unique referral link and access to our affiliate dashboard.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Share with Educators</h4>
                <p className="text-muted-foreground">
                  Share your link on social media, in teacher communities, blogs, or directly with colleagues.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">4</span>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Earn Commissions</h4>
                <p className="text-muted-foreground">
                  When teachers sign up through your link and subscribe, you earn 30% of their subscription fee.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Commission Structure</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>30% commission on all subscription payments</li>
                  <li>Recurring commissions for subscription renewals</li>
                  <li>90-day cookie duration</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Terms</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Monthly payouts on the 15th</li>
                  <li>Minimum payout: $50</li>
                  <li>PayPal or bank transfer available</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Who Can Join?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Our affiliate program is perfect for:
            </p>
            <ul className="grid md:grid-cols-2 gap-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Teachers and educators
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Education bloggers
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Teacher influencers
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Education YouTubers
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Curriculum developers
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Education consultants
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-teal-500/10 border-primary/20">
          <CardContent className="pt-6 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Start Earning?</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join hundreds of educators who are already earning passive income by sharing BrightBoard with their community.
            </p>
            <a href="mailto:affiliates@brightboardapp.com?subject=Affiliate Program Application">
              <Button size="lg" data-testid="button-apply-affiliate">
                <Mail className="w-4 h-4 mr-2" />
                Apply Now
              </Button>
            </a>
            <p className="text-sm text-muted-foreground mt-4">
              Questions? Email us at{" "}
              <a href="mailto:affiliates@brightboardapp.com" className="text-primary hover:underline">
                affiliates@brightboardapp.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
