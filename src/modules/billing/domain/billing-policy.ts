import { BillingClientPlatform, BillingSubscription } from './billing.types';

export const BILLING_POLICY_VERSION = '2026-08-31.1';

export type BillingChannel = 'STRIPE' | 'APP_STORE' | 'GOOGLE_PLAY';
export type BillingEligibilityReasonCode =
  | 'APP_STORE_DIGITAL_FEATURES'
  | 'GOOGLE_PLAY_DIGITAL_FEATURES'
  | 'WEB_DIGITAL_FEATURES'
  | 'EXISTING_SUBSCRIPTION'
  | 'DISTRIBUTION_MISMATCH';

export interface BillingPolicyInput {
  platform: BillingClientPlatform;
  distribution: 'APP_STORE' | 'GOOGLE_PLAY' | 'DIRECT' | 'WEB';
  entitledSubscription: BillingSubscription | null;
  currentSubscription: BillingSubscription | null;
}

export interface BillingPolicyDecision {
  channel: BillingChannel;
  reasonCode: BillingEligibilityReasonCode;
  policyVersion: string;
  restoreSupported: boolean;
  managementChannel: BillingChannel;
  purchaseAllowed: boolean;
}

export function decideBillingPolicy(
  input: BillingPolicyInput,
): BillingPolicyDecision {
  const channel = defaultChannel(input.platform);
  const distributionMatches = isStandardDistribution(
    input.platform,
    input.distribution,
  );
  const existingSubscription =
    input.entitledSubscription !== null ||
    input.currentSubscription?.status === 'PENDING' ||
    input.currentSubscription?.status === 'PAST_DUE';
  return {
    channel,
    reasonCode: existingSubscription
      ? 'EXISTING_SUBSCRIPTION'
      : distributionMatches
        ? defaultReason(channel)
        : 'DISTRIBUTION_MISMATCH',
    policyVersion: BILLING_POLICY_VERSION,
    restoreSupported: channel !== 'STRIPE',
    managementChannel: managementChannel(input.currentSubscription, channel),
    purchaseAllowed: !existingSubscription && distributionMatches,
  };
}

function isStandardDistribution(
  platform: BillingClientPlatform,
  distribution: 'APP_STORE' | 'GOOGLE_PLAY' | 'DIRECT' | 'WEB',
): boolean {
  if (platform === 'IOS') return distribution === 'APP_STORE';
  if (platform === 'ANDROID') return distribution === 'GOOGLE_PLAY';
  return distribution === 'DIRECT' || distribution === 'WEB';
}

function defaultChannel(platform: BillingClientPlatform): BillingChannel {
  if (platform === 'IOS') return 'APP_STORE';
  if (platform === 'ANDROID') return 'GOOGLE_PLAY';
  return 'STRIPE';
}

function defaultReason(channel: BillingChannel): BillingEligibilityReasonCode {
  if (channel === 'APP_STORE') return 'APP_STORE_DIGITAL_FEATURES';
  if (channel === 'GOOGLE_PLAY') return 'GOOGLE_PLAY_DIGITAL_FEATURES';
  return 'WEB_DIGITAL_FEATURES';
}

function managementChannel(
  subscription: BillingSubscription | null,
  fallback: BillingChannel,
): BillingChannel {
  if (subscription === null || subscription.revokedAt !== null) return fallback;
  if (subscription.provider === 'APPLE') return 'APP_STORE';
  return subscription.provider;
}
