import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  billingEligibilityHeadersSchema,
  createCheckoutSessionSchema,
  idempotencyHeadersSchema,
  restorePurchasesSchema,
  verifyAppStoreTransactionSchema,
  verifyGooglePlayPurchaseSchema,
} from '@ingredia/contracts';
import type {
  BillingEligibilityHeaders,
  BillingEligibilityResponse,
  BillingPlansResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  IdempotencyHeaders,
  RestorePurchasesRequest,
  UserSubscriptionResponse,
  VerifyAppStoreTransactionRequest,
  VerifyGooglePlayPurchaseRequest,
} from '@ingredia/contracts';
import type { BetterAuth } from '../../../../common/auth/better-auth.type';
import { ContractValidationPipe } from '../../../../common/http/contract-validation.pipe';
import { ContractHeaders } from '../../../../common/http/contract-headers.decorator';
import { GetBillingEligibilityService } from '../../application/services/get-billing-eligibility.service';
import { GetBillingPlansService } from '../../application/services/get-billing-plans.service';
import { GetUserSubscriptionService } from '../../application/services/get-user-subscription.service';
import { BillingPurchasesService } from '../../application/services/billing-purchases.service';

@ApiTags('billing')
@Controller('api/v1/billing')
export class BillingController {
  constructor(
    private readonly getEligibility: GetBillingEligibilityService,
    private readonly getPlans: GetBillingPlansService,
    private readonly getSubscription: GetUserSubscriptionService,
    private readonly purchases: BillingPurchasesService,
  ) {}

  @Get('eligibility')
  @ApiOperation({ summary: 'Resolve the server-owned billing channel' })
  @ApiHeader({ name: 'X-Ingredia-Platform', enum: ['IOS', 'ANDROID', 'WEB'] })
  @ApiHeader({
    name: 'X-Ingredia-Distribution',
    enum: ['APP_STORE', 'GOOGLE_PLAY', 'DIRECT', 'WEB'],
  })
  @ApiHeader({ name: 'X-Ingredia-Storefront', example: 'ES' })
  @ApiHeader({ name: 'X-Ingredia-App-Build', example: 101 })
  @ApiOkResponse({
    schema: {
      example: {
        channel: 'APP_STORE',
        reasonCode: 'APP_STORE_DIGITAL_FEATURES',
        policyVersion: '2026-08-31.1',
        plans: [
          {
            planId: 'INGREDIA_PLUS_MONTHLY',
            productReference: 'com.ingredia.plus.monthly',
            displayPrice: null,
            displayPriceSource: 'STORE',
          },
        ],
        restoreSupported: true,
        managementChannel: 'APP_STORE',
        appAccountToken: 'f62e7b69-1db4-4b26-9b79-7fd445ad1d64',
      },
    },
  })
  eligibility(
    @Session() session: UserSession<BetterAuth>,
    @ContractHeaders(billingEligibilityHeadersSchema)
    headers: BillingEligibilityHeaders,
  ): Promise<BillingEligibilityResponse> {
    return this.getEligibility.execute(session.user.id, headers);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List public provider-neutral subscription plans' })
  plans(): Promise<BillingPlansResponse> {
    return this.getPlans.execute().then((plans) => ({ plans }));
  }

  @Get('subscription')
  @ApiOperation({ summary: "Read the authenticated user's subscription" })
  subscription(
    @Session() session: UserSession<BetterAuth>,
  ): Promise<UserSubscriptionResponse> {
    return this.getSubscription.execute(session.user.id);
  }

  @Post('stripe/subscriptions')
  createStripeSubscription(
    @Session() session: UserSession<BetterAuth>,
    @Body(new ContractValidationPipe(createCheckoutSessionSchema))
    body: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    return this.purchases.createStripeSubscription(session.user.id, body);
  }

  @Post('app-store/transactions/verify')
  @ApiHeader({ name: 'Idempotency-Key', description: 'UUID' })
  verifyAppStoreTransaction(
    @Session() session: UserSession<BetterAuth>,
    @ContractHeaders(idempotencyHeadersSchema)
    headers: IdempotencyHeaders,
    @Body(new ContractValidationPipe(verifyAppStoreTransactionSchema))
    body: VerifyAppStoreTransactionRequest,
  ): Promise<UserSubscriptionResponse> {
    return this.purchases.verifyAppStore(
      session.user.id,
      body,
      headers.idempotencyKey,
    );
  }

  @Post('google-play/purchases/verify')
  @ApiHeader({ name: 'Idempotency-Key', description: 'UUID' })
  verifyGooglePlayPurchase(
    @Session() session: UserSession<BetterAuth>,
    @ContractHeaders(idempotencyHeadersSchema)
    headers: IdempotencyHeaders,
    @Body(new ContractValidationPipe(verifyGooglePlayPurchaseSchema))
    body: VerifyGooglePlayPurchaseRequest,
  ): Promise<UserSubscriptionResponse> {
    return this.purchases.verifyGooglePlay(
      session.user.id,
      body,
      headers.idempotencyKey,
    );
  }

  @Post('restore')
  @ApiHeader({ name: 'Idempotency-Key', description: 'UUID' })
  restore(
    @Session() session: UserSession<BetterAuth>,
    @ContractHeaders(idempotencyHeadersSchema)
    headers: IdempotencyHeaders,
    @Body(new ContractValidationPipe(restorePurchasesSchema))
    body: RestorePurchasesRequest,
  ): Promise<UserSubscriptionResponse> {
    return this.purchases.restore(
      session.user.id,
      body,
      headers.idempotencyKey,
    );
  }
}
