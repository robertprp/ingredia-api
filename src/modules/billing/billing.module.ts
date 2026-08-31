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

@Module({
  controllers: [BillingController, EntitlementsController],
  providers: [
    GetBillingEligibilityService,
    GetBillingPlansService,
    GetUserEntitlementsService,
    GetUserSubscriptionService,
    RecordVerifiedSubscriptionService,
    PrismaBillingRepository,
    {
      provide: BILLING_REPOSITORY,
      useExisting: PrismaBillingRepository,
    },
  ],
  exports: [RecordVerifiedSubscriptionService],
})
export class BillingModule {}
