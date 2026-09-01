import { Inject, Injectable, Logger } from '@nestjs/common';
import { ADDITIVE_REPOSITORY } from '../ports/additive.repository.port';
import type { AdditiveRepositoryPort } from '../ports/additive.repository.port';
import { ADDITIVE_RESEARCH } from '../ports/additive-research.port';
import type { AdditiveResearchPort } from '../ports/additive-research.port';

export interface ResearchAdditivesOptions {
  eNumber?: string;
  limit?: number;
  concurrency?: number;
  refresh?: boolean;
}

export interface ResearchAdditivesResult {
  discovered: number;
  enriched: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class ResearchAdditivesService {
  private readonly logger = new Logger(ResearchAdditivesService.name);

  constructor(
    @Inject(ADDITIVE_REPOSITORY)
    private readonly repository: AdditiveRepositoryPort,
    @Inject(ADDITIVE_RESEARCH)
    private readonly researchProvider: AdditiveResearchPort,
  ) {}

  async run(
    options: ResearchAdditivesOptions = {},
  ): Promise<ResearchAdditivesResult> {
    const limit = this.boundedInteger(options.limit ?? 500, 1, 5_000, 'limit');
    const concurrency = this.boundedInteger(
      options.concurrency ?? 2,
      1,
      5,
      'concurrency',
    );
    const candidates = await this.repository.findResearchCandidates({
      ...(options.eNumber ? { eNumber: options.eNumber } : {}),
      limit,
      refresh: options.refresh ?? false,
    });
    const result: ResearchAdditivesResult = {
      discovered: candidates.length,
      enriched: 0,
      failed: 0,
      errors: [],
    };
    this.logger.log(
      `research_batch_started ${JSON.stringify({
        discovered: candidates.length,
        limit,
        concurrency,
        refresh: options.refresh ?? false,
        eNumber: options.eNumber ?? null,
      })}`,
    );
    const { runId } = await this.repository.startIngestion({
      key: 'ppq.ai-research',
      name: 'PPQ.ai web research',
      baseUrl: 'https://ppq.ai',
      discovered: candidates.length,
    });
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      while (nextIndex < candidates.length) {
        const position = nextIndex + 1;
        const candidate = candidates[nextIndex++];
        const startedAt = Date.now();
        this.logger.log(
          `research_candidate_started ${JSON.stringify({
            eNumber: candidate.eNumber,
            position,
            total: candidates.length,
          })}`,
        );
        try {
          const research = await this.researchProvider.research(candidate);
          await this.repository.saveResearchResult(
            candidate,
            research,
            options.refresh ?? false,
          );
          result.enriched += 1;
          this.logger.log(
            `research_candidate_saved ${JSON.stringify({
              eNumber: candidate.eNumber,
              position,
              total: candidates.length,
              durationMs: Date.now() - startedAt,
              pregnancySuitability: research.pregnancySuitability,
              evidenceQuality: research.evidenceQuality,
              citations: research.citations.length,
            })}`,
          );
        } catch (error: unknown) {
          result.failed += 1;
          const message =
            error instanceof Error ? error.message : 'Unknown research error';
          result.errors.push(`${candidate.eNumber}: ${message}`);
          this.logger.warn(
            `research_candidate_failed ${JSON.stringify({
              eNumber: candidate.eNumber,
              position,
              total: candidates.length,
              durationMs: Date.now() - startedAt,
              error: message,
            })}`,
          );
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    await this.repository.completeIngestion(runId, {
      imported: result.enriched,
      failed: result.failed,
      errors: result.errors,
    });
    this.logger.log(
      `research_batch_completed ${JSON.stringify({
        runId,
        ...result,
      })}`,
    );
    return result;
  }

  private boundedInteger(
    value: number,
    minimum: number,
    maximum: number,
    name: string,
  ): number {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new Error(
        `${name} must be an integer between ${minimum} and ${maximum}.`,
      );
    }
    return value;
  }
}
