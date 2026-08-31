import { Inject, Injectable } from '@nestjs/common';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import { PurchaseOwnedByAnotherUserError } from '../../domain/billing.errors';
import {
  BillingSubscription,
  VerifiedSubscriptionInput,
} from '../../domain/billing.types';

@Injectable()
export class RecordVerifiedSubscriptionService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
  ) {}

  async execute(
    input: VerifiedSubscriptionInput,
  ): Promise<BillingSubscription> {
    const existing = await this.repository.findSubscriptionByPurchase(
      input.provider,
      input.environment,
      input.externalPurchaseId,
    );
    if (existing !== null && existing.userId !== input.userId) {
      throw new PurchaseOwnedByAnotherUserError();
    }
    return this.repository.saveVerifiedSubscription(input);
  }
}
