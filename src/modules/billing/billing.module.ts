import { Module } from '@nestjs/common';
import { BILLING_REPOSITORY } from './application/ports/billing.repository.port';
import { GetBillingEligibilityService } from './application/services/get-billing-eligibility.service';
import { GetBillingPlansService } from './application/services/get-billing-plans.service';
import { GetUserEntitlementsService } from './application/services/get-user-entitlements.service';
import { GetUserSubscriptionService } from './application/services/get-user-subscription.service';
import { RecordVerifiedSubscriptionService } from './application/services/record-verified-subscription.service';
import { PrismaBillingRepository } from './infrastructure/persistence/prisma-billing.repository';
import { BillingController } from './presentation/http/billing.controller';
import { EntitlementsController } from './presentation/http/entitlements.controller';
import { BillingPurchasesService } from './application/services/billing-purchases.service';
import { BillingWebhooksService } from './application/services/billing-webhooks.service';
import { BILLING_PROVIDER } from './application/ports/billing-provider.port';
import { HttpBillingProviderAdapter } from './infrastructure/providers/http-billing-provider.adapter';
import { BillingWebhooksController } from './presentation/http/billing-webhooks.controller';

@Module({
  controllers: [
    BillingController,
    EntitlementsController,
    BillingWebhooksController,
  ],
  providers: [
    GetBillingEligibilityService,
    GetBillingPlansService,
    GetUserEntitlementsService,
    GetUserSubscriptionService,
    RecordVerifiedSubscriptionService,
    BillingPurchasesService,
    BillingWebhooksService,
    HttpBillingProviderAdapter,
    PrismaBillingRepository,
    {
      provide: BILLING_REPOSITORY,
      useExisting: PrismaBillingRepository,
    },
    {
      provide: BILLING_PROVIDER,
      useExisting: HttpBillingProviderAdapter,
    },
  ],
  exports: [GetUserEntitlementsService, RecordVerifiedSubscriptionService],
})
export class BillingModule {}
