import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingClientPlatform,
  BillingDistributionChannel,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  RestoreMobilePurchasesRequest,
  SubscriptionProvider,
  UserSubscriptionResponse,
  VerifyMobilePurchaseRequest,
} from '@ingredia/contracts';
import { BILLING_PROVIDER } from '../ports/billing-provider.port';
import type {
  BillingProviderPort,
  ProviderSubscriptionState,
} from '../ports/billing-provider.port';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import { GetBillingEligibilityService } from './get-billing-eligibility.service';
import { GetUserSubscriptionService } from './get-user-subscription.service';
import { RecordVerifiedSubscriptionService } from './record-verified-subscription.service';

@Injectable()
export class BillingPurchasesService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
    @Inject(BILLING_PROVIDER)
    private readonly provider: BillingProviderPort,
    private readonly eligibility: GetBillingEligibilityService,
    private readonly recordVerified: RecordVerifiedSubscriptionService,
    private readonly getSubscription: GetUserSubscriptionService,
  ) {}

  async createStripeSubscription(
    userId: string,
    request: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    const decision = await this.eligibility.execute(userId, {
      platform: BillingClientPlatform.WEB,
      distributionChannel: BillingDistributionChannel.WEB_DIRECT,
    });
    if (
      !decision.purchaseAllowed ||
      decision.purchaseProvider !== SubscriptionProvider.STRIPE
    ) {
      throw new ForbiddenException('Stripe purchase is not eligible.');
    }
    this.assertReturnUrl(request.successUrl);
    this.assertReturnUrl(request.cancelUrl);
    const environment = this.environment();
    const [plan, reference] = await Promise.all([
      this.repository.findPlanById(request.planId),
      this.repository.findProductReference(
        request.planId,
        'STRIPE',
        environment,
      ),
    ]);
    if (!plan || !plan.isPublic) throw new NotFoundException('Plan not found.');
    if (!plan.isPurchasable || !reference) {
      throw new ForbiddenException(
        'The plan is not purchasable through Stripe.',
      );
    }
    return {
      url: await this.provider.createStripeCheckout({
        userId,
        planId: request.planId,
        priceId: reference.productId,
        successUrl: request.successUrl,
        cancelUrl: request.cancelUrl,
      }),
    };
  }

  async verifyMobile(
    userId: string,
    request: VerifyMobilePurchaseRequest,
  ): Promise<UserSubscriptionResponse> {
    const provider =
      request.provider === SubscriptionProvider.APPLE
        ? ('APPLE' as const)
        : ('GOOGLE_PLAY' as const);
    const environment = this.environment();
    const reference = await this.repository.findProductReference(
      request.planId,
      provider,
      environment,
    );
    if (!reference)
      throw new NotFoundException('Plan is unavailable for this provider.');
    const verified = await this.provider.verifyMobilePurchase({
      provider,
      planId: request.planId,
      productId: reference.productId,
      transactionToken: request.transactionToken,
    });
    if (
      verified.provider !== provider ||
      verified.planId !== request.planId ||
      verified.environment !== environment
    ) {
      throw new BadRequestException(
        'Verified purchase does not match the request.',
      );
    }
    await this.persist(userId, verified);
    return this.getSubscription.execute(userId);
  }

  async restore(
    userId: string,
    request: RestoreMobilePurchasesRequest,
  ): Promise<UserSubscriptionResponse> {
    const subscriptions = await this.provider.restoreMobilePurchases({
      provider: request.provider,
      userId,
    });
    for (const subscription of subscriptions) {
      if (subscription.userId !== userId) {
        throw new ForbiddenException('Restored purchase owner did not match.');
      }
      await this.persist(userId, subscription);
    }
    return this.getSubscription.execute(userId);
  }

  private persist(
    userId: string,
    state: ProviderSubscriptionState,
  ): Promise<unknown> {
    return this.recordVerified.execute({
      userId,
      planId: state.planId,
      provider: state.provider,
      environment: state.environment,
      externalPurchaseId: state.externalPurchaseId,
      status: state.status,
      currentPeriodStart: state.currentPeriodStart,
      currentPeriodEnd: state.currentPeriodEnd,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      canceledAt: state.canceledAt,
      revokedAt: state.revokedAt,
    });
  }

  private environment(): 'SANDBOX' | 'PRODUCTION' {
    return process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX';
  }

  private assertReturnUrl(value: string): void {
    const allowed = (process.env.BILLING_RETURN_URL_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const url = new URL(value);
    if (allowed.length === 0 || !allowed.includes(url.origin)) {
      throw new BadRequestException('Billing return URL is not trusted.');
    }
  }
}
