import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PREFERENCES_REPOSITORY } from './application/ports/preferences.repository.port';
import { UserPreferencesService } from './application/services/user-preferences.service';
import { PrismaPreferencesRepository } from './infrastructure/persistence/prisma-preferences.repository';
import { PreferencesController } from './presentation/http/preferences.controller';

@Module({
  imports: [BillingModule],
  controllers: [PreferencesController],
  providers: [
    UserPreferencesService,
    PrismaPreferencesRepository,
    {
      provide: PREFERENCES_REPOSITORY,
      useExisting: PrismaPreferencesRepository,
    },
  ],
  exports: [UserPreferencesService],
})
export class PreferencesModule {}
