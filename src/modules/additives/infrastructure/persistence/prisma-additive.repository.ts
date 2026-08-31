import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  AdditiveRepositoryPort,
  IngestionRunResult,
} from '../../application/ports/additive.repository.port';
import {
  AdditiveSourceEntry,
  CatalogAdditive,
  normalizeSearchText,
  PregnancySuitability,
  toxicityRank,
} from '../../domain/additive.types';

@Injectable()
export class PrismaAdditiveRepository implements AdditiveRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async startIngestion(sourceInput: {
    key: string;
    name: string;
    baseUrl: string;
    discovered: number;
  }): Promise<IngestionRunResult> {
    const source = await this.prisma.informationSource.upsert({
      where: { key: sourceInput.key },
      update: { name: sourceInput.name, baseUrl: sourceInput.baseUrl },
      create: {
        key: sourceInput.key,
        name: sourceInput.name,
        baseUrl: sourceInput.baseUrl,
      },
    });
    const run = await this.prisma.additiveIngestionRun.create({
      data: { sourceId: source.id, discovered: sourceInput.discovered },
      select: { id: true },
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
                  aliases: {
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
    };
  }

  private mergePregnancySuitability(
    values: PregnancySuitability[],
  ): PregnancySuitability {
    if (values.includes('NOT_SUITABLE')) return 'NOT_SUITABLE';
    if (values.includes('SUITABLE')) return 'SUITABLE';
    return 'UNKNOWN';
  }
}
