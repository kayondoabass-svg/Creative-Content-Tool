import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle, ArrowLeft, Sparkles } from "lucide-react";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { verifyEmail, isVerifying, resendCode, isResendingCode, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const params = new URLSearchParams(search);
  const emailFromUrl = params.get("email") || "";
  
  const [email, setEmail] = useState(emailFromUrl);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    
    try {
      await verifyEmail({ email, code: verificationCode });
      setIsVerified(true);
      toast({ title: "Email verified!", description: "Redirecting to login..." });
      setTimeout(() => setLocation("/login"), 2000);
    } catch (error: any) {
      toast({ 
        title: "Verification failed", 
        description: error.message || "Please check your code and try again",
        variant: "destructive" 
      });
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({ title: "Please enter your email first", variant: "destructive" });
      return;
    }
    
    try {
      await resendCode({ email });
      toast({ title: "Code sent!", description: "Check your email for a new verification code" });
    } catch (error: any) {
      toast({ 
        title: "Failed to resend code", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Email Verified!
              </h2>
              <p className="text-muted-foreground">
                Your account is now active. Redirecting you to login...
              </p>
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-teal-500 flex items-center justify-center shadow-lg">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code we sent to your email
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center text-3xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  data-testid="input-verification-code"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Check your inbox and spam folder
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 shadow-lg"
                disabled={isVerifying || verificationCode.length !== 6}
                data-testid="button-verify"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Verify Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="text-center">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleResend}
              disabled={isResendingCode || !email}
              className="text-sm"
              data-testid="button-resend-code"
            >
              {isResendingCode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Didn't receive a code? Click to resend"
              )}
            </Button>
          </div>
          
          <div className="flex justify-center gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/login")}
              data-testid="link-login"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/signup")}
              data-testid="link-signup"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
