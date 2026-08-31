import { Inject, Injectable } from '@nestjs/common';
import { EntitlementsResponse } from '@ingredia/contracts';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import {
  projectEntitlements,
  selectEntitledSubscription,
} from '../../domain/entitlement-projector';
import { BillingPlan } from '../../domain/billing.types';

const CONSERVATIVE_FREE_PLAN: BillingPlan = {
  id: 'free',
  name: 'Free',
  billingPeriod: 'MONTHLY',
  trialDays: 0,
  capabilities: [],
  monthlyScanLimit: 0,
  amountMinor: 0,
  currency: null,
  isPublic: false,
  isPurchasable: false,
};

@Injectable()
export class GetUserEntitlementsService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
  ) {}

  async execute(
    userId: string,
    now = new Date(),
  ): Promise<EntitlementsResponse> {
    const subscriptions =
      await this.repository.findSubscriptionsForUser(userId);
    const entitledSubscription = selectEntitledSubscription(subscriptions, now);
    const plan = entitledSubscription
      ? await this.repository.findPlanById(entitledSubscription.planId)
      : ((await this.repository.findPlanById('free')) ??
        CONSERVATIVE_FREE_PLAN);

    return projectEntitlements(plan ?? CONSERVATIVE_FREE_PLAN);
  }
}
