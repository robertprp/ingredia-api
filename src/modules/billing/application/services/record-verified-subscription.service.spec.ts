import { PurchaseOwnedByAnotherUserError } from '../../domain/billing.errors';
import {
  BillingPlan,
  BillingSubscription,
  VerifiedSubscriptionInput,
} from '../../domain/billing.types';
import { BillingRepositoryPort } from '../ports/billing.repository.port';
import { RecordVerifiedSubscriptionService } from './record-verified-subscription.service';

const input: VerifiedSubscriptionInput = {
  userId: 'user-2',
  planId: 'plus-monthly',
  provider: 'APPLE',
  environment: 'SANDBOX',
  externalPurchaseId: 'original-transaction-1',
  status: 'ACTIVE',
  currentPeriodStart: null,
  currentPeriodEnd: new Date('2026-09-30T00:00:00.000Z'),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  revokedAt: null,
};

class FakeBillingRepository implements BillingRepositoryPort {
  constructor(private readonly existing: BillingSubscription | null) {}

  findPublicPlans(): Promise<BillingPlan[]> {
    return Promise.resolve([]);
  }

  findPlanById(): Promise<BillingPlan | null> {
    return Promise.resolve(null);
  }

  findSubscriptionsForUser(): Promise<BillingSubscription[]> {
    return Promise.resolve([]);
  }

  findSubscriptionByPurchase(): Promise<BillingSubscription | null> {
    return Promise.resolve(this.existing);
  }

  saveVerifiedSubscription(
    verified: VerifiedSubscriptionInput,
  ): Promise<BillingSubscription> {
    return Promise.resolve({
      id: 'subscription-2',
      ...verified,
      updatedAt: new Date('2026-08-31T00:00:00.000Z'),
    });
  }
}

describe(RecordVerifiedSubscriptionService.name, () => {
  it("does not attach another user's verified purchase", async () => {
    const existing: BillingSubscription = {
      id: 'subscription-1',
      ...input,
      userId: 'user-1',
      updatedAt: new Date('2026-08-30T00:00:00.000Z'),
    };
    const service = new RecordVerifiedSubscriptionService(
      new FakeBillingRepository(existing),
    );

    await expect(service.execute(input)).rejects.toBeInstanceOf(
      PurchaseOwnedByAnotherUserError,
    );
  });
});
