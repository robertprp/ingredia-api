import {
  AdditiveSourceEntry,
  CatalogAdditive,
} from '../../domain/additive.types';

export const ADDITIVE_REPOSITORY = Symbol('ADDITIVE_REPOSITORY');

export interface IngestionRunResult {
  runId: string;
}

export interface AdditiveRepositoryPort {
  startIngestion(source: {
    key: string;
    name: string;
    baseUrl: string;
    discovered: number;
  }): Promise<IngestionRunResult>;
  saveSourceEntry(entry: AdditiveSourceEntry): Promise<void>;
  completeIngestion(
    runId: string,
    result: { imported: number; failed: number; errors: string[] },
  ): Promise<void>;
  findForIngredientAnalysis(input: {
    eNumbers: string[];
    normalizedNames: string[];
  }): Promise<CatalogAdditive[]>;
}
