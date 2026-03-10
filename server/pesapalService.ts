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

const TIER_PRICES_USD: Record<string, { amount: number; days: number }> = {
  weekly: { amount: 4.99, days: 7 },
  monthly: { amount: 14.99, days: 30 },
  yearly: { amount: 99.99, days: 365 },
};

const CURRENCY_RATES: Record<string, { rate: number; symbol: string; name: string }> = {
  USD: { rate: 1, symbol: '$', name: 'US Dollar' },
  UGX: { rate: 3750, symbol: 'UGX', name: 'Ugandan Shilling' },
  KES: { rate: 154, symbol: 'KSh', name: 'Kenyan Shilling' },
  TZS: { rate: 2650, symbol: 'TSh', name: 'Tanzanian Shilling' },
  RWF: { rate: 1350, symbol: 'FRw', name: 'Rwandan Franc' },
  NGN: { rate: 1550, symbol: '₦', name: 'Nigerian Naira' },
  GHS: { rate: 15, symbol: 'GH₵', name: 'Ghanaian Cedi' },
  ZAR: { rate: 18.5, symbol: 'R', name: 'South African Rand' },
  GBP: { rate: 0.79, symbol: '£', name: 'British Pound' },
  EUR: { rate: 0.92, symbol: '€', name: 'Euro' },
  INR: { rate: 84, symbol: '₹', name: 'Indian Rupee' },
  AED: { rate: 3.67, symbol: 'AED', name: 'UAE Dirham' },
  SAR: { rate: 3.75, symbol: 'SAR', name: 'Saudi Riyal' },
  CAD: { rate: 1.36, symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { rate: 1.55, symbol: 'A$', name: 'Australian Dollar' },
  MWK: { rate: 1750, symbol: 'MK', name: 'Malawian Kwacha' },
  ZMW: { rate: 27, symbol: 'ZK', name: 'Zambian Kwacha' },
  ETB: { rate: 57, symbol: 'Br', name: 'Ethiopian Birr' },
  XAF: { rate: 605, symbol: 'FCFA', name: 'CFA Franc' },
  XOF: { rate: 605, symbol: 'CFA', name: 'West African CFA' },
  EGP: { rate: 49, symbol: 'E£', name: 'Egyptian Pound' },
  MAD: { rate: 10, symbol: 'MAD', name: 'Moroccan Dirham' },
};

const COUNTRY_CURRENCY: Record<string, string> = {
  UG: 'UGX', KE: 'KES', TZ: 'TZS', RW: 'RWF', NG: 'NGN',
  GH: 'GHS', ZA: 'ZAR', GB: 'GBP', IE: 'EUR', FR: 'EUR',
  DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  IN: 'INR', AE: 'AED', SA: 'SAR', CA: 'CAD', AU: 'AUD',
  NZ: 'AUD', MW: 'MWK', ZM: 'ZMW', ET: 'ETB', CM: 'XAF',
  GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
  SN: 'XOF', ML: 'XOF', BF: 'XOF', CI: 'XOF', TG: 'XOF',
  BJ: 'XOF', NE: 'XOF', GW: 'XOF', EG: 'EGP', MA: 'MAD',
  US: 'USD',
};

export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || 'USD';
}

export function convertPrice(usdAmount: number, currency: string): number {
  const rate = CURRENCY_RATES[currency]?.rate || 1;
  const converted = usdAmount * rate;
  if (rate >= 100) {
    return Math.round(converted / 100) * 100;
  }
  if (rate >= 10) {
    return Math.round(converted);
  }
  return Math.round(converted * 100) / 100;
}

export function getLocalizedPricing(countryCode: string) {
  const currency = getCurrencyForCountry(countryCode);
  const currencyInfo = CURRENCY_RATES[currency] || CURRENCY_RATES['USD'];

  const plans: Record<string, { amount: number; currency: string; symbol: string; days: number }> = {};
  for (const [tier, base] of Object.entries(TIER_PRICES_USD)) {
    plans[tier] = {
      amount: convertPrice(base.amount, currency),
      currency,
      symbol: currencyInfo.symbol,
      days: base.days,
    };
  }

  return { currency, symbol: currencyInfo.symbol, name: currencyInfo.name, plans };
}

export function getSupportedCurrencies() {
  return Object.entries(CURRENCY_RATES).map(([code, info]) => ({
    code,
    symbol: info.symbol,
    name: info.name,
  }));
}

export function getTierPrice(tier: string, currency?: string) {
  const base = TIER_PRICES_USD[tier];
  if (!base) return null;
  const cur = currency || 'USD';
  const amount = convertPrice(base.amount, cur);
  return { amount, currency: cur, days: base.days };
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
