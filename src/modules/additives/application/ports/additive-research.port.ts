import {
  AdditiveResearchCandidate,
  AdditiveResearchResult,
} from '../../domain/additive.types';

export const ADDITIVE_RESEARCH = Symbol('ADDITIVE_RESEARCH');

export interface AdditiveResearchPort {
  research(
    candidate: AdditiveResearchCandidate,
  ): Promise<AdditiveResearchResult>;
}
