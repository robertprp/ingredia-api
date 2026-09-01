import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';

import { PrismaModule } from './common/prisma/prisma.module';
import { PrismaService } from './common/prisma/prisma.service';
import { createAuth } from './common/auth/auth.instance';
import { HealthModule } from './modules/health/health.module';
import { AdditivesModule } from './modules/additives/additives.module';
import { BillingModule } from './modules/billing/billing.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { AnalysesModule } from './modules/analyses/analyses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AdditivesModule,
    BillingModule,
    PreferencesModule,
    AnalysesModule,
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        auth: createAuth(prisma),
      }),
    }),
  ],
})
export class AppModule {}
