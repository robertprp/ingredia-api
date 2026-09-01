import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { BILLING_PROVIDER } from '../ports/billing-provider.port';
import type { BillingProviderPort } from '../ports/billing-provider.port';
import { BILLING_REPOSITORY } from '../ports/billing.repository.port';
import type { BillingRepositoryPort } from '../ports/billing.repository.port';
import type { SubscriptionProvider } from '../../domain/billing.types';
import { RecordVerifiedSubscriptionService } from './record-verified-subscription.service';

@Injectable()
export class BillingWebhooksService {
  constructor(
    @Inject(BILLING_REPOSITORY)
    private readonly repository: BillingRepositoryPort,
    @Inject(BILLING_PROVIDER)
    private readonly provider: BillingProviderPort,
    private readonly recordVerified: RecordVerifiedSubscriptionService,
  ) {}

  async process(input: {
    provider: SubscriptionProvider;
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<void> {
    const verified = await this.provider.verifyWebhook(input);
    const claimed = await this.repository.claimWebhookEvent({
      id: `${input.provider}:${verified.eventId}`,
      provider: input.provider,
      payloadHash: createHash('sha256').update(input.rawBody).digest('hex'),
    });
    if (!claimed) return;
    for (const state of verified.subscriptions) {
      if (!state.userId) continue;
      await this.recordVerified.execute({
        userId: state.userId,
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
    await this.repository.completeWebhookEvent(
      `${input.provider}:${verified.eventId}`,
    );
  }
}
