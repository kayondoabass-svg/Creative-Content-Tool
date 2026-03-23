// Resend email service for BrightBoard
import { Resend } from 'resend';
import { db } from './db';
import { expenses } from '@shared/schema';

let connectionSettings: any;

// Log Resend email costs automatically
// Resend pricing: $0.001 per email (first 100 emails/day free)
// We store amounts in cents, so $0.001 = 0.1 cents
// We'll batch and log 1 cent for every 10 emails to avoid fractional cents
let pendingResendEmails = 0;

async function logResendExpense(emailType: string, recipient: string): Promise<void> {
  try {
    pendingResendEmails++;
    // Log 1 cent for every 10 emails sent (approximation)
    // This gives us $0.001 per email which matches Resend pricing
    if (pendingResendEmails >= 10) {
      await db.insert(expenses).values({
        category: "resend",
        description: `Batch of ${pendingResendEmails} emails sent`,
        amount: 1, // 1 cent for 10 emails
        currency: "USD",
        date: new Date(),
        isAutomatic: true,
        metadata: JSON.stringify({ emailCount: pendingResendEmails }),
      });
      pendingResendEmails = 0;
    } else {
      // For individual tracking, log with 0 amount but track the email
      await db.insert(expenses).values({
        category: "resend",
        description: `${emailType} email to ${recipient.substring(0, 20)}...`,
        amount: 0, // Fractional cent - will accumulate over time
        currency: "USD",
        date: new Date(),
        isAutomatic: true,
        metadata: JSON.stringify({ emailType, recipient, note: "Part of $0.001/email batch" }),
      });
    }
  } catch (error) {
    console.error("Failed to log Resend expense:", error);
  }
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    // Use the from email from connection or fallback to verified domain
    // Ensure proper format with name
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }
    console.log('Attempting to send verification email to:', email, 'from:', sender, 'connection fromEmail:', fromEmail);
    
    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: 'Verify your BrightBoard account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">BrightBoard</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">AI Content for Teachers</p>
            </div>
            
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Verify your email</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
              Enter this verification code to complete your BrightBoard account setup:
            </p>
            
            <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px;">${code}</span>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
            &copy; ${new Date().getFullYear()} BrightBoard. All rights reserved.
          </p>
        </body>
        </html>
      `,
    });

    console.log('Verification email sent:', result);
    // Log Resend expense
    await logResendExpense("Verification", email);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, code: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    // Use the from email from connection or fallback to verified domain
    // Ensure proper format with name
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }
    console.log('Attempting to send password reset email to:', email, 'from:', sender, 'connection fromEmail:', fromEmail);
    
    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: 'Reset your BrightBoard password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">BrightBoard</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">AI Content for Teachers</p>
            </div>
            
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Reset your password</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
              Enter this code to reset your password:
            </p>
            
            <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px;">${code}</span>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
            &copy; ${new Date().getFullYear()} BrightBoard. All rights reserved.
          </p>
        </body>
        </html>
      `,
    });

    console.log('Password reset email sent:', result);
    await logResendExpense("Password Reset", email);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

export async function sendContactNotification(name: string, email: string, subject: string, message: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }

    const subjectLabels: Record<string, string> = {
      general: "General Inquiry",
      support: "Technical Support",
      billing: "Billing Question",
      feedback: "Feedback",
      partnership: "Partnership",
      bug: "Bug Report",
    };

    const result = await client.emails.send({
      from: sender,
      to: 'kayondoabass@gmail.com',
      replyTo: email,
      subject: `[BrightBoard Contact] ${subjectLabels[subject] || subject} from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #7c3aed; margin: 0 0 24px 0; font-size: 24px;">New Contact Form Submission</h1>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Name:</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #7c3aed;">${email}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Subject:</td><td style="padding: 8px 0;">${subjectLabels[subject] || subject}</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <h3 style="color: #1f2937; margin: 0 0 8px 0;">Message:</h3>
            <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">You can reply directly to this email to respond to ${name}.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Contact notification email sent:', result);
    await logResendExpense("Contact Form", email);
    return true;
  } catch (error) {
    console.error('Error sending contact notification:', error);
    return false;
  }
}

export async function sendAffiliateStatusEmail(name: string, email: string, status: string, referralCode: string, rejectedReason?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }

    const isApproved = status === "approved";
    const referralLink = `https://www.brightboardapp.com/signup?ref=${referralCode}`;

    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: isApproved
        ? 'Your BrightBoard Affiliate Application is Approved!'
        : 'Update on Your BrightBoard Affiliate Application',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #7c3aed; margin: 0 0 8px 0; font-size: 24px;">BrightBoard Affiliate Program</h1>
            <p style="color: #4b5563;">Hi ${name},</p>
            ${isApproved ? `
              <p style="color: #4b5563;">Great news! Your affiliate application has been <strong style="color: #16a34a;">approved</strong>!</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">Your Referral Code:</p>
                <p style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold; color: #7c3aed; letter-spacing: 2px;">${referralCode}</p>
                <p style="margin: 0 0 8px 0; font-weight: 600;">Your Referral Link:</p>
                <a href="${referralLink}" style="color: #7c3aed; word-break: break-all;">${referralLink}</a>
              </div>
              <p style="color: #4b5563;">Share this link with teachers. When they sign up and subscribe through your link, you earn commissions!</p>
              <p style="color: #4b5563;">You can check your referrals and earnings anytime at <a href="https://www.brightboardapp.com/affiliate" style="color: #7c3aed;">brightboardapp.com/affiliate</a>.</p>
            ` : `
              <p style="color: #4b5563;">Thank you for your interest in our affiliate program. Unfortunately, we're unable to approve your application at this time.</p>
              ${rejectedReason ? `<p style="color: #4b5563;"><strong>Reason:</strong> ${rejectedReason}</p>` : ''}
              <p style="color: #4b5563;">You're welcome to apply again in the future. If you have questions, please contact us at support@brightboardapp.com.</p>
            `}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">BrightBoard - AI Content for Teachers</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Affiliate status email sent:', result);
    await logResendExpense("Affiliate Status", email);
    return true;
  } catch (error) {
    console.error('Error sending affiliate status email:', error);
    return false;
  }
}

export async function sendNewsletterWelcomeEmail(email: string, name?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }

    const greeting = name ? `Hi ${name}` : 'Hi there';

    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: 'Welcome to BrightBoard Weekly Teaching Tips!',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #7c3aed; margin: 0 0 8px 0; font-size: 24px;">Welcome to BrightBoard!</h1>
            <p style="color: #4b5563;">${greeting},</p>
            <p style="color: #4b5563;">Thank you for subscribing to our weekly teaching tips newsletter! You'll receive:</p>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Weekly teaching tips and strategies</li>
              <li>New feature announcements</li>
              <li>Creative content ideas for your classroom</li>
              <li>Exclusive tips from experienced educators</li>
            </ul>
            <div style="background: linear-gradient(135deg, #7c3aed20, #0d948820); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #7c3aed;">Start creating amazing content today!</p>
              <a href="https://www.brightboardapp.com/signup" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Try BrightBoard Free</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">BrightBoard - AI Content for Teachers</p>
            <p style="color: #9ca3af; font-size: 11px;">You can unsubscribe at any time by visiting <a href="https://www.brightboardapp.com" style="color: #7c3aed;">brightboardapp.com</a></p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Newsletter welcome email sent:', result);
    await logResendExpense("Newsletter Welcome", email);
    return true;
  } catch (error) {
    console.error('Error sending newsletter welcome email:', error);
    return false;
  }
}

interface PaymentReceiptData {
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  paymentMethod: string;
  confirmationCode: string;
  date: string;
  nextBillingDate: string;
  customerName: string;
}

export async function sendPaymentReceiptEmail(email: string, data: PaymentReceiptData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    if (!client) return false;

    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }

    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: `Payment Receipt - BrightBoard ${data.planName} Plan`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8" /></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #7c3aed, #0d9488); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Payment Receipt</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Thank you for your purchase!</p>
              </div>
              <div style="padding: 30px;">
                <p style="color: #374151; font-size: 16px;">Hello ${data.customerName},</p>
                <p style="color: #6b7280; font-size: 14px;">Your payment has been processed successfully. Here are your receipt details:</p>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order ID</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right; font-weight: 600;">${data.orderId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan</td>
                      <td style="padding: 8px 0; color: #7c3aed; font-size: 14px; text-align: right; font-weight: 600;">${data.planName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 18px; text-align: right; font-weight: 700;">${data.currency} ${data.amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Method</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.paymentMethod}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Confirmation</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.confirmationCode}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.date}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Next Billing</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.nextBillingDate}</td>
                    </tr>
                  </table>
                </div>

                <div style="background: linear-gradient(135deg, #7c3aed10, #0d948810); border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #7c3aed; font-weight: 600; font-size: 14px;">🎉 Premium Features Activated!</p>
                  <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 13px;">Unlimited generations, HD/4K quality, premium transitions, and more.</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                
                <div style="font-size: 11px; color: #9ca3af;">
                  <p style="margin: 4px 0;"><strong>Keyo Technologies</strong></p>
                  <p style="margin: 4px 0;">Registration: 80030812159711 | TIN: 1008176770</p>
                  <p style="margin: 4px 0;">Kampala, Uganda</p>
                  <p style="margin: 8px 0;">For support: <a href="mailto:kayondoabass@gmail.com" style="color: #7c3aed;">kayondoabass@gmail.com</a></p>
                  <p style="margin: 4px 0;">BrightBoard - AI Content for Teachers | <a href="https://www.brightboardapp.com" style="color: #7c3aed;">brightboardapp.com</a></p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Payment receipt email sent:', result);
    await logResendExpense("Payment Receipt", email);
    return true;
  } catch (error) {
    console.error('Error sending payment receipt email:', error);
    return false;
  }
}

export async function sendMarketingBlastEmail(email: string, firstName: string, country?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }

    const name = firstName || 'Teacher';

    // Get localized pricing
    const { getLocalizedPricing } = await import('./pesapalService');
    const countryCode = country || 'US';
    const pricing = getLocalizedPricing(countryCode);
    const monthly = pricing.plans['monthly'];
    const weekly = pricing.plans['weekly'];

    function formatLocalPrice(amount: number, symbol: string, currency: string): string {
      if (currency === 'USD') return `$${amount.toFixed(2)}`;
      if (currency === 'GBP') return `£${amount.toFixed(2)}`;
      if (currency === 'EUR') return `€${amount.toFixed(2)}`;
      if (amount >= 1000) return `${symbol} ${amount.toLocaleString()}`;
      if (Number.isInteger(amount)) return `${symbol} ${amount}`;
      return `${symbol} ${amount.toFixed(2)}`;
    }

    const monthlyPrice = formatLocalPrice(monthly.amount, monthly.symbol, monthly.currency);
    const weeklyPrice = formatLocalPrice(weekly.amount, weekly.symbol, weekly.currency);

    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: `${name}, look what BrightBoard can do for your classroom 🎓`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BrightBoard Features</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f0ff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); border-radius: 16px 16px 0 0; padding: 40px 40px 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">BrightBoard</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">AI-Powered Teaching Tools</p>
            </div>

            <!-- Body -->
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

              <h2 style="color: #1f2937; font-size: 22px; margin: 0 0 8px;">Hi ${name},</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 28px;">
                You've already started using BrightBoard — great start! But did you know there are <strong>9 powerful tools</strong> waiting for you? Here's everything you can create:
              </p>

              <!-- Feature Grid -->
              ${[
                { icon: '🧠', title: 'AI Mind Maps', desc: 'Turn any topic into a beautiful visual mind map with AI-generated node images. Perfect for introducing new concepts.' },
                { icon: '📊', title: 'AI Presentations', desc: 'Create professional slideshows in seconds. Includes transitions, speaker notes, and a tap-to-reveal quiz game mode for interactive lessons.' },
                { icon: '📝', title: 'AI Worksheets', desc: 'Auto-generate printable worksheets with fill-in-the-blank, matching, short answers, and more. Formatted for A4 and Letter printing.' },
                { icon: '🎨', title: 'Custom AI Images', desc: 'Generate educational illustrations for any lesson topic, subject, or grade level. No design skills needed.' },
                { icon: '🎬', title: 'Video Storyboards', desc: 'Plan animated video lessons with frame-by-frame storyboards. Great for flipped classroom content.' },
                { icon: '📖', title: 'Story Generator', desc: 'Create age-appropriate educational stories with characters, plot, and moral lessons — tailored to your grade level.' },
                { icon: '🎮', title: 'Interactive Activities & Games', desc: 'Generate quizzes, clue games, true/false challenges, and odd-one-out exercises your students will love.' },
                { icon: '📄', title: 'Lesson Plan Generator', desc: 'Produce complete lesson plans with learning objectives, materials, step-by-step instructions, and assessment criteria in one click.' },
                { icon: '🌍', title: 'Multi-Language Support', desc: 'Works in English, Tagalog, Bahasa Indonesia, Vietnamese, Thai, Arabic, and many more. Teach in any language.' },
              ].map(f => `
                <div style="display: flex; gap: 16px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 10px; border-left: 4px solid #7c3aed;">
                  <div style="font-size: 28px; flex-shrink: 0; line-height: 1;">${f.icon}</div>
                  <div>
                    <div style="font-weight: 700; color: #1f2937; font-size: 15px; margin-bottom: 4px;">${f.title}</div>
                    <div style="color: #6b7280; font-size: 14px; line-height: 1.5;">${f.desc}</div>
                  </div>
                </div>
              `).join('')}

              <!-- Bonus features -->
              <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 10px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">✨ Premium also includes:</p>
                <ul style="margin: 8px 0 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                  <li>Unlimited daily generations across ALL tools</li>
                  <li>Export presentations as PowerPoint (.pptx) files</li>
                  <li>HD & 4K image quality options</li>
                  <li>Reference image uploads (generate from your textbook pages)</li>
                  <li>Dark mode for eye-friendly night use</li>
                  <li>Grade-level customization from Nursery to University</li>
                </ul>
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 24px;">
                <a href="https://brightboardapp.com/pricing" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: white; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 40px; border-radius: 50px; box-shadow: 0 4px 14px rgba(124,58,237,0.4);">
                  Unlock All Features — Upgrade Now
                </a>
                <p style="color: #9ca3af; font-size: 13px; margin: 12px 0 0;">From just ${weeklyPrice}/week &nbsp;·&nbsp; ${monthlyPrice}/month</p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                Still exploring? Your free account resets every day. Come back and try something new!<br>
                <a href="https://brightboardapp.com" style="color: #7c3aed; font-weight: 600;">Visit BrightBoard →</a>
              </p>
            </div>

            <!-- Footer -->
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; line-height: 1.6;">
              &copy; ${new Date().getFullYear()} BrightBoard · Made for teachers, by teachers.<br>
              You're receiving this because you signed up at brightboardapp.com.<br>
              <a href="https://brightboardapp.com" style="color: #9ca3af;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Marketing blast sent to:', email, result);
    await logResendExpense("Marketing Blast", email);
    return true;
  } catch (error) {
    console.error('Error sending marketing blast to', email, ':', error);
    return false;
  }
}

export async function sendActivationEmail(email: string, firstName: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    let sender = fromEmail || 'noreply@brightboardapp.com';
    if (sender && !sender.includes('<')) {
      sender = `BrightBoard <${sender}>`;
    }

    const name = firstName || 'Teacher';

    const exampleLinks = [
      { label: "Fractions for Grade 4", url: "https://www.brightboardapp.com/?prompt=Fractions+for+Grade+4&type=worksheet" },
      { label: "Animal Habitats Lesson Slides", url: "https://www.brightboardapp.com/?prompt=Animal+habitats+for+Grade+3&type=presentation" },
      { label: "Multiplication Mind Map", url: "https://www.brightboardapp.com/?prompt=Multiplication+mind+map+for+Grade+3&type=mindmap" },
    ];

    const result = await client.emails.send({
      from: sender,
      to: email,
      subject: `${name}, your first AI lesson is one click away ✨`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7c3aed, #0d9488); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">BrightBoard</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 14px;">AI Content for Teachers</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <p style="color: #1f2937; font-size: 17px; font-weight: 600; margin: 0 0 8px;">Hi ${name} 👋</p>
              <p style="color: #4b5563; line-height: 1.7; margin: 0 0 24px;">
                You signed up for BrightBoard but haven't created your first lesson yet — and we don't want you to miss out. 
                It only takes 30 seconds to generate a complete worksheet, mind map, or slide deck!
              </p>

              <!-- What you can create -->
              <div style="background: #faf5ff; border-radius: 10px; padding: 20px; margin-bottom: 24px; border: 1px solid #e9d5ff;">
                <p style="margin: 0 0 12px; color: #6d28d9; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Start with one of these →</p>
                ${exampleLinks.map(ex => `
                  <div style="margin-bottom: 8px;">
                    <a href="${ex.url}" style="display: inline-block; background: white; color: #7c3aed; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px 16px; text-decoration: none; font-size: 14px; font-weight: 500;">
                      ✦ ${ex.label}
                    </a>
                  </div>
                `).join('')}
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 0 0 24px;">
                <a href="https://www.brightboardapp.com/" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #0d9488); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
                  Create my first lesson →
                </a>
              </div>

              <!-- Free tier reminder -->
              <div style="background: #f0fdf4; border-radius: 8px; padding: 14px 18px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
                <p style="margin: 0; color: #166534; font-size: 13px; line-height: 1.6;">
                  <strong>Free account perks:</strong> 2 images, 1 lesson, 2 worksheets, 2 mind maps &amp; more — every day, no credit card needed.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                Questions? Just reply to this email — we read every message.<br>
                Happy teaching! 🍎
              </p>
            </div>

            <!-- Footer -->
            <p style="text-align: center; color: #9ca3af; font-size: 11px; margin: 0 0 24px; padding: 0 24px; line-height: 1.6;">
              &copy; ${new Date().getFullYear()} BrightBoard · Made for teachers.<br>
              You received this because you signed up at <a href="https://www.brightboardapp.com" style="color: #9ca3af;">brightboardapp.com</a>.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Activation email sent to:', email, result);
    await logResendExpense("Activation", email);
    return true;
  } catch (error) {
    console.error('Error sending activation email to', email, ':', error);
    return false;
  }
}
