import {
  BillingClientPlatform,
  BillingDistributionChannel,
  BillingEligibilityReason,
  BillingManagementAction,
  BillingPurchaseAction,
  BillingRestoreAction,
  BillingSubscription,
  SubscriptionProvider,
} from './billing.types';

export const BILLING_POLICY_VERSION = '2026-08-31-conservative-v1';

export interface BillingPolicyInput {
  platform: BillingClientPlatform;
  distributionChannel: BillingDistributionChannel;
  entitledSubscription: BillingSubscription | null;
  currentSubscription: BillingSubscription | null;
}

export interface BillingPolicyDecision {
  policyVersion: string;
  purchaseAllowed: boolean;
  purchaseProvider: SubscriptionProvider | null;
  purchaseAction: BillingPurchaseAction;
  restoreAction: BillingRestoreAction;
  managementAction: BillingManagementAction;
  reason: BillingEligibilityReason;
}

export function decideBillingPolicy(
  input: BillingPolicyInput,
): BillingPolicyDecision {
  const channel = channelDecision(input.platform, input.distributionChannel);
  const managementAction = managementDecision(
    input.currentSubscription,
    input.platform,
    input.distributionChannel,
  );

  if (input.entitledSubscription !== null) {
    return {
      ...channel,
      purchaseAllowed: false,
      purchaseProvider: null,
      purchaseAction: 'NONE',
      managementAction,
      reason: 'EXISTING_SUBSCRIPTION',
    };
  }

  return { ...channel, managementAction };
}

function channelDecision(
  platform: BillingClientPlatform,
  distributionChannel: BillingDistributionChannel,
): Omit<BillingPolicyDecision, 'managementAction'> {
  const common = { policyVersion: BILLING_POLICY_VERSION };

  if (platform === 'WEB' && distributionChannel === 'WEB_DIRECT') {
    return {
      ...common,
      purchaseAllowed: true,
      purchaseProvider: 'STRIPE',
      purchaseAction: 'STRIPE_CHECKOUT',
      restoreAction: 'NONE',
      reason: 'ELIGIBLE',
    };
  }

  if (platform === 'IOS' && distributionChannel === 'APP_STORE') {
    return {
      ...common,
      purchaseAllowed: true,
      purchaseProvider: 'APPLE',
      purchaseAction: 'APP_STORE_PURCHASE',
      restoreAction: 'APP_STORE_RESTORE',
      reason: 'ELIGIBLE',
    };
  }

  if (platform === 'ANDROID' && distributionChannel === 'GOOGLE_PLAY') {
    return {
      ...common,
      purchaseAllowed: true,
      purchaseProvider: 'GOOGLE_PLAY',
      purchaseAction: 'GOOGLE_PLAY_PURCHASE',
      restoreAction: 'GOOGLE_PLAY_RESTORE',
      reason: 'ELIGIBLE',
    };
  }

  return {
    ...common,
    purchaseAllowed: false,
    purchaseProvider: null,
    purchaseAction: 'NONE',
    restoreAction: 'NONE',
    reason: 'CHANNEL_MISMATCH',
  };
}

function managementDecision(
  subscription: BillingSubscription | null,
  platform: BillingClientPlatform,
  distributionChannel: BillingDistributionChannel,
): BillingManagementAction {
  if (subscription === null || subscription.revokedAt !== null) {
    return 'NONE';
  }

  if (subscription.provider === 'APPLE') {
    return 'APP_STORE_SUBSCRIPTIONS';
  }
  if (subscription.provider === 'GOOGLE_PLAY') {
    return 'GOOGLE_PLAY_SUBSCRIPTIONS';
  }
  if (platform === 'WEB' && distributionChannel === 'WEB_DIRECT') {
    return 'STRIPE_PORTAL';
  }
  return 'CONTACT_SUPPORT';
}
