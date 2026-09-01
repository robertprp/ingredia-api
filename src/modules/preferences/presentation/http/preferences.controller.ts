import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import {
  AccountDeletionResponse,
  UserPreferencesResponse,
  deleteAccountSchema,
  updateUserPreferencesSchema,
} from '@ingredia/contracts';
import type {
  DeleteAccountRequest,
  UpdateUserPreferencesRequest,
} from '@ingredia/contracts';
import type { BetterAuth } from '../../../../common/auth/better-auth.type';
import { ContractValidationPipe } from '../../../../common/http/contract-validation.pipe';
import { UserPreferencesService } from '../../application/services/user-preferences.service';

@Controller('api/v1/me')
export class PreferencesController {
  constructor(private readonly preferences: UserPreferencesService) {}

  @Get('preferences')
  get(
    @Session() session: UserSession<BetterAuth>,
  ): Promise<UserPreferencesResponse> {
    return this.preferences.get(session.user.id);
  }

  @Patch('preferences')
  update(
    @Session() session: UserSession<BetterAuth>,
    @Body(new ContractValidationPipe(updateUserPreferencesSchema))
    body: UpdateUserPreferencesRequest,
  ): Promise<UserPreferencesResponse> {
    return this.preferences.update(session.user.id, body);
  }

  @Post('account-deletion')
  @HttpCode(202)
  requestDeletion(
    @Session() session: UserSession<BetterAuth>,
    @Body(new ContractValidationPipe(deleteAccountSchema))
    body: DeleteAccountRequest,
  ): Promise<AccountDeletionResponse> {
    void body;
    return this.preferences.requestDeletion(session.user.id);
  }
}
