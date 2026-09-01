import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { billingEligibilityQuerySchema } from '@ingredia/contracts';
import type {
  BillingEligibilityQuery,
  BillingEligibilityResponse,
  BillingPlansResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  RestoreMobilePurchasesRequest,
  UserSubscriptionResponse,
  VerifyMobilePurchaseRequest,
} from '@ingredia/contracts';
import {
  createCheckoutSessionSchema,
  restoreMobilePurchasesSchema,
  verifyMobilePurchaseSchema,
} from '@ingredia/contracts';
import type { BetterAuth } from '../../../../common/auth/better-auth.type';
import { ContractValidationPipe } from '../../../../common/http/contract-validation.pipe';
import { GetBillingEligibilityService } from '../../application/services/get-billing-eligibility.service';
import { GetBillingPlansService } from '../../application/services/get-billing-plans.service';
import { GetUserSubscriptionService } from '../../application/services/get-user-subscription.service';
import { BillingPurchasesService } from '../../application/services/billing-purchases.service';

@ApiTags('billing')
@Controller(['billing', 'api/v1/billing'])
export class BillingController {
  constructor(
    private readonly getEligibility: GetBillingEligibilityService,
    private readonly getPlans: GetBillingPlansService,
    private readonly getSubscription: GetUserSubscriptionService,
    private readonly purchases: BillingPurchasesService,
  ) {}

  @Get('eligibility')
  @ApiOperation({
    summary: 'Resolve purchase, restore, and management actions for this build',
  })
  @ApiQuery({ name: 'platform', enum: ['WEB', 'IOS', 'ANDROID'] })
  @ApiQuery({
    name: 'distributionChannel',
    enum: ['WEB_DIRECT', 'APP_STORE', 'GOOGLE_PLAY'],
  })
  @ApiQuery({ name: 'storefront', required: false, example: 'ES' })
  @ApiOkResponse({
    schema: {
      example: {
        policyVersion: '2026-08-31-conservative-v1',
        purchaseAllowed: true,
        purchaseProvider: 'APPLE',
        purchaseAction: 'APP_STORE_PURCHASE',
        restoreAction: 'APP_STORE_RESTORE',
        managementAction: 'NONE',
        reason: 'ELIGIBLE',
      },
    },
  })
  eligibility(
    @Session() session: UserSession<BetterAuth>,
    @Query(new ContractValidationPipe(billingEligibilityQuerySchema))
    query: BillingEligibilityQuery,
  ): Promise<BillingEligibilityResponse> {
    return this.getEligibility.execute(session.user.id, query);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List public provider-neutral subscription plans' })
  @ApiOkResponse({
    schema: {
      example: {
        plans: [
          {
            id: 'plus-monthly',
            name: 'Plus',
            localizedPrice: null,
            billingPeriod: 'MONTHLY',
            trialDays: 0,
            capabilities: ['UNLIMITED_SCANS'],
            purchasable: false,
          },
        ],
      },
    },
  })
  async plans(): Promise<BillingPlansResponse> {
    return { plans: await this.getPlans.execute() };
  }

  @Get('subscription')
  @ApiOperation({ summary: "Read the authenticated user's subscription" })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'CANCELED',
        provider: 'APPLE',
        planId: 'plus-monthly',
        renewsAt: null,
        currentPeriodEndsAt: '2026-09-30T00:00:00.000Z',
        cancelAtPeriodEnd: true,
      },
    },
  })
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

  @Post('mobile-purchases/verify')
  verifyMobilePurchase(
    @Session() session: UserSession<BetterAuth>,
    @Body(new ContractValidationPipe(verifyMobilePurchaseSchema))
    body: VerifyMobilePurchaseRequest,
  ): Promise<UserSubscriptionResponse> {
    return this.purchases.verifyMobile(session.user.id, body);
  }

  @Post('restore')
  restore(
    @Session() session: UserSession<BetterAuth>,
    @Body(new ContractValidationPipe(restoreMobilePurchasesSchema))
    body: RestoreMobilePurchasesRequest,
  ): Promise<UserSubscriptionResponse> {
    return this.purchases.restore(session.user.id, body);
  }
}
