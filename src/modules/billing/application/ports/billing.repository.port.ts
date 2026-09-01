import {
  BillingProductReference,
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
  getMonthlyScanUsage(userId: string, periodStart: Date): Promise<number>;
  findProductReference(
    planId: string,
    provider: SubscriptionProvider,
    environment: SubscriptionEnvironment,
  ): Promise<BillingProductReference | null>;
  getOrCreateAppStoreAccountToken(userId: string): Promise<string>;
  claimWebhookEvent(input: {
    id: string;
    provider: SubscriptionProvider;
    payloadHash: string;
  }): Promise<boolean>;
  completeWebhookEvent(id: string): Promise<void>;
}
