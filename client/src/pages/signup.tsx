import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiFacebook, SiTiktok } from "react-icons/si";

const RECAPTCHA_SITE_KEY = "6LfKupcsAAAAAFjtAAYI191p9gV13VpHkenZ-KJe";

async function getRecaptchaToken(action: string): Promise<string | undefined> {
  try {
    await new Promise<void>((resolve) => (window as any).grecaptcha.enterprise.ready(resolve));
    return await (window as any).grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
  } catch {
    return undefined;
  }
}

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { signup, isSigningUp, verifyEmail, isVerifying, resendCode, isResendingCode, isAuthenticated } = useAuth();
  const { data: socialProviders } = useQuery<{ facebook: boolean; tiktok: boolean }>({
    queryKey: ["/api/auth/social-providers"],
  });
  const { toast } = useToast();

  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    try {
      const recaptchaToken = await getRecaptchaToken("signup");
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref") || undefined;
      const redirect = urlParams.get("redirect") || "/";
      await signup({ email, password, firstName, lastName, recaptchaToken, ref });
      localStorage.setItem("pendingVerificationEmail", email);
      toast({ title: "Account created!", description: "Enter the 6-digit code we sent to your email." });
      setLocation(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message || "Please try again", variant: "destructive" });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyEmail({ email, code: verificationCode });
      toast({ title: "Email verified!", description: "You can now sign in" });
      setLocation("/login");
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message || "Please check your code", variant: "destructive" });
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ email });
      toast({ title: "Code sent", description: "Check your email for a new code" });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message || "Please try again", variant: "destructive" });
    }
  };

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-teal-500 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
              Verify Your Email
            </CardTitle>
            <CardDescription>We sent a 6-digit code to <strong>{email}</strong></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input id="code" type="text" placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest" maxLength={6}
                  data-testid="input-verification-code" />
              </div>
              <Button type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600"
                disabled={isVerifying || verificationCode.length !== 6} data-testid="button-verify">
                {isVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify Email"}
              </Button>
              <div className="text-center">
                <Button type="button" variant="ghost" onClick={handleResend} disabled={isResendingCode} data-testid="button-resend-code">
                  {isResendingCode ? "Sending..." : "Didn't receive code? Resend"}
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("signup")} data-testid="button-back-to-signup">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Sign Up
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            BrightBoard
          </CardTitle>
          <CardDescription>Create your account to start creating amazing content</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" type="text" placeholder="Jane"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  required data-testid="input-first-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" type="text" placeholder="Teacher"
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                  required data-testid="input-last-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="jane@school.edu"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required data-testid="input-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} data-testid="input-password" />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirm your password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required data-testid="input-confirm-password" />
            </div>

            <Button type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600"
              disabled={isSigningUp} data-testid="button-signup">
              {isSigningUp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account...</> : "Create Account"}
            </Button>

            {(socialProviders?.facebook || socialProviders?.tiktok) && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {socialProviders?.facebook && (
                    <a href="/api/auth/facebook" data-testid="button-signup-facebook">
                      <Button type="button" variant="outline" className="w-full flex items-center gap-2 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors">
                        <SiFacebook className="w-4 h-4" />Sign up with Facebook
                      </Button>
                    </a>
                  )}
                  {socialProviders?.tiktok && (
                    <a href="/api/auth/tiktok" data-testid="button-signup-tiktok">
                      <Button type="button" variant="outline" className="w-full flex items-center gap-2 border-black text-black dark:border-white dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                        <SiTiktok className="w-4 h-4" />Sign up with TikTok
                      </Button>
                    </a>
                  )}
                </div>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" className="text-primary underline hover:text-primary/80"
                onClick={() => setLocation("/login")} data-testid="link-login">
                Sign In
              </button>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <a href="/terms" className="underline">Terms of Service</a> and{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
