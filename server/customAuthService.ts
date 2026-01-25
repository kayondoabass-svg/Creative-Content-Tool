// Custom authentication service for BrightBoard
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";
import { users, verificationCodes } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendVerificationEmail, sendPasswordResetEmail } from "./emailService";

const SALT_ROUNDS = 10;
const CODE_EXPIRY_MINUTES = 10;

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn("reCAPTCHA secret key not configured, skipping verification");
    return true;
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  recaptchaToken?: string
): Promise<{ success: boolean; message: string; userId?: string }> {
  try {
    // Verify reCAPTCHA if token provided
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        return { success: false, message: "reCAPTCHA verification failed" };
      }
    }

    // Check if email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, message: "An account with this email already exists" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        emailVerified: false,
      })
      .returning();

    // Generate and send verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verificationCodes).values({
      email: email.toLowerCase(),
      code,
      type: "email_verification",
      expiresAt,
    });

    await sendVerificationEmail(email, code);

    return {
      success: true,
      message: "Account created. Please check your email for a verification code.",
      userId: newUser.id,
    };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, message: "Failed to create account" };
  }
}

export async function verifyEmail(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find valid verification code
    const [validCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email.toLowerCase()),
          eq(verificationCodes.code, code),
          eq(verificationCodes.type, "email_verification"),
          gt(verificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!validCode) {
      return { success: false, message: "Invalid or expired verification code" };
    }

    // Mark code as used
    await db
      .update(verificationCodes)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodes.id, validCode.id));

    // Mark email as verified
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email.toLowerCase()));

    return { success: true, message: "Email verified successfully" };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false, message: "Verification failed" };
  }
}

export async function resendVerificationCode(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return { success: false, message: "No account found with this email" };
    }

    if (user.emailVerified) {
      return { success: false, message: "Email is already verified" };
    }

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verificationCodes).values({
      email: email.toLowerCase(),
      code,
      type: "email_verification",
      expiresAt,
    });

    await sendVerificationEmail(email, code);

    return { success: true, message: "Verification code sent" };
  } catch (error) {
    console.error("Resend code error:", error);
    return { success: false, message: "Failed to send verification code" };
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return { success: false, message: "Invalid email or password" };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, message: "Invalid email or password" };
    }

    if (!user.emailVerified) {
      return { success: false, message: "Please verify your email first" };
    }

    // Update last active
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Login failed" };
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: "If an account exists, a reset code will be sent" };
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verificationCodes).values({
      email: email.toLowerCase(),
      code,
      type: "password_reset",
      expiresAt,
    });

    await sendPasswordResetEmail(email, code);

    return { success: true, message: "If an account exists, a reset code will be sent" };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, message: "Failed to send reset code" };
  }
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const [validCode] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email.toLowerCase()),
          eq(verificationCodes.code, code),
          eq(verificationCodes.type, "password_reset"),
          gt(verificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!validCode) {
      return { success: false, message: "Invalid or expired reset code" };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, email.toLowerCase()));

    // Mark code as used
    await db
      .update(verificationCodes)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodes.id, validCode.id));

    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, message: "Failed to reset password" };
  }
}

export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    emailVerified: user.emailVerified,
  };
}
