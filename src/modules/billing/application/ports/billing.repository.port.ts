import {
  BillingPlan,
  BillingSubscription,
  SubscriptionEnvironment,
  SubscriptionProvider,
  VerifiedSubscriptionInput,
} from '../../domain/billing.types';

export const BILLING_REPOSITORY = Symbol('BILLING_REPOSITORY');

export interface BillingRepositoryPort {
  findPublicPlans(): Promise<BillingPlan[]>;
  findPlanById(planId: string): Promise<BillingPlan | null>;
  findSubscriptionsForUser(userId: string): Promise<BillingSubscription[]>;
  findSubscriptionByPurchase(
    provider: SubscriptionProvider,
    environment: SubscriptionEnvironment,
    externalPurchaseId: string,
  ): Promise<BillingSubscription | null>;
  saveVerifiedSubscription(
    input: VerifiedSubscriptionInput,
  ): Promise<BillingSubscription>;
}
