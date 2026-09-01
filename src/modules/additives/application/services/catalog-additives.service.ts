import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdditiveDetailResponse,
  AdditiveListItem,
  CursorPageResponse,
  EvidenceStatus,
  PregnancyStatus,
  SearchAdditivesQuery,
  ToxicityLevel,
} from '@ingredia/contracts';
import { ADDITIVE_REPOSITORY } from '../ports/additive.repository.port';
import type { AdditiveRepositoryPort } from '../ports/additive.repository.port';
import {
  CatalogAdditiveDetail,
  PregnancySuitability,
  normalizeENumber,
} from '../../domain/additive.types';

@Injectable()
export class CatalogAdditivesService {
  constructor(
    @Inject(ADDITIVE_REPOSITORY)
    private readonly repository: AdditiveRepositoryPort,
  ) {}

  async search(
    query: SearchAdditivesQuery,
  ): Promise<CursorPageResponse<AdditiveListItem>> {
    if (query.cursor && !this.isUuid(query.cursor)) {
      throw new BadRequestException('Invalid catalog cursor.');
    }
    const pregnancySuitability = query.pregnancyStatus
      ? this.toStoredPregnancy(query.pregnancyStatus)
      : undefined;
    const rows = await this.repository.search({
      q: query.q,
      toxicityLevel: query.toxicityLevel,
      pregnancySuitability,
      sourceId: query.sourceId,
      sort: query.sort ?? 'CODE',
      cursor: query.cursor,
      limit: query.limit ?? 20,
    });
    const limit = query.limit ?? 20;
    const hasMore = rows.length > limit;
    const visible = rows.slice(0, limit);
    return {
      items: visible.map((row) => ({
        code: row.eNumber as AdditiveListItem['code'],
        name: row.name,
        category: 'OTHER',
        toxicityLevel: ToxicityLevel[row.toxicityLevel],
        pregnancyStatus: this.toResponsePregnancy(row.pregnancySuitability),
      })),
      nextCursor: hasMore ? (visible.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async detail(rawCode: string): Promise<AdditiveDetailResponse> {
    const code = normalizeENumber(rawCode);
    if (!code) throw new NotFoundException('Additive not found.');
    const row = await this.repository.findByCode(code);
    if (!row) throw new NotFoundException('Additive not found.');
    return this.toDetail(row);
  }

  private toDetail(row: CatalogAdditiveDetail): AdditiveDetailResponse {
    const pregnancyStatus = this.toResponsePregnancy(row.pregnancySuitability);
    return {
      code: row.eNumber as AdditiveDetailResponse['code'],
      name: row.name,
      category: 'OTHER',
      toxicityLevel: ToxicityLevel[row.toxicityLevel],
      pregnancyStatus,
      alternativeNames: row.aliases.filter((alias) => alias !== row.name),
      description: row.description,
      foodIndustryUses: row.foodUses,
      healthImpact: row.healthImpact,
      lowDoseEffects: row.lowDoseEffects,
      highDoseEffects: row.highDoseEffects,
      pregnancy: { status: pregnancyStatus, reason: row.pregnancyRationale },
      evidenceStatus:
        row.curationStatus === 'REVIEWED'
          ? EvidenceStatus.REVIEWED
          : EvidenceStatus.REVIEW_REQUIRED,
      lastReviewedAt: row.contentUpdatedAt.toISOString(),
    };
  }

  private toStoredPregnancy(status: PregnancyStatus): PregnancySuitability {
    if (status === PregnancyStatus.SUITABLE) return 'SUITABLE';
    if (status === PregnancyStatus.NOT_SUITABLE) return 'NOT_SUITABLE';
    return 'UNKNOWN';
  }

  private toResponsePregnancy(status: PregnancySuitability): PregnancyStatus {
    if (status === 'SUITABLE') return PregnancyStatus.SUITABLE;
    if (status === 'NOT_SUITABLE') return PregnancyStatus.NOT_SUITABLE;
    return PregnancyStatus.INSUFFICIENT_EVIDENCE;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
