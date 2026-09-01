import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalysisListItem,
  CursorPageResponse,
  ListUserAnalysesQuery,
  ProductAnalysisResponse,
  SavedAnalysisResponse,
} from '@ingredia/contracts';
import { GetUserEntitlementsService } from '../../../billing/application/services/get-user-entitlements.service';
import { ANALYSIS_REPOSITORY } from '../ports/analysis.repository.port';
import type { AnalysisRepositoryPort } from '../ports/analysis.repository.port';
import { AnalysisRecord } from '../../domain/analysis.types';

const DISCLAIMER =
  'Resultado informativo basado en fuentes indexadas; no sustituye asesoramiento médico ni una evaluación oficial de seguridad alimentaria.';

@Injectable()
export class AnalysesService {
  constructor(
    @Inject(ANALYSIS_REPOSITORY)
    private readonly repository: AnalysisRepositoryPort,
    private readonly entitlements: GetUserEntitlementsService,
  ) {}

  async list(
    userId: string,
    query: ListUserAnalysesQuery,
  ): Promise<CursorPageResponse<AnalysisListItem>> {
    if (query.cursor && !this.isUuid(query.cursor)) {
      throw new BadRequestException('Invalid analysis cursor.');
    }
    const access = await this.entitlements.execute(userId);
    const requestedLimit = query.limit ?? 20;
    const limit = access.completeHistory
      ? requestedLimit
      : Math.min(5, requestedLimit);
    const rows = await this.repository.listAnalyses({
      userId,
      savedOnly: query.filter === 'SAVED',
      riskLevel: query.riskLevel,
      cursor: query.cursor,
      limit,
    });
    const hasMore = access.completeHistory && rows.length > limit;
    const visible = rows.slice(0, limit);
    return {
      items: visible.map((row) => ({
        id: row.id,
        productName: row.productName,
        additiveCount: row.detectedAdditives.length,
        riskLevel: row.overallRisk,
        saved: row.saved,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? (visible.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async get(
    userId: string,
    analysisId: string,
  ): Promise<ProductAnalysisResponse> {
    const row = await this.required(userId, analysisId);
    return this.toResponse(row);
  }

  async save(
    userId: string,
    analysisId: string,
    saved: boolean,
  ): Promise<SavedAnalysisResponse> {
    if (!(await this.repository.setSaved(userId, analysisId, saved))) {
      throw new NotFoundException('Analysis not found.');
    }
    return { analysisId, saved };
  }

  async delete(userId: string, analysisId: string): Promise<void> {
    if (!(await this.repository.deleteAnalysis(userId, analysisId))) {
      throw new NotFoundException('Analysis not found.');
    }
  }

  private async required(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisRecord> {
    const row = await this.repository.findAnalysis(userId, analysisId);
    if (!row) throw new NotFoundException('Analysis not found.');
    return row;
  }

  private toResponse(row: AnalysisRecord): ProductAnalysisResponse {
    return {
      id: row.id,
      productName: row.productName,
      overallRisk: row.overallRisk,
      pregnancyRisk: row.pregnancyRisk,
      summary: row.summary,
      detectedAdditives: row.detectedAdditives,
      unrecognizedIngredients: row.unrecognizedIngredients,
      createdAt: row.createdAt.toISOString(),
      disclaimer: DISCLAIMER,
    };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
