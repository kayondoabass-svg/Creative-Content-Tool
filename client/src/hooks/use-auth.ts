import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  emailVerified?: boolean;
  isOwner?: boolean;
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, recaptchaToken }: { email: string; password: string; recaptchaToken?: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { email, password, recaptchaToken });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data.user);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      firstName, 
      lastName,
      recaptchaToken,
      ref
    }: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string;
      recaptchaToken?: string;
      ref?: string;
    }) => {
      const response = await apiRequest("POST", "/api/auth/signup", { 
        email, 
        password, 
        firstName, 
        lastName,
        recaptchaToken,
        ref
      });
      return response.json();
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const response = await apiRequest("POST", "/api/auth/verify-email", { email, code });
      return response.json();
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await apiRequest("POST", "/api/auth/resend-code", { email });
      return response.json();
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async ({ email, recaptchaToken }: { email: string; recaptchaToken?: string }) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email, recaptchaToken });
      return response.json();
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email, code, newPassword }: { email: string; code: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", { email, code, newPassword });
      return response.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      window.location.href = "/";
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    signup: signupMutation.mutateAsync,
    isSigningUp: signupMutation.isPending,
    signupError: signupMutation.error,
    verifyEmail: verifyEmailMutation.mutateAsync,
    isVerifying: verifyEmailMutation.isPending,
    resendCode: resendCodeMutation.mutateAsync,
    isResendingCode: resendCodeMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
