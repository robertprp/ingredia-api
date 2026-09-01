import { Inject, Injectable } from '@nestjs/common';
import {
  BillingChannel,
  BillingEligibilityHeaders,
  BillingEligibilityPlan,
  BillingEligibilityReasonCode,
  BillingEligibilityResponse,
  BillingPriceSource,
} from '@ingredia/contracts';
import { BILLING_PROVIDER } from '../ports/billing-provider.port';
import type { BillingProviderPort } from '../ports/billing-provider.port';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import { decideBillingPolicy } from '../../domain/billing-policy';
import { selectEntitledSubscription } from '../../domain/entitlement-projector';
import type {
  BillingPlan,
  SubscriptionProvider as InternalProvider,
} from '../../domain/billing.types';

@Injectable()
export class GetBillingEligibilityService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
    @Inject(BILLING_PROVIDER)
    private readonly provider: BillingProviderPort,
  ) {}

  async execute(
    userId: string,
    headers: BillingEligibilityHeaders,
    now = new Date(),
  ): Promise<BillingEligibilityResponse> {
    const [subscriptions, plans] = await Promise.all([
      this.repository.findSubscriptionsForUser(userId),
      this.repository.findPublicPlans(),
    ]);
    const decision = decideBillingPolicy({
      platform: headers.platform,
      distribution: headers.distribution,
      entitledSubscription: selectEntitledSubscription(subscriptions, now),
      currentSubscription: subscriptions[0] ?? null,
    });
    const response: BillingEligibilityResponse = {
      channel: BillingChannel[decision.channel],
      reasonCode: BillingEligibilityReasonCode[decision.reasonCode],
      policyVersion: decision.policyVersion,
      plans: decision.purchaseAllowed
        ? await this.eligiblePlans(plans, decision.channel, headers.storefront)
        : [],
      restoreSupported: decision.restoreSupported,
      managementChannel: BillingChannel[decision.managementChannel],
    };
    if (decision.channel === 'APP_STORE') {
      response.appAccountToken =
        await this.repository.getOrCreateAppStoreAccountToken(userId);
    }
    return response;
  }

  private async eligiblePlans(
    plans: BillingPlan[],
    channel: 'STRIPE' | 'APP_STORE' | 'GOOGLE_PLAY',
    storefront: string,
  ): Promise<BillingEligibilityPlan[]> {
    const internalProvider: InternalProvider =
      channel === 'APP_STORE' ? 'APPLE' : channel;
    const eligible = plans.flatMap((plan) => {
      const reference = plan.productReferences?.find(
        (candidate) => candidate.provider === internalProvider,
      );
      return plan.isPublic && plan.isPurchasable && reference
        ? [{ plan, reference }]
        : [];
    });
    return Promise.all(
      eligible.map(async ({ plan, reference }) => {
        if (channel !== 'STRIPE') {
          return {
            planId: plan.id,
            productReference: reference.productId,
            displayPrice: null,
            displayPriceSource: BillingPriceSource.STORE,
          };
        }
        const price = await this.provider.getStripePrice(reference.productId);
        return {
          planId: plan.id,
          productReference: reference.productId,
          displayPrice: this.formatPrice(
            price.amountMinor,
            price.currency,
            storefront,
          ),
          displayPriceSource: BillingPriceSource.SERVER,
          currency: price.currency,
          amountMinor: price.amountMinor,
        };
      }),
    );
  }

  private formatPrice(
    amountMinor: number,
    currency: string,
    storefront: string,
  ): string {
    const locale = storefront === 'ES' ? 'es-ES' : `en-${storefront}`;
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      });
      const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
      return formatter.format(amountMinor / 10 ** exponent);
    } catch {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      });
      const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
      return formatter.format(amountMinor / 10 ** exponent);
    }
  }
}
