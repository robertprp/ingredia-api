import {
  SubscriptionEnvironment,
  SubscriptionProvider,
} from '../../domain/billing.types';

export const BILLING_PROVIDER = Symbol('BILLING_PROVIDER');

export interface ProviderSubscriptionState {
  userId?: string;
  planId: string;
  provider: SubscriptionProvider;
  environment: SubscriptionEnvironment;
  externalPurchaseId: string;
  status:
    'PENDING' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  revokedAt: Date | null;
}

export interface VerifiedWebhook {
  eventId: string;
  subscriptions: ProviderSubscriptionState[];
}

export interface StripePrice {
  currency: string;
  amountMinor: number;
}

export interface BillingProviderPort {
  createStripeCheckout(input: {
    userId: string;
    planId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string>;
  getStripePrice(priceId: string): Promise<StripePrice>;
  verifyMobilePurchase(input: {
    provider: 'APPLE' | 'GOOGLE_PLAY';
    userId: string;
    planId: string;
    productId: string;
    transactionToken: string;
    appAccountToken?: string;
    idempotencyKey: string;
  }): Promise<ProviderSubscriptionState>;
  acknowledgeGooglePlayPurchase(input: {
    purchaseToken: string;
    externalPurchaseId: string;
  }): Promise<void>;
  verifyWebhook(input: {
    provider: SubscriptionProvider;
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerifiedWebhook>;
}
