import { db } from './db';
import { users, payments } from '@shared/schema';
import { eq } from 'drizzle-orm';

const PESAPAL_BASE_URL = 'https://pay.pesapal.com/v3/api';

let cachedToken: { token: string; expiresAt: Date } | null = null;
let cachedIpnId: string | null = null;

export async function getAuthToken(): Promise<string> {
  if (cachedToken && new Date() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PesaPal auth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.token,
    expiresAt: new Date(data.expiryDate),
  };

  return data.token;
}

export async function registerIPN(callbackUrl: string): Promise<string> {
  if (cachedIpnId) return cachedIpnId;

  const token = await getAuthToken();

  const response = await fetch(`${PESAPAL_BASE_URL}/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: callbackUrl,
      ipn_notification_type: 'GET',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PesaPal IPN registration failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedIpnId = data.ipn_id;
  return data.ipn_id;
}

interface SubmitOrderParams {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  amount: number;
  currency: string;
  tier: string;
  callbackUrl: string;
  ipnUrl: string;
}

export async function submitOrder(params: SubmitOrderParams): Promise<{ orderTrackingId: string; redirectUrl: string; merchantReference: string }> {
  const token = await getAuthToken();
  const ipnId = await registerIPN(params.ipnUrl);

  const merchantReference = `BB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const response = await fetch(`${PESAPAL_BASE_URL}/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: merchantReference,
      currency: params.currency,
      amount: params.amount,
      description: `BrightBoard ${params.tier} subscription`,
      callback_url: params.callbackUrl,
      notification_id: ipnId,
      branch: 'BrightBoard',
      billing_address: {
        email_address: params.email,
        phone_number: '',
        country_code: 'UG',
        first_name: params.firstName || '',
        middle_name: '',
        last_name: params.lastName || '',
        line_1: '',
        line_2: '',
        city: '',
        state: '',
        postal_code: '',
        zip_code: '',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PesaPal order submission failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`PesaPal error: ${JSON.stringify(data.error)}`);
  }

  await db.insert(payments).values({
    userId: params.userId,
    orderId: merchantReference,
    pesapalTrackingId: data.order_tracking_id,
    amount: Math.round(params.amount * 100),
    currency: params.currency,
    tier: params.tier,
    status: 'pending',
  });

  return {
    orderTrackingId: data.order_tracking_id,
    redirectUrl: data.redirect_url,
    merchantReference,
  };
}

export interface TransactionStatus {
  paymentMethod: string;
  amount: number;
  createdDate: string;
  confirmationCode: string;
  orderTrackingId: string;
  paymentStatusDescription: string;
  paymentStatusCode: string;
  merchantReference: string;
  paymentAccount: string;
  currency: string;
  status: string;
}

export async function getTransactionStatus(orderTrackingId: string): Promise<TransactionStatus> {
  const token = await getAuthToken();

  const response = await fetch(`${PESAPAL_BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PesaPal status check failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return {
    paymentMethod: data.payment_method || '',
    amount: data.amount || 0,
    createdDate: data.created_date || '',
    confirmationCode: data.confirmation_code || '',
    orderTrackingId: data.order_tracking_id || orderTrackingId,
    paymentStatusDescription: data.payment_status_description || '',
    paymentStatusCode: data.payment_status_code || '',
    merchantReference: data.merchant_reference || '',
    paymentAccount: data.payment_account || '',
    currency: data.currency || '',
    status: data.status || '',
  };
}

const TIER_PRICES: Record<string, { amount: number; currency: string; days: number }> = {
  weekly: { amount: 4.99, currency: 'USD', days: 7 },
  monthly: { amount: 14.99, currency: 'USD', days: 30 },
  yearly: { amount: 99.99, currency: 'USD', days: 365 },
};

export function getTierPrice(tier: string) {
  return TIER_PRICES[tier] || null;
}

export function getSubscriptionEndDate(tier: string): Date {
  const price = TIER_PRICES[tier];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (price?.days || 30));
  return endDate;
}

export async function activateSubscription(userId: string, tier: string, orderTrackingId: string): Promise<void> {
  const endDate = getSubscriptionEndDate(tier);

  await db.update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: 'active',
      subscriptionEndsAt: endDate,
      pesapalOrderTrackingId: orderTrackingId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function updatePaymentStatus(
  orderId: string,
  status: string,
  paymentMethod?: string,
  confirmationCode?: string,
): Promise<void> {
  const updateData: any = { status };
  if (paymentMethod) updateData.paymentMethod = paymentMethod;
  if (confirmationCode) updateData.confirmationCode = confirmationCode;

  await db.update(payments)
    .set(updateData)
    .where(eq(payments.orderId, orderId));
}

export function isConfigured(): boolean {
  return !!(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
}
