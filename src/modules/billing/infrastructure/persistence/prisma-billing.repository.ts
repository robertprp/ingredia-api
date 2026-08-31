import { Injectable } from '@nestjs/common';
import {
  billingPlan as PrismaBillingPlan,
  billingSubscription as PrismaBillingSubscription,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { BillingRepositoryPort } from '../../application/ports/billing.repository.port';
import { PurchaseOwnedByAnotherUserError } from '../../domain/billing.errors';
import {
  BillingPlan,
  BillingSubscription,
  SubscriptionEnvironment,
  SubscriptionProvider,
  VerifiedSubscriptionInput,
} from '../../domain/billing.types';

@Injectable()
export class PrismaBillingRepository implements BillingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicPlans(): Promise<BillingPlan[]> {
    const plans = await this.prisma.billingPlan.findMany({
      where: { isPublic: true },
      orderBy: [{ billingPeriod: 'asc' }, { id: 'asc' }],
    });
    return plans.map((plan) => this.toPlan(plan));
  }

  async findPlanById(planId: string): Promise<BillingPlan | null> {
    const plan = await this.prisma.billingPlan.findUnique({
      where: { id: planId },
    });
    return plan ? this.toPlan(plan) : null;
  }

  async findSubscriptionsForUser(
    userId: string,
  ): Promise<BillingSubscription[]> {
    const subscriptions = await this.prisma.billingSubscription.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return subscriptions.map((subscription) =>
      this.toSubscription(subscription),
    );
  }

  async findSubscriptionByPurchase(
    provider: SubscriptionProvider,
    environment: SubscriptionEnvironment,
    externalPurchaseId: string,
  ): Promise<BillingSubscription | null> {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: {
        provider_environment_externalPurchaseId: {
          provider,
          environment,
          externalPurchaseId,
        },
      },
    });
    return subscription ? this.toSubscription(subscription) : null;
  }

  async saveVerifiedSubscription(
    input: VerifiedSubscriptionInput,
  ): Promise<BillingSubscription> {
    try {
      const subscription = await this.prisma.$transaction(
        async (transaction) => {
          const existing = await transaction.billingSubscription.findUnique({
            where: {
              provider_environment_externalPurchaseId: {
                provider: input.provider,
                environment: input.environment,
                externalPurchaseId: input.externalPurchaseId,
              },
            },
          });

          if (existing !== null && existing.userId !== input.userId) {
            throw new PurchaseOwnedByAnotherUserError();
          }

          const data = {
            planId: input.planId,
            status: input.status,
            currentPeriodStart: input.currentPeriodStart,
            currentPeriodEnd: input.currentPeriodEnd,
            cancelAtPeriodEnd: input.cancelAtPeriodEnd,
            canceledAt: input.canceledAt,
            revokedAt: input.revokedAt,
          };

          return existing
            ? transaction.billingSubscription.update({
                where: { id: existing.id },
                data,
              })
            : transaction.billingSubscription.create({
                data: {
                  ...data,
                  userId: input.userId,
                  provider: input.provider,
                  environment: input.environment,
                  externalPurchaseId: input.externalPurchaseId,
                  updatedAt: new Date(),
                },
              });
        },
        { isolationLevel: 'Serializable' },
      );
      return this.toSubscription(subscription);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        const owner = await this.findSubscriptionByPurchase(
          input.provider,
          input.environment,
          input.externalPurchaseId,
        );
        if (owner !== null && owner.userId !== input.userId) {
          throw new PurchaseOwnedByAnotherUserError();
        }
      }
      throw error;
    }
  }

  private toPlan(plan: PrismaBillingPlan): BillingPlan {
    return {
      id: plan.id,
      name: plan.name,
      billingPeriod: plan.billingPeriod,
      trialDays: plan.trialDays,
      capabilities: [...plan.capabilities],
      monthlyScanLimit: plan.monthlyScanLimit,
      amountMinor: plan.amountMinor,
      currency: plan.currency,
      isPublic: plan.isPublic,
      isPurchasable: plan.isPurchasable,
    };
  }

  private toSubscription(
    subscription: PrismaBillingSubscription,
  ): BillingSubscription {
    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      provider: subscription.provider,
      environment: subscription.environment,
      externalPurchaseId: subscription.externalPurchaseId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      revokedAt: subscription.revokedAt,
      updatedAt: subscription.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
