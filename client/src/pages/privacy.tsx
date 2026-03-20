import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

export default function Privacy() {
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
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: February 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                BrightBoard ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our 
                AI-powered educational content creation platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <h3 className="text-lg font-medium mt-4 mb-2">Account Information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Name and email address</li>
                <li>Authentication credentials (managed securely through our auth provider)</li>
                <li>Profile information you choose to provide</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">Usage Information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Content generation requests and preferences</li>
                <li>Feature usage patterns</li>
                <li>Device and browser information</li>
                <li>IP address and general location (country level)</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">Payment Information</h3>
              <p className="text-muted-foreground">
                Payment processing is handled by Paddle. We do not store your credit card or banking 
                details directly. Please refer to Paddle's privacy policy for information on how they 
                handle payment data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use the collected information to:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Provide and maintain the Service</li>
                <li>Process your content generation requests</li>
                <li>Manage your account and subscriptions</li>
                <li>Send important service notifications</li>
                <li>Improve and personalize your experience</li>
                <li>Analyze usage patterns to enhance our features</li>
                <li>Prevent fraud and ensure security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information. We may share data with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Service Providers:</strong> Third-party services that help us operate (hosting, analytics, payment processing)</li>
                <li><strong>AI Providers:</strong> Content generation requests are processed by OpenAI's API</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal 
                information. However, no method of transmission over the Internet is 100% secure, and 
                we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your information for as long as your account is active or as needed to provide 
                services. Generated content is stored to allow you to access your history. You may request 
                deletion of your data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Export your data in a portable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                BrightBoard is designed for educators and is not intended for use by children under 13. 
                We do not knowingly collect personal information from children. If you believe a child 
                has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to maintain your session, remember preferences, 
                and analyze usage. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Advertising</h2>
              <p className="text-muted-foreground">
                We use Google AdSense to display advertisements on our website. Google AdSense uses cookies 
                to serve ads based on your prior visits to our website or other websites. You may opt out of 
                personalized advertising by visiting{" "}
                <a href="https://www.google.com/settings/ads" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                  Google's Ads Settings
                </a>.
              </p>
              <p className="text-muted-foreground mt-2">
                Third-party vendors, including Google, use cookies to serve ads based on your prior visits 
                to this website or other websites. Google's use of advertising cookies enables it and its 
                partners to serve ads based on your visit to our site and/or other sites on the Internet.
              </p>
              <p className="text-muted-foreground mt-2">
                For more information about how Google uses data when you use our site, visit:{" "}
                <a href="https://policies.google.com/technologies/partner-sites" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                  How Google uses data
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. We will notify you of significant changes 
                via email or through the Service. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground">
                For privacy-related questions or to exercise your rights, contact us at: privacy@brightboardapp.com
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
