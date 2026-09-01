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
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
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

export interface BillingProviderPort {
  createStripeCheckout(input: {
    userId: string;
    planId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string>;
  verifyMobilePurchase(input: {
    provider: 'APPLE' | 'GOOGLE_PLAY';
    planId: string;
    productId: string;
    transactionToken: string;
  }): Promise<ProviderSubscriptionState>;
  restoreMobilePurchases(input: {
    provider: 'APPLE' | 'GOOGLE_PLAY';
    userId: string;
  }): Promise<ProviderSubscriptionState[]>;
  verifyWebhook(input: {
    provider: SubscriptionProvider;
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerifiedWebhook>;
}
