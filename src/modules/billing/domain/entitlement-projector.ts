import {
  billingCapabilities,
  BillingPlan,
  BillingSubscription,
} from './billing.types';

export interface EntitlementProjection {
  scansRemaining: number | null;
  monthlyScansRemaining: number | null;
  unlimitedScans: boolean;
  productComparison: boolean;
  completeHistory: boolean;
  personalizedPregnancyMode: boolean;
}

export function subscriptionGrantsAccess(
  subscription: BillingSubscription,
  now: Date,
): boolean {
  if (subscription.revokedAt !== null) return false;
  if (
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd.getTime() <= now.getTime()
  ) {
    return false;
  }

  if (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING') {
    return true;
  }

  return (
    subscription.status === 'CANCELED' &&
    subscription.cancelAtPeriodEnd &&
    subscription.currentPeriodEnd !== null
  );
}

export function selectEntitledSubscription(
  subscriptions: BillingSubscription[],
  now: Date,
): BillingSubscription | null {
  return (
    subscriptions
      .filter((subscription) => subscriptionGrantsAccess(subscription, now))
      .sort((left, right) => {
        const leftEnd =
          left.currentPeriodEnd?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightEnd =
          right.currentPeriodEnd?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return rightEnd - leftEnd;
      })[0] ?? null
  );
}

export function projectEntitlements(plan: BillingPlan): EntitlementProjection {
  const capabilities = new Set(plan.capabilities);
  const unlimitedScans = capabilities.has(billingCapabilities.unlimitedScans);
  const scansRemaining = unlimitedScans ? null : plan.monthlyScanLimit;

  return {
    scansRemaining,
    monthlyScansRemaining: scansRemaining,
    unlimitedScans,
    productComparison: capabilities.has(billingCapabilities.productComparison),
    completeHistory: capabilities.has(billingCapabilities.completeHistory),
    personalizedPregnancyMode: capabilities.has(
      billingCapabilities.personalizedPregnancyMode,
    ),
  };
}
