import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { AdditiveRepositoryPort } from '../../application/ports/additive.repository.port';
import {
  AdditiveSourceEntry,
  AdditiveResearchCandidate,
  AdditiveResearchResult,
  CatalogAdditive,
  CatalogAdditiveDetail,
  CatalogAdditiveListItem,
  CatalogSearch,
  normalizeSearchText,
  PregnancySuitability,
  toxicityRank,
} from '../../domain/additive.types';

@Injectable()
export class PrismaAdditiveRepository implements AdditiveRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async startIngestion(input: {
    key: string;
    name: string;
    baseUrl: string;
    discovered: number;
  }) {
    // 1. Ensure the information source exists and get its actual UUID
    const source = await this.prisma.informationSource.upsert({
      where: { key: input.key },
      update: {
        name: input.name,
        baseUrl: input.baseUrl,
        updatedAt: new Date(),
      },
      create: {
        key: input.key,
        name: input.name,
        baseUrl: input.baseUrl,
        updatedAt: new Date(),
      },
    });

    // 2. Create the run using the valid source.id (UUID)
    const run = await this.prisma.additiveIngestionRun.create({
      data: {
        sourceId: source.id,
        status: 'RUNNING',
        discovered: input.discovered,
      },
    });

    return { runId: run.id };
  }

  async saveSourceEntry(entry: AdditiveSourceEntry): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const source = await transaction.informationSource.upsert({
        where: { key: entry.sourceKey },
        update: { name: entry.sourceName, baseUrl: entry.sourceBaseUrl },
        create: {
          key: entry.sourceKey,
          name: entry.sourceName,
          baseUrl: entry.sourceBaseUrl,
          updatedAt: new Date(),
        },
      });
      const additive = await transaction.additive.upsert({
        where: { eNumber: entry.eNumber },
        update: {},
        create: {
          eNumber: entry.eNumber,
          name: entry.name,
          description: entry.description,
          foodUses: entry.foodUses,
          healthImpact: entry.healthImpact,
          lowDoseEffects: entry.lowDoseEffects,
          highDoseEffects: entry.highDoseEffects,
          toxicityLevel: entry.toxicityLevel,
          pregnancySuitability: entry.pregnancySuitability,
          pregnancyRationale: entry.pregnancyRationale,
          updatedAt: new Date(),
        },
        select: { id: true },
      });
      const aliases = [entry.name, ...entry.aliases]
        .map((name) => ({
          additiveId: additive.id,
          name,
          normalizedName: normalizeSearchText(name),
        }))
        .filter((alias) => alias.normalizedName.length > 1);
      if (aliases.length) {
        await transaction.additiveAlias.createMany({
          data: aliases,
          skipDuplicates: true,
        });
      }
      await transaction.additiveSourceRecord.upsert({
        where: {
          additiveId_sourceId: { additiveId: additive.id, sourceId: source.id },
        },
        update: this.sourceRecordData(entry),
        create: {
          additiveId: additive.id,
          sourceId: source.id,
          ...this.sourceRecordData(entry),
        },
      });

      const evidence = await transaction.additiveSourceRecord.findMany({
        where: { additiveId: additive.id },
        orderBy: { fetchedAt: 'desc' },
      });
      const preferred =
        evidence.find((record) => record.sourceId === source.id) ?? evidence[0];
      const toxicityLevel = evidence.reduce(
        (highest, record) =>
          toxicityRank(record.toxicityLevel) > toxicityRank(highest)
            ? record.toxicityLevel
            : highest,
        evidence[0].toxicityLevel,
      );
      const pregnancySuitability = this.mergePregnancySuitability(
        evidence.map((record) => record.pregnancySuitability),
      );
      const pregnancyRationale = evidence
        .filter(
          (record) => record.pregnancySuitability === pregnancySuitability,
        )
        .map((record) => record.pregnancyRationale)
        .filter((value, index, all) => all.indexOf(value) === index)
        .join(' ');
      await transaction.additive.update({
        where: { id: additive.id },
        data: {
          name: preferred.sourceName,
          description: preferred.description,
          foodUses: preferred.foodUses,
          healthImpact: preferred.healthImpact,
          lowDoseEffects: preferred.lowDoseEffects,
          highDoseEffects: preferred.highDoseEffects,
          toxicityLevel,
          pregnancySuitability,
          pregnancyRationale,
          curationStatus: 'REVIEW_REQUIRED',
          contentUpdatedAt: new Date(),
        },
      });
    });
  }

  async completeIngestion(
    runId: string,
    result: { imported: number; failed: number; errors: string[] },
  ): Promise<void> {
    await this.prisma.additiveIngestionRun.update({
      where: { id: runId },
      data: {
        status: result.failed > 0 ? 'FAILED' : 'COMPLETED',
        imported: result.imported,
        failed: result.failed,
        errorSummary: result.errors.slice(0, 20).join('\n') || null,
        completedAt: new Date(),
      },
    });
  }

  async findForIngredientAnalysis(input: {
    eNumbers: string[];
    normalizedNames: string[];
  }): Promise<CatalogAdditive[]> {
    return this.prisma.additive.findMany({
      where: {
        OR: [
          ...(input.eNumbers.length
            ? [{ eNumber: { in: input.eNumbers } }]
            : []),
          ...(input.normalizedNames.length
            ? [
                {
                  additiveAlias: {
                    some: { normalizedName: { in: input.normalizedNames } },
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        eNumber: true,
        name: true,
        description: true,
        foodUses: true,
        healthImpact: true,
        lowDoseEffects: true,
        highDoseEffects: true,
        toxicityLevel: true,
        pregnancySuitability: true,
        pregnancyRationale: true,
      },
      orderBy: { eNumber: 'asc' },
      take: 100,
    });
  }

  async search(input: CatalogSearch): Promise<CatalogAdditiveListItem[]> {
    return this.prisma.additive.findMany({
      where: {
        ...(input.q
          ? {
              OR: [
                { eNumber: { contains: input.q, mode: 'insensitive' } },
                { name: { contains: input.q, mode: 'insensitive' } },
                {
                  additiveAlias: {
                    some: {
                      normalizedName: {
                        contains: normalizeSearchText(input.q),
                      },
                    },
                  },
                },
              ],
            }
          : {}),
        ...(input.toxicityLevel ? { toxicityLevel: input.toxicityLevel } : {}),
        ...(input.pregnancySuitability
          ? { pregnancySuitability: input.pregnancySuitability }
          : {}),
        ...(input.sourceId
          ? {
              additiveSourceRecord: {
                some: { sourceId: input.sourceId },
              },
            }
          : {}),
      },
      select: {
        id: true,
        eNumber: true,
        name: true,
        toxicityLevel: true,
        pregnancySuitability: true,
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy:
        input.sort === 'NAME'
          ? [{ name: 'asc' }, { id: 'asc' }]
          : input.sort === 'TOXICITY'
            ? [{ toxicityLevel: 'desc' }, { eNumber: 'asc' }, { id: 'asc' }]
            : [{ eNumber: 'asc' }, { id: 'asc' }],
      take: input.limit + 1,
    });
  }

  async findByCode(code: string): Promise<CatalogAdditiveDetail | null> {
    const row = await this.prisma.additive.findUnique({
      where: { eNumber: code },
      select: {
        id: true,
        eNumber: true,
        name: true,
        description: true,
        foodUses: true,
        healthImpact: true,
        lowDoseEffects: true,
        highDoseEffects: true,
        toxicityLevel: true,
        pregnancySuitability: true,
        pregnancyRationale: true,
        curationStatus: true,
        contentUpdatedAt: true,
        additiveAlias: { select: { name: true }, orderBy: { name: 'asc' } },
      },
    });
    if (!row) return null;
    return { ...row, aliases: row.additiveAlias.map((alias) => alias.name) };
  }

  async findResearchCandidates(input: {
    eNumber?: string;
    limit: number;
    refresh: boolean;
  }): Promise<AdditiveResearchCandidate[]> {
    return this.prisma.additive.findMany({
      where: {
        ...(input.eNumber ? { eNumber: input.eNumber } : {}),
        ...(!input.refresh
          ? {
              curationStatus: { not: 'REVIEWED' as const },
              OR: [
                { pregnancySuitability: 'UNKNOWN' as const },
                {
                  description: {
                    contains: 'pendiente de revisión',
                    mode: 'insensitive' as const,
                  },
                },
                {
                  foodUses: {
                    contains: 'pendiente de revisión',
                    mode: 'insensitive' as const,
                  },
                },
                {
                  healthImpact: {
                    contains: 'pendiente de revisión',
                    mode: 'insensitive' as const,
                  },
                },
                { lowDoseEffects: null },
                { highDoseEffects: null },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        eNumber: true,
        name: true,
        description: true,
        foodUses: true,
        healthImpact: true,
        lowDoseEffects: true,
        highDoseEffects: true,
        toxicityLevel: true,
        pregnancySuitability: true,
        pregnancyRationale: true,
        curationStatus: true,
      },
      orderBy: { eNumber: 'asc' },
      take: input.limit,
    });
  }

  async saveResearchResult(
    candidate: AdditiveResearchCandidate,
    result: AdditiveResearchResult,
    refresh: boolean,
  ): Promise<void> {
    const citations = result.citations.map((citation) => citation.url);
    const description = this.researchedValue(
      candidate.description,
      result.description,
      refresh,
    );
    const foodUses = this.researchedValue(
      candidate.foodUses,
      result.foodUses,
      refresh,
    );
    const healthImpact = this.researchedValue(
      candidate.healthImpact,
      result.healthImpact,
      refresh,
    );
    const lowDoseEffects = this.researchedOptionalValue(
      candidate.lowDoseEffects,
      result.lowDoseEffects,
      refresh,
    );
    const highDoseEffects = this.researchedOptionalValue(
      candidate.highDoseEffects,
      result.highDoseEffects,
      refresh,
    );
    const pregnancySuitability =
      refresh || candidate.pregnancySuitability === 'UNKNOWN'
        ? result.pregnancySuitability
        : candidate.pregnancySuitability;
    const pregnancyRationale =
      refresh || candidate.pregnancySuitability === 'UNKNOWN'
        ? result.pregnancyRationale
        : candidate.pregnancyRationale;

    await this.prisma.$transaction(async (transaction) => {
      const source = await transaction.informationSource.upsert({
        where: { key: 'ppq.ai-research' },
        update: {
          name: 'PPQ.ai web research',
          baseUrl: 'https://ppq.ai',
          updatedAt: new Date(),
        },
        create: {
          key: 'ppq.ai-research',
          name: 'PPQ.ai web research',
          baseUrl: 'https://ppq.ai',
          updatedAt: new Date(),
        },
      });
      await transaction.additiveSourceRecord.upsert({
        where: {
          additiveId_sourceId: {
            additiveId: candidate.id,
            sourceId: source.id,
          },
        },
        update: {
          sourceUrl: citations[0] ?? 'https://ppq.ai/api-docs',
          sourceName: candidate.name,
          description: result.description ?? candidate.description,
          foodUses: result.foodUses ?? candidate.foodUses,
          healthImpact: result.healthImpact ?? candidate.healthImpact,
          lowDoseEffects: result.lowDoseEffects,
          highDoseEffects: result.highDoseEffects,
          toxicityLevel: result.toxicityLevel ?? candidate.toxicityLevel,
          sourceClassification: result.evidenceQuality,
          pregnancySuitability: result.pregnancySuitability,
          pregnancyRationale: result.pregnancyRationale,
          contentHash: this.researchHash(result),
          evidenceUrls: citations,
          researchModel: result.model,
          externalRecordId: result.externalResponseId,
          fetchedAt: result.researchedAt,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          additiveId: candidate.id,
          sourceId: source.id,
          sourceUrl: citations[0] ?? 'https://ppq.ai/api-docs',
          sourceName: candidate.name,
          description: result.description ?? candidate.description,
          foodUses: result.foodUses ?? candidate.foodUses,
          healthImpact: result.healthImpact ?? candidate.healthImpact,
          lowDoseEffects: result.lowDoseEffects,
          highDoseEffects: result.highDoseEffects,
          toxicityLevel: result.toxicityLevel ?? candidate.toxicityLevel,
          sourceClassification: result.evidenceQuality,
          pregnancySuitability: result.pregnancySuitability,
          pregnancyRationale: result.pregnancyRationale,
          contentHash: this.researchHash(result),
          evidenceUrls: citations,
          researchModel: result.model,
          externalRecordId: result.externalResponseId,
          fetchedAt: result.researchedAt,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await transaction.additive.update({
        where: { id: candidate.id },
        data: {
          description,
          foodUses,
          healthImpact,
          lowDoseEffects,
          highDoseEffects,
          toxicityLevel:
            refresh && result.toxicityLevel
              ? result.toxicityLevel
              : candidate.toxicityLevel,
          pregnancySuitability,
          pregnancyRationale,
          curationStatus: 'REVIEW_REQUIRED',
          contentUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });
  }

  private sourceRecordData(entry: AdditiveSourceEntry) {
    return {
      sourceUrl: entry.sourceUrl,
      sourceName: entry.name,
      description: entry.description,
      foodUses: entry.foodUses,
      healthImpact: entry.healthImpact,
      lowDoseEffects: entry.lowDoseEffects,
      highDoseEffects: entry.highDoseEffects,
      toxicityLevel: entry.toxicityLevel,
      sourceClassification: entry.sourceClassification,
      pregnancySuitability: entry.pregnancySuitability,
      pregnancyRationale: entry.pregnancyRationale,
      contentHash: entry.contentHash,
      fetchedAt: entry.fetchedAt,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mergePregnancySuitability(
    values: PregnancySuitability[],
  ): PregnancySuitability {
    if (values.includes('NOT_SUITABLE')) return 'NOT_SUITABLE';
    if (values.includes('SUITABLE')) return 'SUITABLE';
    return 'UNKNOWN';
  }

  private researchedValue(
    current: string,
    researched: string | null,
    refresh: boolean,
  ): string {
    return (refresh || /pendiente de revisión/i.test(current)) && researched
      ? researched
      : current;
  }

  private researchedOptionalValue(
    current: string | null,
    researched: string | null,
    refresh: boolean,
  ): string | null {
    return (refresh || current === null) && researched ? researched : current;
  }

  private researchHash(result: AdditiveResearchResult): string {
    return createHash('sha256').update(JSON.stringify(result)).digest('hex');
  }
}
