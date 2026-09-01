import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateComparisonRequest,
  ProductComparisonResponse,
  ProductRiskLevel,
} from '@ingredia/contracts';
import { GetUserEntitlementsService } from '../../../billing/application/services/get-user-entitlements.service';
import { ANALYSIS_REPOSITORY } from '../ports/analysis.repository.port';
import type { AnalysisRepositoryPort } from '../ports/analysis.repository.port';
import { AnalysisRecord } from '../../domain/analysis.types';

@Injectable()
export class ComparisonsService {
  constructor(
    @Inject(ANALYSIS_REPOSITORY)
    private readonly repository: AnalysisRepositoryPort,
    private readonly entitlements: GetUserEntitlementsService,
  ) {}

  async create(
    userId: string,
    request: CreateComparisonRequest,
  ): Promise<ProductComparisonResponse> {
    const access = await this.entitlements.execute(userId);
    if (!access.productComparison) {
      throw new ForbiddenException(
        'Product comparison is not included in the current plan.',
      );
    }
    const analyses = await this.repository.findAnalyses(
      userId,
      request.analysisIds,
    );
    if (analyses.length !== 2) {
      throw new NotFoundException('One or more analyses were not found.');
    }
    const ordered = request.analysisIds.map(
      (id) => analyses.find((analysis) => analysis.id === id) as AnalysisRecord,
    );
    const [left, right] = ordered;
    const recommendation = this.recommend(left, right);
    const id = await this.repository.createComparison({
      userId,
      leftAnalysisId: left.id,
      rightAnalysisId: right.id,
      recommendedAnalysisId: recommendation.analysisId,
      reason: recommendation.reason,
    });
    return {
      id,
      products: ordered.map((analysis) => ({
        analysisId: analysis.id,
        productName: analysis.productName,
        additiveCount: analysis.detectedAdditives.length,
        maximumRisk: analysis.overallRisk,
        pregnancyStatus: analysis.pregnancyRisk,
      })),
      recommendedAnalysisId: recommendation.analysisId,
      reason: recommendation.reason,
    };
  }

  private recommend(
    left: AnalysisRecord,
    right: AnalysisRecord,
  ): { analysisId: string | null; reason: string } {
    const rank: Record<ProductRiskLevel, number> = {
      LOW: 0,
      CAUTION: 1,
      HIGH: 2,
      VERY_HIGH: 3,
      INSUFFICIENT_EVIDENCE: 4,
    };
    const difference = rank[left.overallRisk] - rank[right.overallRisk];
    if (difference !== 0) {
      const preferred = difference < 0 ? left : right;
      return {
        analysisId: preferred.id,
        reason: 'Recommended because it has the lower verified maximum risk.',
      };
    }
    const additiveDifference =
      left.detectedAdditives.length - right.detectedAdditives.length;
    if (additiveDifference !== 0) {
      const preferred = additiveDifference < 0 ? left : right;
      return {
        analysisId: preferred.id,
        reason:
          'Recommended because it contains fewer detected additives at the same risk level.',
      };
    }
    return {
      analysisId: null,
      reason:
        'No recommendation: both analyses have equivalent catalog risk evidence.',
    };
  }
}
