import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  PreferencesRepositoryPort,
  UserPreferences,
} from '../../application/ports/preferences.repository.port';

@Injectable()
export class PrismaPreferencesRepository implements PreferencesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<UserPreferences> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { pregnancyMode: true, riskAlerts: true, locale: true },
    });
  }

  async update(
    userId: string,
    changes: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: changes,
      create: { userId, ...changes },
      select: { pregnancyMode: true, riskAlerts: true, locale: true },
    });
  }

  async requestAccountDeletion(
    userId: string,
    scheduledAt: Date,
  ): Promise<Date> {
    const request = await this.prisma.accountDeletionRequest.upsert({
      where: { userId },
      update: {},
      create: { userId, scheduledAt },
      select: { scheduledAt: true },
    });
    return request.scheduledAt;
  }
}
