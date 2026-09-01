import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  BillingProviderPort,
  ProviderSubscriptionState,
  VerifiedWebhook,
} from '../../application/ports/billing-provider.port';
import type { SubscriptionProvider } from '../../domain/billing.types';

@Injectable()
export class HttpBillingProviderAdapter implements BillingProviderPort {
  async createStripeCheckout(input: {
    userId: string;
    planId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret)
      throw new ServiceUnavailableException('Stripe is not configured.');
    const body = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': input.priceId,
      'line_items[0][quantity]': '1',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      'metadata[userId]': input.userId,
      'metadata[planId]': input.planId,
      'subscription_data[metadata][userId]': input.userId,
      'subscription_data[metadata][planId]': input.planId,
    });
    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload: unknown = await response.json();
    if (
      !response.ok ||
      !this.isRecord(payload) ||
      typeof payload.url !== 'string'
    ) {
      throw new ServiceUnavailableException('Stripe checkout is unavailable.');
    }
    return payload.url;
  }

  verifyMobilePurchase(input: {
    provider: 'APPLE' | 'GOOGLE_PLAY';
    planId: string;
    productId: string;
    transactionToken: string;
  }): Promise<ProviderSubscriptionState> {
    return this.callVerifier(input.provider, '/verify', input).then((payload) =>
      this.parseSubscription(payload, input.provider),
    );
  }

  async restoreMobilePurchases(input: {
    provider: 'APPLE' | 'GOOGLE_PLAY';
    userId: string;
  }): Promise<ProviderSubscriptionState[]> {
    const payload = await this.callVerifier(input.provider, '/restore', {
      userId: input.userId,
    });
    if (!this.isRecord(payload) || !Array.isArray(payload.subscriptions)) {
      throw new ServiceUnavailableException(
        'Purchase verifier returned invalid data.',
      );
    }
    return payload.subscriptions.map((value) =>
      this.parseSubscription(value, input.provider),
    );
  }

  async verifyWebhook(input: {
    provider: SubscriptionProvider;
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerifiedWebhook> {
    if (input.provider === 'STRIPE') return this.verifyStripeWebhook(input);
    const payload = await this.callVerifier(input.provider, '/webhook', {
      rawPayload: input.rawBody.toString('base64'),
      headers: input.headers,
    });
    if (
      !this.isRecord(payload) ||
      typeof payload.eventId !== 'string' ||
      !Array.isArray(payload.subscriptions)
    ) {
      throw new UnauthorizedException('Webhook verification failed.');
    }
    return {
      eventId: payload.eventId,
      subscriptions: payload.subscriptions.map((value) =>
        this.parseSubscription(value, input.provider),
      ),
    };
  }

  private verifyStripeWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerifiedWebhook> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signatureHeader = input.headers['stripe-signature'];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!secret || !signature) {
      throw new UnauthorizedException('Webhook verification failed.');
    }
    const parts = Object.fromEntries(
      signature
        .split(',')
        .map((part) => part.split('=', 2) as [string, string]),
    );
    const timestamp = parts.t;
    const expectedHex = parts.v1;
    if (!timestamp || !expectedHex) {
      throw new UnauthorizedException('Webhook verification failed.');
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      throw new UnauthorizedException(
        'Webhook timestamp is outside tolerance.',
      );
    }
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = createHmac('sha256', secret)
      .update(`${timestamp}.`)
      .update(input.rawBody)
      .digest();
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException('Webhook verification failed.');
    }
    const payload: unknown = JSON.parse(input.rawBody.toString('utf8'));
    if (!this.isRecord(payload) || typeof payload.id !== 'string') {
      throw new UnauthorizedException('Webhook payload is invalid.');
    }
    const data = this.isRecord(payload.data) ? payload.data : null;
    const object = data && this.isRecord(data.object) ? data.object : null;
    if (!object || object.object !== 'subscription') {
      return Promise.resolve({ eventId: payload.id, subscriptions: [] });
    }
    const metadata = this.isRecord(object.metadata) ? object.metadata : {};
    const userId = metadata.userId;
    const planId = metadata.planId;
    if (typeof userId !== 'string' || typeof planId !== 'string') {
      throw new UnauthorizedException(
        'Stripe subscription metadata is missing.',
      );
    }
    return Promise.resolve({
      eventId: payload.id,
      subscriptions: [
        this.parseSubscription(
          {
            ...object,
            userId,
            planId,
            externalPurchaseId: object.id,
            status: this.stripeStatus(object.status),
            environment: object.livemode ? 'PRODUCTION' : 'SANDBOX',
            currentPeriodStart: this.fromUnix(object.current_period_start),
            currentPeriodEnd: this.fromUnix(object.current_period_end),
            canceledAt: this.fromUnix(object.canceled_at),
            revokedAt: null,
            cancelAtPeriodEnd: object.cancel_at_period_end,
          },
          'STRIPE',
        ),
      ],
    });
  }

  private async callVerifier(
    provider: 'APPLE' | 'GOOGLE_PLAY',
    path: string,
    body: object,
  ): Promise<unknown> {
    const prefix = provider === 'APPLE' ? 'APPLE' : 'GOOGLE_PLAY';
    const baseUrl = process.env[`${prefix}_VERIFIER_URL`];
    const apiKey = process.env[`${prefix}_VERIFIER_API_KEY`];
    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        `${provider} verification is not configured.`,
      );
    }
    const response = await fetch(new URL(path, baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new UnauthorizedException('Provider verification failed.');
    }
    return response.json();
  }

  private parseSubscription(
    value: unknown,
    provider: SubscriptionProvider,
  ): ProviderSubscriptionState {
    if (!this.isRecord(value)) {
      throw new ServiceUnavailableException(
        'Provider returned invalid subscription data.',
      );
    }
    const statuses = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED'];
    if (
      typeof value.planId !== 'string' ||
      typeof value.externalPurchaseId !== 'string' ||
      !statuses.includes(String(value.status)) ||
      !['SANDBOX', 'PRODUCTION'].includes(String(value.environment))
    ) {
      throw new ServiceUnavailableException(
        'Provider returned invalid subscription data.',
      );
    }
    return {
      userId: typeof value.userId === 'string' ? value.userId : undefined,
      planId: value.planId,
      provider,
      environment: value.environment as 'SANDBOX' | 'PRODUCTION',
      externalPurchaseId: value.externalPurchaseId,
      status: value.status as ProviderSubscriptionState['status'],
      currentPeriodStart: this.toDate(value.currentPeriodStart),
      currentPeriodEnd: this.toDate(value.currentPeriodEnd),
      cancelAtPeriodEnd: value.cancelAtPeriodEnd === true,
      canceledAt: this.toDate(value.canceledAt),
      revokedAt: this.toDate(value.revokedAt),
    };
  }

  private toDate(value: unknown): Date | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new ServiceUnavailableException(
        'Provider returned an invalid date.',
      );
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ServiceUnavailableException(
        'Provider returned an invalid date.',
      );
    }
    return date;
  }

  private fromUnix(value: unknown): string | null {
    return typeof value === 'number'
      ? new Date(value * 1000).toISOString()
      : null;
  }

  private stripeStatus(value: unknown): ProviderSubscriptionState['status'] {
    if (value === 'trialing') return 'TRIALING';
    if (value === 'active') return 'ACTIVE';
    if (value === 'past_due' || value === 'unpaid' || value === 'paused') {
      return 'PAST_DUE';
    }
    if (value === 'canceled') return 'CANCELED';
    return 'EXPIRED';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
