import {
  AnalysisRecord,
  NewAnalysis,
  ScanRecord,
} from '../../domain/analysis.types';

export const ANALYSIS_REPOSITORY = Symbol('ANALYSIS_REPOSITORY');

export interface AnalysisRepositoryPort {
  createScan(input: {
    userId: string;
    imageMimeType: string;
    imageSize: number;
    productName: string | null;
    periodStart: Date;
    monthlyLimit: number | null;
  }): Promise<ScanRecord>;
  markScanProcessing(userId: string, scanId: string): Promise<void>;
  completeScan(
    userId: string,
    scanId: string,
    ocr: {
      ingredientsText: string;
      productName: string;
      confidence: number | null;
    },
    analysis: NewAnalysis,
  ): Promise<AnalysisRecord>;
  failScan(
    userId: string,
    scanId: string,
    failure: { code: string; message: string; retryable: boolean },
  ): Promise<void>;
  findScan(userId: string, scanId: string): Promise<ScanRecord | null>;
  findAnalysis(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisRecord | null>;
  listAnalyses(input: {
    userId: string;
    savedOnly: boolean;
    riskLevel?: string;
    cursor?: string;
    limit: number;
  }): Promise<AnalysisRecord[]>;
  setSaved(
    userId: string,
    analysisId: string,
    saved: boolean,
  ): Promise<boolean>;
  deleteAnalysis(userId: string, analysisId: string): Promise<boolean>;
  findAnalyses(
    userId: string,
    ids: [string, string],
  ): Promise<AnalysisRecord[]>;
  createComparison(input: {
    userId: string;
    leftAnalysisId: string;
    rightAnalysisId: string;
    recommendedAnalysisId: string | null;
    reason: string;
  }): Promise<string>;
}
