import { Module } from '@nestjs/common';
import { AdditivesModule } from '../additives/additives.module';
import { BillingModule } from '../billing/billing.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { ANALYSIS_REPOSITORY } from './application/ports/analysis.repository.port';
import { OCR_PORT } from './application/ports/ocr.port';
import { AnalysesService } from './application/services/analyses.service';
import { ComparisonsService } from './application/services/comparisons.service';
import { ScanProcessorService } from './application/services/scan-processor.service';
import { ScansService } from './application/services/scans.service';
import { GoogleVisionOcrAdapter } from './infrastructure/ocr/google-vision-ocr.adapter';
import { PrismaAnalysisRepository } from './infrastructure/persistence/prisma-analysis.repository';
import {
  AnalysesController,
  ComparisonsController,
  ScansController,
} from './presentation/http/analyses.controller';

@Module({
  imports: [AdditivesModule, BillingModule, PreferencesModule],
  controllers: [ScansController, AnalysesController, ComparisonsController],
  providers: [
    ScansService,
    ScanProcessorService,
    AnalysesService,
    ComparisonsService,
    PrismaAnalysisRepository,
    GoogleVisionOcrAdapter,
    { provide: ANALYSIS_REPOSITORY, useExisting: PrismaAnalysisRepository },
    { provide: OCR_PORT, useExisting: GoogleVisionOcrAdapter },
  ],
})
export class AnalysesModule {}
