import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  AccountDeletionResponse,
  EntitlementsResponse,
  UpdateUserPreferencesRequest,
  UserPreferencesResponse,
} from '@ingredia/contracts';
import { GetUserEntitlementsService } from '../../../billing/application/services/get-user-entitlements.service';
import { PREFERENCES_REPOSITORY } from '../ports/preferences.repository.port';
import type {
  PreferencesRepositoryPort,
  UserPreferences,
} from '../ports/preferences.repository.port';

@Injectable()
export class UserPreferencesService {
  constructor(
    @Inject(PREFERENCES_REPOSITORY)
    private readonly repository: PreferencesRepositoryPort,
    private readonly getEntitlements: GetUserEntitlementsService,
  ) {}

  get(userId: string): Promise<UserPreferencesResponse> {
    return this.repository.getOrCreate(userId);
  }

  async update(
    userId: string,
    changes: UpdateUserPreferencesRequest,
  ): Promise<UserPreferencesResponse> {
    if (changes.pregnancyMode === true) {
      const entitlements = await this.getEntitlements.execute(userId);
      if (!entitlements.personalizedPregnancyMode) {
        throw new ForbiddenException(
          'Personalized pregnancy mode is not included in the current plan.',
        );
      }
    }
    return this.repository.update(userId, changes);
  }

  async effective(
    userId: string,
    entitlements?: EntitlementsResponse,
  ): Promise<UserPreferences> {
    const [preferences, access] = await Promise.all([
      this.repository.getOrCreate(userId),
      entitlements
        ? Promise.resolve(entitlements)
        : this.getEntitlements.execute(userId),
    ]);
    return {
      ...preferences,
      pregnancyMode:
        preferences.pregnancyMode && access.personalizedPregnancyMode,
    };
  }

  async requestDeletion(
    userId: string,
    now = new Date(),
  ): Promise<AccountDeletionResponse> {
    const scheduledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const persisted = await this.repository.requestAccountDeletion(
      userId,
      scheduledAt,
    );
    return { scheduledAt: persisted.toISOString() };
  }
}
