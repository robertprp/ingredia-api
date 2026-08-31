import { AdditiveSourceEntry } from '../../domain/additive.types';

export interface AdditiveSourceSummary {
  eNumber: string;
  name: string;
  detailUrl: string;
  listedClassification?: string;
}

export interface AdditiveSourcePort {
  readonly key: string;
  readonly name: string;
  readonly baseUrl: string;
  list(): Promise<AdditiveSourceSummary[]>;
  fetchDetails(summary: AdditiveSourceSummary): Promise<AdditiveSourceEntry>;
}
