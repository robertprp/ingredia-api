import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { EntitlementsResponse } from '@ingredia/contracts';
import type { BetterAuth } from '../../../../common/auth/better-auth.type';
import { GetUserEntitlementsService } from '../../application/services/get-user-entitlements.service';

@ApiTags('billing')
@Controller(['me', 'api/v1/me'])
export class EntitlementsController {
  constructor(private readonly getEntitlements: GetUserEntitlementsService) {}

  @Get('entitlements')
  @ApiOperation({ summary: "Project the authenticated user's capabilities" })
  @ApiOkResponse({
    schema: {
      example: {
        scansRemaining: null,
        monthlyScansRemaining: null,
        unlimitedScans: true,
        productComparison: true,
        completeHistory: true,
        personalizedPregnancyMode: true,
      },
    },
  })
  get(
    @Session() session: UserSession<BetterAuth>,
  ): Promise<EntitlementsResponse> {
    return this.getEntitlements.execute(session.user.id);
  }
}
