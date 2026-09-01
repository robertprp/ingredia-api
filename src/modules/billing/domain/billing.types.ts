export const billingCapabilities = {
  unlimitedScans: 'UNLIMITED_SCANS',
  productComparison: 'PRODUCT_COMPARISON',
  completeHistory: 'COMPLETE_HISTORY',
  personalizedPregnancyMode: 'PERSONALIZED_PREGNANCY_MODE',
} as const;

export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type SubscriptionProvider = 'STRIPE' | 'APPLE' | 'GOOGLE_PLAY';
export type SubscriptionEnvironment = 'SANDBOX' | 'PRODUCTION';
export type BillingClientPlatform = 'WEB' | 'IOS' | 'ANDROID';
export type BillingDistributionChannel =
  'WEB_DIRECT' | 'APP_STORE' | 'GOOGLE_PLAY';
export type BillingPurchaseAction =
  'NONE' | 'STRIPE_CHECKOUT' | 'APP_STORE_PURCHASE' | 'GOOGLE_PLAY_PURCHASE';
export type BillingRestoreAction =
  'NONE' | 'APP_STORE_RESTORE' | 'GOOGLE_PLAY_RESTORE';
export type BillingManagementAction =
  | 'NONE'
  | 'STRIPE_PORTAL'
  | 'APP_STORE_SUBSCRIPTIONS'
  | 'GOOGLE_PLAY_SUBSCRIPTIONS'
  | 'CONTACT_SUPPORT';
export type BillingEligibilityReason =
  'ELIGIBLE' | 'CHANNEL_MISMATCH' | 'EXISTING_SUBSCRIPTION';
export type SubscriptionStatus =
  'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export interface BillingPlan {
  id: string;
  name: string;
  billingPeriod: BillingPeriod;
  trialDays: number;
  capabilities: string[];
  monthlyScanLimit: number | null;
  amountMinor: number | null;
  currency: string | null;
  isPublic: boolean;
  isPurchasable: boolean;
  productReferences?: BillingProductReference[];
}

export interface BillingProductReference {
  planId: string;
  provider: SubscriptionProvider;
  environment: SubscriptionEnvironment;
  productId: string;
}

export interface BillingSubscription {
  id: string;
  userId: string;
  planId: string;
  provider: SubscriptionProvider;
  environment: SubscriptionEnvironment;
  externalPurchaseId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  revokedAt: Date | null;
  updatedAt: Date;
}

export interface VerifiedSubscriptionInput {
  userId: string;
  planId: string;
  provider: SubscriptionProvider;
  environment: SubscriptionEnvironment;
  externalPurchaseId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  revokedAt: Date | null;
}
