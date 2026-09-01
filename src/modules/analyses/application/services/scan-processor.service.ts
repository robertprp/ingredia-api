import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DetectedAdditive,
  PregnancyStatus,
  ProductRiskLevel,
  ToxicityLevel,
  UnrecognizedIngredientReason,
} from '@ingredia/contracts';
import { AnalyzeIngredientsService } from '../../../additives/application/services/analyze-ingredients.service';
import { UserPreferencesService } from '../../../preferences/application/services/user-preferences.service';
import { ANALYSIS_REPOSITORY } from '../ports/analysis.repository.port';
import type { AnalysisRepositoryPort } from '../ports/analysis.repository.port';
import { OCR_PORT } from '../ports/ocr.port';
import type { OcrPort } from '../ports/ocr.port';
import {
  ImageUpload,
  NewAnalysis,
  OcrFailureError,
} from '../../domain/analysis.types';

@Injectable()
export class ScanProcessorService {
  private readonly logger = new Logger(ScanProcessorService.name);

  constructor(
    @Inject(ANALYSIS_REPOSITORY)
    private readonly repository: AnalysisRepositoryPort,
    @Inject(OCR_PORT) private readonly ocr: OcrPort,
    private readonly analyzeIngredients: AnalyzeIngredientsService,
    private readonly preferences: UserPreferencesService,
  ) {}

  async process(input: {
    userId: string;
    scanId: string;
    image: ImageUpload;
    requestedProductName: string | null;
  }): Promise<void> {
    try {
      await this.repository.markScanProcessing(input.userId, input.scanId);
      const [ocr, preferences] = await Promise.all([
        this.ocr.recognize(input.image),
        this.preferences.effective(input.userId),
      ]);
      const result = await this.analyzeIngredients.execute({
        ingredients: ocr.ingredientsText,
        isPregnant: preferences.pregnancyMode,
      });
      const productName =
        input.requestedProductName ?? ocr.productName ?? 'Producto sin nombre';
      const analysis = this.toAnalysis(
        productName,
        ocr.ingredientsText,
        preferences.pregnancyMode,
        result,
      );
      await this.repository.completeScan(
        input.userId,
        input.scanId,
        {
          ingredientsText: ocr.ingredientsText,
          productName,
          confidence: ocr.confidence,
        },
        analysis,
      );
    } catch (error: unknown) {
      const failure =
        error instanceof OcrFailureError
          ? {
              code: error.code,
              message: error.message,
              retryable: error.retryable,
            }
          : {
              code: 'ANALYSIS_FAILED',
              message: 'The label analysis failed.',
              retryable: true,
            };
      this.logger.warn(
        `Scan ${input.scanId} failed [${failure.code}]: ${failure.message}`,
      );
      await this.repository.failScan(input.userId, input.scanId, {
        code: failure.code,
        message: failure.message,
        retryable: failure.retryable,
      });
    }
  }

  private toAnalysis(
    productName: string,
    ingredientsText: string,
    pregnancyMode: boolean,
    result: Awaited<ReturnType<AnalyzeIngredientsService['execute']>>,
  ): NewAnalysis {
    const detectedAdditives: DetectedAdditive[] = result.detectedAdditives.map(
      (additive) => ({
        code: additive.eNumber as DetectedAdditive['code'],
        name: additive.name,
        toxicityLevel: ToxicityLevel[additive.toxicityLevel],
        pregnancyStatus:
          additive.pregnancySuitability === 'SUITABLE'
            ? PregnancyStatus.SUITABLE
            : additive.pregnancySuitability === 'NOT_SUITABLE'
              ? PregnancyStatus.NOT_SUITABLE
              : PregnancyStatus.INSUFFICIENT_EVIDENCE,
        pregnancyReason: additive.pregnancyRationale,
      }),
    );
    const risk = this.overallRisk(detectedAdditives);
    const pregnancyRisk = pregnancyMode
      ? this.pregnancyRisk(detectedAdditives)
      : PregnancyStatus.INSUFFICIENT_EVIDENCE;
    return {
      productName,
      ingredientsText,
      overallRisk: risk,
      pregnancyRisk,
      summary:
        detectedAdditives.length === 0
          ? 'No se identificaron aditivos del catálogo en la etiqueta.'
          : `Se identificaron ${detectedAdditives.length} aditivos; riesgo máximo ${risk}.`,
      detectedAdditives,
      unrecognizedIngredients: result.unmatchedENumbers.map((value) => ({
        originalText: value,
        normalizedText: value,
        reason: UnrecognizedIngredientReason.NOT_IN_CATALOG,
      })),
      pregnancyModeApplied: pregnancyMode,
    };
  }

  private overallRisk(additives: DetectedAdditive[]): ProductRiskLevel {
    if (additives.length === 0) return ProductRiskLevel.INSUFFICIENT_EVIDENCE;
    const rank = {
      [ToxicityLevel.LOW]: 0,
      [ToxicityLevel.MEDIUM]: 1,
      [ToxicityLevel.HIGH]: 2,
      [ToxicityLevel.VERY_HIGH]: 3,
    };
    const highest = Math.max(
      ...additives.map((item) => rank[item.toxicityLevel]),
    );
    return [
      ProductRiskLevel.LOW,
      ProductRiskLevel.CAUTION,
      ProductRiskLevel.HIGH,
      ProductRiskLevel.VERY_HIGH,
    ][highest];
  }

  private pregnancyRisk(additives: DetectedAdditive[]): PregnancyStatus {
    if (
      additives.some(
        (item) => item.pregnancyStatus === PregnancyStatus.NOT_SUITABLE,
      )
    ) {
      return PregnancyStatus.NOT_SUITABLE;
    }
    if (
      additives.some(
        (item) =>
          item.pregnancyStatus === PregnancyStatus.INSUFFICIENT_EVIDENCE,
      )
    ) {
      return PregnancyStatus.INSUFFICIENT_EVIDENCE;
    }
    return additives.length
      ? PregnancyStatus.SUITABLE
      : PregnancyStatus.INSUFFICIENT_EVIDENCE;
  }
}
