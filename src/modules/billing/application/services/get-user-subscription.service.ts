import { Inject, Injectable } from '@nestjs/common';
import {
  SubscriptionProvider,
  SubscriptionStatus,
  UserSubscriptionResponse,
} from '@ingredia/contracts';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import { BillingSubscription } from '../../domain/billing.types';

@Injectable()
export class GetUserSubscriptionService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
  ) {}

  async execute(userId: string): Promise<UserSubscriptionResponse> {
    const subscriptions =
      await this.repository.findSubscriptionsForUser(userId);
    const current = subscriptions[0] ?? null;
    if (current === null) {
      return {
        status: SubscriptionStatus.FREE,
        provider: null,
        planId: null,
        renewsAt: null,
        currentPeriodEndsAt: null,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      status: this.toStatus(current),
      provider: this.toProvider(current),
      planId: current.planId,
      renewsAt:
        current.cancelAtPeriodEnd || current.revokedAt !== null
          ? null
          : (current.currentPeriodEnd?.toISOString() ?? null),
      currentPeriodEndsAt: current.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: current.cancelAtPeriodEnd,
    };
  }

  private toStatus(subscription: BillingSubscription): SubscriptionStatus {
    return SubscriptionStatus[subscription.status];
  }

  private toProvider(subscription: BillingSubscription): SubscriptionProvider {
    return SubscriptionProvider[subscription.provider];
  }
}
