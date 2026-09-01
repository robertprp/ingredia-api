import { Inject, Injectable } from '@nestjs/common';
import {
  BillingPlan as BillingPlanResponse,
  SubscriptionProvider,
} from '@ingredia/contracts';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';

@Injectable()
export class GetBillingPlansService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
  ) {}

  async execute(locale = 'en-US'): Promise<BillingPlanResponse[]> {
    const plans = await this.repository.findPublicPlans();
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      localizedPrice: this.localizePrice(
        plan.amountMinor,
        plan.currency,
        locale,
      ),
      billingPeriod: plan.billingPeriod,
      trialDays: plan.trialDays,
      capabilities: [...plan.capabilities],
      purchasable:
        plan.isPurchasable && (plan.productReferences?.length ?? 0) > 0,
      providerReferences: (plan.productReferences ?? []).map((reference) => ({
        provider: SubscriptionProvider[reference.provider],
        productId: reference.productId,
      })),
    }));
  }

  private localizePrice(
    amountMinor: number | null,
    currency: string | null,
    locale: string,
  ): string | null {
    if (amountMinor === null || currency === null) return null;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amountMinor / 100);
    } catch {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amountMinor / 100);
    }
  }
}
