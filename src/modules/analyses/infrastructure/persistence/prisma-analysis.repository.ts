import { Injectable } from '@nestjs/common';
import {
  DetectedAdditive,
  PregnancyStatus,
  ProductRiskLevel,
  ScanStatus,
  UnrecognizedIngredient,
} from '@ingredia/contracts';
import {
  Prisma,
  analysis as PrismaAnalysis,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AnalysisRepositoryPort } from '../../application/ports/analysis.repository.port';
import {
  AnalysisRecord,
  NewAnalysis,
  ScanQuotaExceededError,
  ScanRecord,
} from '../../domain/analysis.types';

@Injectable()
export class PrismaAnalysisRepository implements AnalysisRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createScan(input: {
    userId: string;
    imageMimeType: string;
    imageSize: number;
    productName: string | null;
    periodStart: Date;
    monthlyLimit: number | null;
  }): Promise<ScanRecord> {
    return this.prisma.$transaction(
      async (transaction) => {
        if (input.monthlyLimit !== null) {
          await transaction.scanUsage.upsert({
            where: {
              userId_periodStart: {
                userId: input.userId,
                periodStart: input.periodStart,
              },
            },
            update: {},
            create: {
              userId: input.userId,
              periodStart: input.periodStart,
            },
          });
          const consumed = await transaction.scanUsage.updateMany({
            where: {
              userId: input.userId,
              periodStart: input.periodStart,
              consumed: { lt: input.monthlyLimit },
            },
            data: { consumed: { increment: 1 } },
          });
          if (consumed.count !== 1) throw new ScanQuotaExceededError();
        }
        const scan = await transaction.scan.create({
          data: {
            userId: input.userId,
            imageMimeType: input.imageMimeType,
            imageSize: input.imageSize,
            productName: input.productName,
          },
          include: { analysis: { select: { id: true } } },
        });
        return this.toScan(scan);
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async markScanProcessing(userId: string, scanId: string): Promise<void> {
    await this.prisma.scan.updateMany({
      where: { id: scanId, userId },
      data: { status: 'PROCESSING' },
    });
  }

  async completeScan(
    userId: string,
    scanId: string,
    ocr: {
      ingredientsText: string;
      productName: string;
      confidence: number | null;
    },
    analysis: NewAnalysis,
  ): Promise<AnalysisRecord> {
    const created = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.analysis.create({
        data: {
          userId,
          scanId,
          productName: analysis.productName,
          ingredientsText: analysis.ingredientsText,
          overallRisk: analysis.overallRisk,
          pregnancyRisk: analysis.pregnancyRisk,
          summary: analysis.summary,
          detectedAdditives:
            analysis.detectedAdditives as unknown as Prisma.InputJsonValue,
          unrecognizedIngredients:
            analysis.unrecognizedIngredients as unknown as Prisma.InputJsonValue,
          pregnancyModeApplied: analysis.pregnancyModeApplied,
        },
      });
      await transaction.scan.update({
        where: { id: scanId, userId },
        data: {
          status: 'COMPLETED',
          productName: ocr.productName,
          ingredientsText: ocr.ingredientsText,
          ocrConfidence: ocr.confidence,
        },
      });
      return result;
    });
    return this.toAnalysis(created);
  }

  async failScan(
    userId: string,
    scanId: string,
    failure: { code: string; message: string; retryable: boolean },
  ): Promise<void> {
    await this.prisma.scan.updateMany({
      where: { id: scanId, userId },
      data: {
        status: 'FAILED',
        failureCode: failure.code,
        failureMessage: failure.message,
        failureRetryable: failure.retryable,
      },
    });
  }

  async findScan(userId: string, scanId: string): Promise<ScanRecord | null> {
    const row = await this.prisma.scan.findFirst({
      where: { id: scanId, userId },
      include: { analysis: { select: { id: true } } },
    });
    return row ? this.toScan(row) : null;
  }

  async findAnalysis(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisRecord | null> {
    const row = await this.prisma.analysis.findFirst({
      where: { id: analysisId, userId },
    });
    return row ? this.toAnalysis(row) : null;
  }

  async listAnalyses(input: {
    userId: string;
    savedOnly: boolean;
    riskLevel?: string;
    cursor?: string;
    limit: number;
  }): Promise<AnalysisRecord[]> {
    const rows = await this.prisma.analysis.findMany({
      where: {
        userId: input.userId,
        ...(input.savedOnly ? { saved: true } : {}),
        ...(input.riskLevel
          ? { overallRisk: input.riskLevel as ProductRiskLevel }
          : {}),
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: input.limit + 1,
    });
    return rows.map((row) => this.toAnalysis(row));
  }

  async setSaved(
    userId: string,
    analysisId: string,
    saved: boolean,
  ): Promise<boolean> {
    const result = await this.prisma.analysis.updateMany({
      where: { id: analysisId, userId },
      data: { saved },
    });
    return result.count === 1;
  }

  async deleteAnalysis(userId: string, analysisId: string): Promise<boolean> {
    const result = await this.prisma.analysis.deleteMany({
      where: { id: analysisId, userId },
    });
    return result.count === 1;
  }

  async findAnalyses(
    userId: string,
    ids: [string, string],
  ): Promise<AnalysisRecord[]> {
    const rows = await this.prisma.analysis.findMany({
      where: { userId, id: { in: ids } },
    });
    return rows.map((row) => this.toAnalysis(row));
  }

  async createComparison(input: {
    userId: string;
    leftAnalysisId: string;
    rightAnalysisId: string;
    recommendedAnalysisId: string | null;
    reason: string;
  }): Promise<string> {
    const comparison = await this.prisma.comparison.create({ data: input });
    return comparison.id;
  }

  private toScan(row: {
    id: string;
    status: keyof typeof ScanStatus;
    productName: string | null;
    ingredientsText: string | null;
    ocrConfidence: number | null;
    failureCode: string | null;
    failureMessage: string | null;
    failureRetryable: boolean | null;
    createdAt: Date;
    analysis: { id: string } | null;
  }): ScanRecord {
    return {
      id: row.id,
      status: ScanStatus[row.status],
      productName: row.productName,
      ingredientsText: row.ingredientsText,
      ocrConfidence: row.ocrConfidence,
      analysisId: row.analysis?.id ?? null,
      failureCode: row.failureCode,
      failureMessage: row.failureMessage,
      failureRetryable: row.failureRetryable,
      createdAt: row.createdAt,
    };
  }

  private toAnalysis(row: PrismaAnalysis): AnalysisRecord {
    return {
      id: row.id,
      userId: row.userId,
      scanId: row.scanId,
      productName: row.productName,
      ingredientsText: row.ingredientsText,
      overallRisk: ProductRiskLevel[row.overallRisk],
      pregnancyRisk: PregnancyStatus[row.pregnancyRisk],
      summary: row.summary,
      detectedAdditives: row.detectedAdditives as unknown as DetectedAdditive[],
      unrecognizedIngredients:
        row.unrecognizedIngredients as unknown as UnrecognizedIngredient[],
      pregnancyModeApplied: row.pregnancyModeApplied,
      saved: row.saved,
      createdAt: row.createdAt,
    };
  }
}
