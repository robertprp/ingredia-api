import {
  AdditiveSourceEntry,
  CatalogAdditiveDetail,
  CatalogAdditiveListItem,
  CatalogSearch,
  CatalogAdditive,
  AdditiveResearchCandidate,
  AdditiveResearchResult,
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
  search(input: CatalogSearch): Promise<CatalogAdditiveListItem[]>;
  findByCode(code: string): Promise<CatalogAdditiveDetail | null>;
  findResearchCandidates(input: {
    eNumber?: string;
    limit: number;
    refresh: boolean;
  }): Promise<AdditiveResearchCandidate[]>;
  saveResearchResult(
    candidate: AdditiveResearchCandidate,
    result: AdditiveResearchResult,
    refresh: boolean,
  ): Promise<void>;
}
