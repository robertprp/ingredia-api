import {
  BillingClientPlatform,
  BillingDistributionChannel,
  BillingManagementAction,
  BillingPurchaseAction,
  BillingRestoreAction,
  SubscriptionProvider,
} from '@ingredia/contracts';
import { decideBillingPolicy } from './billing-policy';
import { BillingSubscription } from './billing.types';

function currentSubscription(provider: BillingSubscription['provider']) {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    planId: 'plus-monthly',
    provider,
    environment: 'SANDBOX',
    externalPurchaseId: 'purchase-1',
    status: 'ACTIVE',
    currentPeriodStart: null,
    currentPeriodEnd: new Date('2026-09-30T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    revokedAt: null,
    updatedAt: new Date('2026-08-31T00:00:00.000Z'),
  } satisfies BillingSubscription;
}

describe('conservative billing policy', () => {
  it.each([
    [
      BillingClientPlatform.WEB,
      BillingDistributionChannel.WEB_DIRECT,
      SubscriptionProvider.STRIPE,
      BillingPurchaseAction.STRIPE_CHECKOUT,
      BillingRestoreAction.NONE,
    ],
    [
      BillingClientPlatform.IOS,
      BillingDistributionChannel.APP_STORE,
      SubscriptionProvider.APPLE,
      BillingPurchaseAction.APP_STORE_PURCHASE,
      BillingRestoreAction.APP_STORE_RESTORE,
    ],
    [
      BillingClientPlatform.ANDROID,
      BillingDistributionChannel.GOOGLE_PLAY,
      SubscriptionProvider.GOOGLE_PLAY,
      BillingPurchaseAction.GOOGLE_PLAY_PURCHASE,
      BillingRestoreAction.GOOGLE_PLAY_RESTORE,
    ],
  ])(
    'routes %s/%s only to its eligible provider',
    (
      platform,
      distributionChannel,
      provider,
      purchaseAction,
      restoreAction,
    ) => {
      const decision = decideBillingPolicy({
        platform,
        distributionChannel,
        entitledSubscription: null,
        currentSubscription: null,
      });

      expect(decision).toMatchObject({
        purchaseAllowed: true,
        purchaseProvider: provider,
        purchaseAction,
        restoreAction,
      });
    },
  );

  it.each([
    [BillingClientPlatform.IOS, BillingDistributionChannel.WEB_DIRECT],
    [BillingClientPlatform.IOS, BillingDistributionChannel.GOOGLE_PLAY],
    [BillingClientPlatform.ANDROID, BillingDistributionChannel.WEB_DIRECT],
    [BillingClientPlatform.ANDROID, BillingDistributionChannel.APP_STORE],
    [BillingClientPlatform.WEB, BillingDistributionChannel.APP_STORE],
    [BillingClientPlatform.WEB, BillingDistributionChannel.GOOGLE_PLAY],
  ])('fails closed for mismatched channel %s/%s', (platform, channel) => {
    const decision = decideBillingPolicy({
      platform,
      distributionChannel: channel,
      entitledSubscription: null,
      currentSubscription: null,
    });

    expect(decision.purchaseAllowed).toBe(false);
    expect(decision.purchaseProvider).toBeNull();
    expect(decision.purchaseAction).toBe(BillingPurchaseAction.NONE);
  });

  it('never exposes a Stripe portal action inside an App Store build', () => {
    const stripe = currentSubscription('STRIPE');
    const decision = decideBillingPolicy({
      platform: BillingClientPlatform.IOS,
      distributionChannel: BillingDistributionChannel.APP_STORE,
      entitledSubscription: stripe,
      currentSubscription: stripe,
    });

    expect(decision.purchaseAction).toBe(BillingPurchaseAction.NONE);
    expect(decision.managementAction).toBe(
      BillingManagementAction.CONTACT_SUPPORT,
    );
  });

  it.each([
    ['APPLE', BillingManagementAction.APP_STORE_SUBSCRIPTIONS],
    ['GOOGLE_PLAY', BillingManagementAction.GOOGLE_PLAY_SUBSCRIPTIONS],
  ] as const)(
    'uses the correct restore and management behavior for %s subscriptions',
    (provider, expectedManagement) => {
      const storeSubscription = currentSubscription(provider);
      const decision = decideBillingPolicy({
        platform:
          provider === 'APPLE'
            ? BillingClientPlatform.IOS
            : BillingClientPlatform.ANDROID,
        distributionChannel:
          provider === 'APPLE'
            ? BillingDistributionChannel.APP_STORE
            : BillingDistributionChannel.GOOGLE_PLAY,
        entitledSubscription: storeSubscription,
        currentSubscription: storeSubscription,
      });

      expect(decision.managementAction).toBe(expectedManagement);
      expect(decision.restoreAction).toBe(
        provider === 'APPLE'
          ? BillingRestoreAction.APP_STORE_RESTORE
          : BillingRestoreAction.GOOGLE_PLAY_RESTORE,
      );
    },
  );
});
