import { Inject, Injectable, Logger } from '@nestjs/common';
import { ADDITIVE_REPOSITORY } from '../ports/additive.repository.port';
import type { AdditiveRepositoryPort } from '../ports/additive.repository.port';
import { AdditiveSourcePort } from '../ports/additive-source.port';
import { AditivosAlimentariosSource } from '../../infrastructure/sources/aditivos-alimentarios.source';
import { EAditivosSource } from '../../infrastructure/sources/e-aditivos.source';

export interface SourceImportResult {
  source: string;
  discovered: number;
  imported: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class ImportAdditivesService {
  private readonly logger = new Logger(ImportAdditivesService.name);

  constructor(
    @Inject(ADDITIVE_REPOSITORY)
    private readonly repository: AdditiveRepositoryPort,

    @Inject(AditivosAlimentariosSource)
    private readonly aditivosAlimentarios: AditivosAlimentariosSource,

    @Inject(EAditivosSource)
    private readonly eAditivos: EAditivosSource,
  ) {}

  async importAll(sourceKey?: string): Promise<SourceImportResult[]> {
    const sources = this.sources().filter(
      (source) => !sourceKey || source.key === sourceKey,
    );
    if (!sources.length) {
      throw new Error(`Unknown additive source: ${sourceKey}`);
    }
    const results: SourceImportResult[] = [];
    for (const source of sources) {
      results.push(await this.importSource(source));
    }
    return results;
  }

  private sources(): AdditiveSourcePort[] {
    return [this.aditivosAlimentarios, this.eAditivos];
  }

  private async importSource(
    source: AdditiveSourcePort,
  ): Promise<SourceImportResult> {
    const summaries = await source.list();
    const { runId } = await this.repository.startIngestion({
      key: source.key,
      name: source.name,
      baseUrl: source.baseUrl,
      discovered: summaries.length,
    });
    const result: SourceImportResult = {
      source: source.key,
      discovered: summaries.length,
      imported: 0,
      failed: 0,
      errors: [],
    };
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < summaries.length) {
        const summary = summaries[nextIndex++];
        try {
          const entry = await source.fetchDetails(summary);
          await this.repository.saveSourceEntry(entry);
          result.imported += 1;
        } catch (error: unknown) {
          result.failed += 1;
          const message =
            error instanceof Error ? error.message : 'Unknown ingestion error';
          result.errors.push(`${summary.eNumber}: ${message}`);
          this.logger.warn(`${source.key} ${summary.eNumber}: ${message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker));
    await this.repository.completeIngestion(runId, result);
    return result;
  }
}
