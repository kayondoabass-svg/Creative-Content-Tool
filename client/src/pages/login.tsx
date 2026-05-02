import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { useQuery } from "@tanstack/react-query";
import { SiFacebook, SiTiktok, SiGoogle } from "react-icons/si";

const RECAPTCHA_SITE_KEY = "6LfKupcsAAAAAFjtAAYI191p9gV13VpHkenZ-KJe";

async function getRecaptchaToken(action: string): Promise<string | undefined> {
  try {
    await new Promise<void>((resolve) => (window as any).grecaptcha.enterprise.ready(resolve));
    return await (window as any).grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
  } catch {
    return undefined;
  }
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { login, isLoggingIn, forgotPassword, resetPassword, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: socialProviders } = useQuery<{ google: boolean; facebook: boolean; tiktok: boolean }>({
    queryKey: ["/api/auth/social-providers"],
  });

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      const messages: Record<string, string> = {
        facebook_denied: "Facebook login was cancelled.",
        tiktok_denied: "TikTok login was cancelled.",
        google_denied: "Google login was cancelled.",
        facebook_failed: "Facebook login failed. Please try again.",
        tiktok_failed: "TikTok login failed. Please try again.",
        google_failed: "Google login failed. Please try again.",
        facebook_token_failed: "Could not authenticate with Facebook.",
        tiktok_token_failed: "Could not authenticate with TikTok.",
        google_token_failed: "Could not authenticate with Google.",
        invalid_state: "Login session expired. Please try again.",
      };
      toast({ title: "Login error", description: messages[error] || "Something went wrong.", variant: "destructive" });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recaptchaToken = await getRecaptchaToken("LOGIN");
      await login({ email, password, recaptchaToken });
      toast({ title: "Welcome back!" });
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect") || "/";
      setLocation(redirect);
    } catch (error: any) {
      const errorMessage = error.message || "Please check your credentials";
      if (errorMessage.toLowerCase().includes("verify your email") || errorMessage.toLowerCase().includes("not verified")) {
        localStorage.setItem("pendingVerificationEmail", email);
        toast({ title: "Email not verified", description: "Redirecting you to verify your email...", variant: "destructive" });
        setTimeout(() => setLocation(`/verify-email?email=${encodeURIComponent(email)}`), 1500);
        return;
      }
      toast({ title: "Login failed", description: errorMessage, variant: "destructive" });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const recaptchaToken = await getRecaptchaToken("FORGOT_PASSWORD");
      await forgotPassword({ email, recaptchaToken });
      setStep("reset");
      toast({ title: "Check your email", description: "We sent you a reset code" });
    } catch (error: any) {
      toast({ title: "Request failed", description: error.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword({ email, code: resetCode, newPassword });
      toast({ title: "Password reset!", description: "You can now sign in with your new password" });
      setStep("login");
      setPassword("");
      setResetCode("");
      setNewPassword("");
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message || "Please check your code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const hasSocialProviders = socialProviders?.google || socialProviders?.facebook || socialProviders?.tiktok;

  if (step === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-teal-500 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>Enter the code we sent to <strong>{email}</strong></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetCode">Reset Code</Label>
                <Input id="resetCode" type="text" placeholder="Enter 6-digit code"
                  value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest" maxLength={6} data-testid="input-reset-code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="At least 8 characters"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  required minLength={8} data-testid="input-new-password" />
              </div>
              <Button type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600"
                disabled={isLoading || resetCode.length !== 6} data-testid="button-reset-password">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : "Reset Password"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("login")} data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
            <CardDescription>Enter your email and we'll send you a reset code</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="jane@school.edu"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required data-testid="input-forgot-email" />
              </div>
              <Button type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600"
                disabled={isLoading} data-testid="button-send-reset-code">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Reset Code"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("login")} data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            BrightBoard
          </CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" placeholder="jane@school.edu"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required data-testid="input-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"}
                  placeholder="Enter your password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required data-testid="input-password" />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="text-right">
              <button type="button" className="text-sm text-primary underline hover:text-primary/80"
                onClick={() => setStep("forgot")} data-testid="link-forgot-password">
                {t('auth.forgotPassword')}
              </button>
            </div>
            <Button type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600"
              disabled={isLoggingIn} data-testid="button-login">
              {isLoggingIn ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</> : t('common.signIn')}
            </Button>

            {hasSocialProviders && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {socialProviders?.google && (
                    <a href="/api/auth/google" data-testid="button-login-google">
                      <Button type="button" variant="outline" className="w-full flex items-center gap-2 border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-colors">
                        <SiGoogle className="w-4 h-4" />Continue with Google
                      </Button>
                    </a>
                  )}
                  {socialProviders?.facebook && (
                    <a href="/api/auth/facebook" data-testid="button-login-facebook">
                      <Button type="button" variant="outline" className="w-full flex items-center gap-2 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors">
                        <SiFacebook className="w-4 h-4" />Continue with Facebook
                      </Button>
                    </a>
                  )}
                  {socialProviders?.tiktok && (
                    <a href="/api/auth/tiktok" data-testid="button-login-tiktok">
                      <Button type="button" variant="outline" className="w-full flex items-center gap-2 border-black text-black dark:border-white dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                        <SiTiktok className="w-4 h-4" />Continue with TikTok
                      </Button>
                    </a>
                  )}
                </div>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{" "}
              <button type="button" className="text-primary underline hover:text-primary/80"
                onClick={() => setLocation("/signup")} data-testid="link-signup">
                {t('common.signUp')}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
