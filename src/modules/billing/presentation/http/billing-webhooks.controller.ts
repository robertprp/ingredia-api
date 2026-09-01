import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { BillingWebhooksService } from '../../application/services/billing-webhooks.service';

type RawRequest = Request & { rawBody?: Buffer };

@AllowAnonymous()
@Controller('api/v1/webhooks')
export class BillingWebhooksController {
  constructor(private readonly webhooks: BillingWebhooksService) {}

  @Post('stripe')
  @HttpCode(204)
  stripe(
    @Req() request: RawRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    return this.webhooks.process({
      provider: 'STRIPE',
      rawBody: request.rawBody ?? Buffer.alloc(0),
      headers,
    });
  }

  @Post('app-store')
  @HttpCode(204)
  appStore(
    @Req() request: RawRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    return this.webhooks.process({
      provider: 'APPLE',
      rawBody: request.rawBody ?? Buffer.alloc(0),
      headers,
    });
  }

  @Post('google-play')
  @HttpCode(204)
  googlePlay(
    @Req() request: RawRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    return this.webhooks.process({
      provider: 'GOOGLE_PLAY',
      rawBody: request.rawBody ?? Buffer.alloc(0),
      headers,
    });
  }
}
