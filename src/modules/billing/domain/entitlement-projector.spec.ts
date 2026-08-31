import {
  projectEntitlements,
  subscriptionGrantsAccess,
} from './entitlement-projector';
import { BillingPlan, BillingSubscription } from './billing.types';

const now = new Date('2026-08-31T12:00:00.000Z');

function subscription(
  overrides: Partial<BillingSubscription> = {},
): BillingSubscription {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    planId: 'plus-monthly',
    provider: 'STRIPE',
    environment: 'SANDBOX',
    externalPurchaseId: 'purchase-1',
    status: 'ACTIVE',
    currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-09-30T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    revokedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

describe('entitlement projection', () => {
  it('removes access immediately after a refund or revocation', () => {
    expect(
      subscriptionGrantsAccess(
        subscription({ revokedAt: new Date('2026-08-30T00:00:00.000Z') }),
        now,
      ),
    ).toBe(false);
  });

  it('preserves cancel-at-period-end access until verified expiry', () => {
    const canceled = subscription({
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      canceledAt: new Date('2026-08-20T00:00:00.000Z'),
    });

    expect(subscriptionGrantsAccess(canceled, now)).toBe(true);
    expect(
      subscriptionGrantsAccess(canceled, new Date('2026-09-30T00:00:00.000Z')),
    ).toBe(false);
  });

  it('fails closed for past-due subscriptions until a grace policy is approved', () => {
    expect(
      subscriptionGrantsAccess(subscription({ status: 'PAST_DUE' }), now),
    ).toBe(false);
  });

  it('projects Plus capabilities independently of the provider', () => {
    const plan: BillingPlan = {
      id: 'plus-monthly',
      name: 'Plus',
      billingPeriod: 'MONTHLY',
      trialDays: 0,
      capabilities: [
        'UNLIMITED_SCANS',
        'PRODUCT_COMPARISON',
        'COMPLETE_HISTORY',
        'PERSONALIZED_PREGNANCY_MODE',
      ],
      monthlyScanLimit: null,
      amountMinor: null,
      currency: null,
      isPublic: true,
      isPurchasable: false,
    };

    expect(projectEntitlements(plan)).toEqual({
      scansRemaining: null,
      monthlyScansRemaining: null,
      unlimitedScans: true,
      productComparison: true,
      completeHistory: true,
      personalizedPregnancyMode: true,
    });
  });
});
