import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  RestorePurchaseProof,
  RestorePurchasesRequest,
  UserSubscriptionResponse,
  VerifyAppStoreTransactionRequest,
  VerifyGooglePlayPurchaseRequest,
} from '@ingredia/contracts';
import { SubscriptionProvider } from '@ingredia/contracts';
import { BILLING_PROVIDER } from '../ports/billing-provider.port';
import type {
  BillingProviderPort,
  ProviderSubscriptionState,
} from '../ports/billing-provider.port';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import type { SubscriptionEnvironment } from '../../domain/billing.types';
import { selectEntitledSubscription } from '../../domain/entitlement-projector';
import { GetUserSubscriptionService } from './get-user-subscription.service';
import { RecordVerifiedSubscriptionService } from './record-verified-subscription.service';

@Injectable()
export class BillingPurchasesService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
    @Inject(BILLING_PROVIDER)
    private readonly provider: BillingProviderPort,
    private readonly recordVerified: RecordVerifiedSubscriptionService,
    private readonly getSubscription: GetUserSubscriptionService,
  ) {}

  async createStripeSubscription(
    userId: string,
    request: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    const subscriptions =
      await this.repository.findSubscriptionsForUser(userId);
    if (selectEntitledSubscription(subscriptions, new Date()) !== null) {
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

  async verifyAppStore(
    userId: string,
    request: VerifyAppStoreTransactionRequest,
    idempotencyKey: string,
  ): Promise<UserSubscriptionResponse> {
    const appAccountToken =
      await this.repository.getOrCreateAppStoreAccountToken(userId);
    await this.verifyAndPersist({
      userId,
      provider: 'APPLE',
      planId: request.planId,
      transactionToken: request.signedTransactionInfo,
      appAccountToken,
      idempotencyKey,
    });
    return this.getSubscription.execute(userId);
  }

  async verifyGooglePlay(
    userId: string,
    request: VerifyGooglePlayPurchaseRequest,
    idempotencyKey: string,
  ): Promise<UserSubscriptionResponse> {
    const verified = await this.verifyAndPersist({
      userId,
      provider: 'GOOGLE_PLAY',
      planId: request.planId,
      transactionToken: request.purchaseToken,
      idempotencyKey,
    });
    if (verified.status !== 'PENDING') {
      await this.provider.acknowledgeGooglePlayPurchase({
        purchaseToken: request.purchaseToken,
        externalPurchaseId: verified.externalPurchaseId,
      });
    }
    return this.getSubscription.execute(userId);
  }

  async restore(
    userId: string,
    request: RestorePurchasesRequest,
    idempotencyKey: string,
  ): Promise<UserSubscriptionResponse> {
    const provider: 'APPLE' | 'GOOGLE_PLAY' =
      request.provider === SubscriptionProvider.APP_STORE
        ? 'APPLE'
        : 'GOOGLE_PLAY';
    const appAccountToken =
      provider === 'APPLE'
        ? await this.repository.getOrCreateAppStoreAccountToken(userId)
        : undefined;
    const verified = await Promise.all(
      request.purchases.map((purchase) =>
        this.verifyProof({
          userId,
          provider,
          purchase,
          appAccountToken,
          idempotencyKey,
        }),
      ),
    );
    for (const subscription of verified) {
      await this.persist(userId, subscription);
    }
    if (provider === 'GOOGLE_PLAY') {
      for (const [index, subscription] of verified.entries()) {
        if (subscription.status !== 'PENDING') {
          await this.provider.acknowledgeGooglePlayPurchase({
            purchaseToken: request.purchases[index].transactionToken,
            externalPurchaseId: subscription.externalPurchaseId,
          });
        }
      }
    }
    return this.getSubscription.execute(userId);
  }

  private async verifyAndPersist(input: {
    userId: string;
    provider: 'APPLE' | 'GOOGLE_PLAY';
    planId: string;
    transactionToken: string;
    appAccountToken?: string;
    idempotencyKey: string;
  }): Promise<ProviderSubscriptionState> {
    const verified = await this.verifyProof({
      ...input,
      purchase: {
        planId: input.planId,
        productReference: undefined,
        transactionToken: input.transactionToken,
      },
    });
    await this.persist(input.userId, verified);
    return verified;
  }

  private async verifyProof(input: {
    userId: string;
    provider: 'APPLE' | 'GOOGLE_PLAY';
    purchase: Omit<RestorePurchaseProof, 'productReference'> & {
      productReference?: string;
    };
    appAccountToken?: string;
    idempotencyKey: string;
  }): Promise<ProviderSubscriptionState> {
    const environment = this.environment();
    const reference = await this.repository.findProductReference(
      input.purchase.planId,
      input.provider,
      environment,
    );
    if (!reference) {
      throw new NotFoundException('Plan is unavailable for this provider.');
    }
    if (
      input.purchase.productReference !== undefined &&
      input.purchase.productReference !== reference.productId
    ) {
      throw new BadRequestException(
        'Purchase product reference does not match the configured plan.',
      );
    }
    const verified = await this.provider.verifyMobilePurchase({
      provider: input.provider,
      userId: input.userId,
      planId: input.purchase.planId,
      productId: reference.productId,
      transactionToken: input.purchase.transactionToken,
      appAccountToken: input.appAccountToken,
      idempotencyKey: input.idempotencyKey,
    });
    if (
      verified.provider !== input.provider ||
      verified.planId !== input.purchase.planId ||
      verified.environment !== environment
    ) {
      throw new BadRequestException(
        'Verified purchase does not match the request.',
      );
    }
    if (verified.userId !== undefined && verified.userId !== input.userId) {
      throw new ForbiddenException('Verified purchase owner did not match.');
    }
    return verified;
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

  private environment(): SubscriptionEnvironment {
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
