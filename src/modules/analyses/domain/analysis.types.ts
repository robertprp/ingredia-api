import type {
  DetectedAdditive,
  ProductRiskLevel,
  PregnancyStatus,
  ScanStatus,
  UnrecognizedIngredient,
} from '@ingredia/contracts';

export interface ImageUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

export interface OcrResult {
  ingredientsText: string;
  productName: string | null;
  confidence: number | null;
}

export type OcrFailureCode =
  | 'HEIC_DECODE_FAILED'
  | 'OCR_PROVIDER_AUTH_FAILED'
  | 'OCR_PROVIDER_QUOTA_EXCEEDED'
  | 'OCR_PROVIDER_REJECTED'
  | 'OCR_PROVIDER_UNAVAILABLE'
  | 'OCR_PROVIDER_FAILED'
  | 'OCR_TEXT_NOT_FOUND';

export class OcrFailureError extends Error {
  constructor(
    readonly code: OcrFailureCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'OcrFailureError';
  }
}

export interface ScanRecord {
  id: string;
  status: ScanStatus;
  productName: string | null;
  ingredientsText: string | null;
  ocrConfidence: number | null;
  analysisId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  failureRetryable: boolean | null;
  createdAt: Date;
}

export interface AnalysisRecord {
  id: string;
  userId: string;
  scanId: string;
  productName: string;
  ingredientsText: string;
  overallRisk: ProductRiskLevel;
  pregnancyRisk: PregnancyStatus;
  summary: string;
  detectedAdditives: DetectedAdditive[];
  unrecognizedIngredients: UnrecognizedIngredient[];
  pregnancyModeApplied: boolean;
  saved: boolean;
  createdAt: Date;
}

export interface NewAnalysis {
  productName: string;
  ingredientsText: string;
  overallRisk: ProductRiskLevel;
  pregnancyRisk: PregnancyStatus;
  summary: string;
  detectedAdditives: DetectedAdditive[];
  unrecognizedIngredients: UnrecognizedIngredient[];
  pregnancyModeApplied: boolean;
}

export class ScanQuotaExceededError extends Error {
  constructor() {
    super('The monthly scan allowance has been used.');
  }
}
