import { Inject, Injectable } from '@nestjs/common';
import {
  BillingEligibilityReason,
  BillingManagementAction,
  BillingPurchaseAction,
  BillingRestoreAction,
  SubscriptionProvider,
} from '@ingredia/contracts';
import type {
  BillingEligibilityQuery,
  BillingEligibilityResponse,
} from '@ingredia/contracts';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import { decideBillingPolicy } from '../../domain/billing-policy';
import { selectEntitledSubscription } from '../../domain/entitlement-projector';

@Injectable()
export class GetBillingEligibilityService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
  ) {}

  async execute(
    userId: string,
    query: BillingEligibilityQuery,
    now = new Date(),
  ): Promise<BillingEligibilityResponse> {
    const subscriptions =
      await this.repository.findSubscriptionsForUser(userId);
    const decision = decideBillingPolicy({
      platform: query.platform,
      distributionChannel: query.distributionChannel,
      entitledSubscription: selectEntitledSubscription(subscriptions, now),
      currentSubscription: subscriptions[0] ?? null,
    });
    return {
      ...decision,
      purchaseProvider:
        decision.purchaseProvider === null
          ? null
          : SubscriptionProvider[decision.purchaseProvider],
      purchaseAction: BillingPurchaseAction[decision.purchaseAction],
      restoreAction: BillingRestoreAction[decision.restoreAction],
      managementAction: BillingManagementAction[decision.managementAction],
      reason: BillingEligibilityReason[decision.reason],
    };
  }
}
