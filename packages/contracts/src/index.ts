import { z } from 'zod';

export type AdditiveCode = `E${number}` | `E${number}${Uppercase<string>}`;
export type UserId = string;
export type ScanId = string;
export type AnalysisId = string;
export type ComparisonId = string;
export type SourceId = string;
export type ImportJobId = string;
export type ISODateTime = string;

export enum ToxicityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum PregnancyStatus {
  SUITABLE = 'SUITABLE',
  CAUTION = 'CAUTION',
  NOT_SUITABLE = 'NOT_SUITABLE',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
}

export enum ProductRiskLevel {
  LOW = 'LOW',
  CAUTION = 'CAUTION',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
}

export enum ScanStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  FAILED = 'FAILED',
}

export enum SubscriptionStatus {
  FREE = 'FREE',
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum SubscriptionProvider {
  STRIPE = 'STRIPE',
  APPLE = 'APPLE',
  GOOGLE_PLAY = 'GOOGLE_PLAY',
}

export enum BillingClientPlatform {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

export enum BillingDistributionChannel {
  WEB_DIRECT = 'WEB_DIRECT',
  APP_STORE = 'APP_STORE',
  GOOGLE_PLAY = 'GOOGLE_PLAY',
}

export enum BillingPurchaseAction {
  NONE = 'NONE',
  STRIPE_CHECKOUT = 'STRIPE_CHECKOUT',
  APP_STORE_PURCHASE = 'APP_STORE_PURCHASE',
  GOOGLE_PLAY_PURCHASE = 'GOOGLE_PLAY_PURCHASE',
}

export enum BillingRestoreAction {
  NONE = 'NONE',
  APP_STORE_RESTORE = 'APP_STORE_RESTORE',
  GOOGLE_PLAY_RESTORE = 'GOOGLE_PLAY_RESTORE',
}

export enum BillingManagementAction {
  NONE = 'NONE',
  STRIPE_PORTAL = 'STRIPE_PORTAL',
  APP_STORE_SUBSCRIPTIONS = 'APP_STORE_SUBSCRIPTIONS',
  GOOGLE_PLAY_SUBSCRIPTIONS = 'GOOGLE_PLAY_SUBSCRIPTIONS',
  CONTACT_SUPPORT = 'CONTACT_SUPPORT',
}

export enum BillingEligibilityReason {
  ELIGIBLE = 'ELIGIBLE',
  CHANNEL_MISMATCH = 'CHANNEL_MISMATCH',
  EXISTING_SUBSCRIPTION = 'EXISTING_SUBSCRIPTION',
}

export enum ImportJobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export enum EvidenceStatus {
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  REVIEWED = 'REVIEWED',
}

export enum UserRole {
  USER = 'USER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export enum ValidationErrorCode {
  INVALID = 'INVALID',
  REQUIRED = 'REQUIRED',
  TOO_SMALL = 'TOO_SMALL',
  TOO_LARGE = 'TOO_LARGE',
  UNSUPPORTED = 'UNSUPPORTED',
}

export interface CursorPageRequest {
  cursor?: string;
  limit?: number;
}

export interface CursorPageResponse<TItem> {
  items: TItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FieldError {
  field: string;
  code: ValidationErrorCode;
  message: string;
}

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  fieldErrors: FieldError[];
}

export interface EntitlementsResponse {
  scansRemaining: number | null;
  monthlyScansRemaining: number | null;
  unlimitedScans: boolean;
  productComparison: boolean;
  completeHistory: boolean;
  personalizedPregnancyMode: boolean;
}

export interface AnalysisListItem {
  id: AnalysisId;
  productName: string;
  additiveCount: number;
  riskLevel: ProductRiskLevel;
  saved: boolean;
  createdAt: ISODateTime;
}

export interface HomeResponse {
  user: { id: UserId; name: string };
  subscriptionStatus: SubscriptionStatus;
  entitlements: EntitlementsResponse;
  pregnancyMode: boolean;
  riskAlerts: boolean;
  latestAnalysis: AnalysisListItem | null;
}

export interface ScanFailure {
  code: string;
  message: string;
  retryable: boolean;
}

export interface CreateScanResponse {
  id: ScanId;
  status: ScanStatus;
  createdAt: ISODateTime;
}

export interface ScanResponse extends CreateScanResponse {
  productName: string | null;
  ingredientsText: string | null;
  ocrConfidence: number | null;
  analysisId: AnalysisId | null;
  failure: ScanFailure | null;
}

export interface CreateImageScanRequest {
  productName?: string;
  barcode?: string;
  locale?: string;
}

export interface CreateTextScanRequest {
  productName: string;
  ingredientsText: string;
}

export interface CorrectScanIngredientsRequest {
  ingredientsText: string;
}

export interface RetryScanRequest {
  requestedReason?: string;
}

export interface ReanalyseProductRequest {
  useCurrentPreferences?: boolean;
}

export enum UnrecognizedIngredientReason {
  NOT_IN_CATALOG = 'NOT_IN_CATALOG',
  INVALID_E_NUMBER = 'INVALID_E_NUMBER',
}

export interface AdditivePregnancyGuidance {
  status: PregnancyStatus;
  reason: string;
}

export interface DetectedAdditive {
  code: AdditiveCode;
  name: string;
  toxicityLevel: ToxicityLevel;
  pregnancyStatus: PregnancyStatus;
  pregnancyReason: string;
}

export interface UnrecognizedIngredient {
  originalText: string;
  normalizedText: string;
  reason: UnrecognizedIngredientReason;
}

export interface ProductAnalysisResponse {
  id: AnalysisId;
  productName: string;
  overallRisk: ProductRiskLevel;
  pregnancyRisk: PregnancyStatus;
  summary: string;
  detectedAdditives: DetectedAdditive[];
  unrecognizedIngredients: UnrecognizedIngredient[];
  createdAt: ISODateTime;
  disclaimer: string;
}

export interface SavedAnalysisResponse {
  analysisId: AnalysisId;
  saved: boolean;
}

export interface UpdateSavedAnalysisRequest {
  saved: boolean;
}

export interface SearchAdditivesQuery extends CursorPageRequest {
  q?: string;
  category?: string;
  toxicityLevel?: ToxicityLevel;
  pregnancyStatus?: PregnancyStatus;
  sourceId?: SourceId;
  sort?: 'CODE' | 'NAME' | 'TOXICITY';
}

export interface AdditiveListItem {
  code: AdditiveCode;
  name: string;
  category: string;
  toxicityLevel: ToxicityLevel;
  pregnancyStatus: PregnancyStatus;
}

export interface AdditiveDetailResponse extends AdditiveListItem {
  alternativeNames: string[];
  description: string;
  foodIndustryUses: string;
  healthImpact: string;
  lowDoseEffects: string | null;
  highDoseEffects: string | null;
  pregnancy: AdditivePregnancyGuidance;
  evidenceStatus: EvidenceStatus;
  lastReviewedAt: ISODateTime;
}

export interface AdditiveSourceEvidence {
  id: SourceId;
  name: string;
  url: string;
  retrievedAt: ISODateTime;
  supportedFields: string[];
}

export interface AdditiveSourcesResponse {
  additiveCode: AdditiveCode;
  sources: AdditiveSourceEvidence[];
}

export interface AdditiveCategoryItem {
  code: string;
  name: string;
  publishedAdditiveCount: number;
}

export interface AdditiveCategoriesResponse {
  categories: AdditiveCategoryItem[];
}

export interface UserPreferencesResponse {
  pregnancyMode: boolean;
  riskAlerts: boolean;
  locale: string;
}

export interface UpdateUserPreferencesRequest {
  pregnancyMode?: boolean;
  riskAlerts?: boolean;
  locale?: string;
}

export interface PregnancyWarning {
  code: AdditiveCode;
  name: string;
  status: PregnancyStatus;
  reason: string;
}

export interface PregnancyOverviewResponse {
  enabled: boolean;
  catalogSummary: {
    suitable: number;
    caution: number;
    notSuitable: number;
    insufficientEvidence: number;
  };
  recentWarnings: PregnancyWarning[];
}

export interface CreateComparisonRequest {
  analysisIds: [AnalysisId, AnalysisId];
}

export interface ComparedProduct {
  analysisId: AnalysisId;
  productName: string;
  additiveCount: number;
  maximumRisk: ProductRiskLevel;
  pregnancyStatus: PregnancyStatus;
}

export interface ProductComparisonResponse {
  id: ComparisonId;
  products: ComparedProduct[];
  recommendedAnalysisId: AnalysisId | null;
  reason: string;
}

export interface ComparisonListItem {
  id: ComparisonId;
  productNames: string[];
  recommendedAnalysisId: AnalysisId | null;
  createdAt: ISODateTime;
}

export interface BillingPlan {
  id: string;
  name: string;
  localizedPrice: string | null;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  trialDays: number;
  capabilities: string[];
  purchasable: boolean;
  providerReferences: {
    provider: SubscriptionProvider;
    productId: string;
  }[];
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
}

export interface UserSubscriptionResponse {
  status: SubscriptionStatus;
  provider: SubscriptionProvider | null;
  planId: string | null;
  renewsAt: ISODateTime | null;
  currentPeriodEndsAt: ISODateTime | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingEligibilityQuery {
  platform: BillingClientPlatform;
  distributionChannel: BillingDistributionChannel;
  storefront?: string;
}

export interface BillingEligibilityResponse {
  policyVersion: string;
  purchaseAllowed: boolean;
  purchaseProvider: SubscriptionProvider | null;
  purchaseAction: BillingPurchaseAction;
  restoreAction: BillingRestoreAction;
  managementAction: BillingManagementAction;
  reason: BillingEligibilityReason;
}

export interface CreateCheckoutSessionRequest {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreateBillingPortalSessionRequest {
  returnUrl: string;
}

export interface CreateBillingPortalSessionResponse {
  url: string;
}

export interface VerifyMobilePurchaseRequest {
  provider: SubscriptionProvider.APPLE | SubscriptionProvider.GOOGLE_PLAY;
  planId: string;
  transactionToken: string;
}

export interface RestoreMobilePurchasesRequest {
  provider: SubscriptionProvider.APPLE | SubscriptionProvider.GOOGLE_PLAY;
}

export interface UserProfileResponse {
  id: UserId;
  name: string;
  email: string;
  locale: string;
  subscriptionStatus: SubscriptionStatus;
  deletionScheduledAt: ISODateTime | null;
}

export interface UpdateUserProfileRequest {
  name?: string;
  locale?: string;
}

export interface RegisterDeviceRequest {
  token: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
}

export interface RegisteredDeviceResponse {
  id: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  createdAt: ISODateTime;
}

export interface CreateDataExportRequest {
  format: 'JSON';
}

export interface DataExportResponse {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: ISODateTime;
}

export interface DeleteAccountRequest {
  confirmation: 'DELETE';
}

export interface AccountDeletionResponse {
  scheduledAt: ISODateTime;
}

export interface VersionedContentResponse {
  version: string;
  title: string;
  body: string;
  effectiveAt: ISODateTime;
}

export type MethodologyContentResponse = VersionedContentResponse;
export type PrivacyContentResponse = VersionedContentResponse;
export type HelpContentResponse = VersionedContentResponse;
export type DisclaimerContentResponse = VersionedContentResponse;

export interface SourceListItem {
  id: SourceId;
  key: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  parserVersion: string;
}

export interface SourceDetailResponse extends SourceListItem {
  recentJobs: ImportJobListItem[];
}

export interface CreateSourceRequest {
  key: string;
  name: string;
  baseUrl: string;
  parserVersion: string;
}

export interface UpdateSourceRequest {
  name?: string;
  baseUrl?: string;
  enabled?: boolean;
  parserVersion?: string;
}

export interface CreateImportJobRequest {
  sourceId: SourceId;
  mode: 'FULL' | 'INCREMENTAL';
  additiveCodes?: AdditiveCode[];
}

export interface ImportJobListItem {
  id: ImportJobId;
  sourceId: SourceId;
  status: ImportJobStatus;
  discovered: number;
  imported: number;
  failed: number;
  createdAt: ISODateTime;
}

export interface ImportJobError {
  additiveCode: AdditiveCode | null;
  message: string;
}

export interface ImportJobDetailResponse extends ImportJobListItem {
  errors: ImportJobError[];
  completedAt: ISODateTime | null;
}

export interface CancelImportJobRequest {
  reason?: string;
}

export interface RetryImportJobRequest {
  failedOnly?: boolean;
}

export interface AdditiveReviewItem {
  code: AdditiveCode;
  name: string;
  sourceCount: number;
  updatedAt: ISODateTime;
}

export interface AdditiveDraftResponse extends AdditiveDetailResponse {
  sources: AdditiveSourceEvidence[];
}

export interface UpdateAdditiveDraftRequest {
  name?: string;
  category?: string;
  description?: string;
  foodIndustryUses?: string;
  healthImpact?: string;
  lowDoseEffects?: string | null;
  highDoseEffects?: string | null;
  toxicityLevel?: ToxicityLevel;
  pregnancyStatus?: PregnancyStatus;
  pregnancyReason?: string;
}

export interface PublishAdditiveRequest {
  reviewNote: string;
}

export interface UnpublishAdditiveRequest {
  reason: string;
}

export interface AdditiveRevisionItem {
  id: string;
  additiveCode: AdditiveCode;
  version: number;
  published: boolean;
  reviewNote: string;
  createdAt: ISODateTime;
}

export interface RestoreAdditiveRevisionRequest {
  reason: string;
}

const cursorFields = {
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const additiveCodeSchema = z
  .string()
  .trim()
  .regex(/^E\d{3,4}[A-Z]{0,3}$/)
  .transform((value): AdditiveCode => value as AdditiveCode);

export const createTextScanSchema: z.ZodType<CreateTextScanRequest> = z.object({
  productName: z.string().trim().min(1).max(200),
  ingredientsText: z.string().trim().min(1).max(10_000),
});

export const correctScanIngredientsSchema: z.ZodType<CorrectScanIngredientsRequest> =
  z.object({ ingredientsText: z.string().trim().min(1).max(10_000) });

export const retryScanSchema: z.ZodType<RetryScanRequest> = z.object({
  requestedReason: z.string().trim().max(500).optional(),
});

export const reanalyseProductSchema: z.ZodType<ReanalyseProductRequest> =
  z.object({
    useCurrentPreferences: z.boolean().optional(),
  });

export const listUserAnalysesSchema = z.object({
  ...cursorFields,
  filter: z.enum(['RECENT', 'SAVED']).default('RECENT'),
  riskLevel: z.nativeEnum(ProductRiskLevel).optional(),
});
export type ListUserAnalysesQuery = z.infer<typeof listUserAnalysesSchema>;

export const searchAdditivesSchema: z.ZodType<SearchAdditivesQuery> = z.object({
  ...cursorFields,
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(80).optional(),
  toxicityLevel: z.nativeEnum(ToxicityLevel).optional(),
  pregnancyStatus: z.nativeEnum(PregnancyStatus).optional(),
  sourceId: z.string().uuid().optional(),
  sort: z.enum(['CODE', 'NAME', 'TOXICITY']).default('CODE'),
});

export const updateUserPreferencesSchema: z.ZodType<UpdateUserPreferencesRequest> =
  z
    .object({
      pregnancyMode: z.boolean().optional(),
      riskAlerts: z.boolean().optional(),
      locale: z
        .string()
        .trim()
        .regex(/^[a-z]{2}-[A-Z]{2}$/)
        .optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      'At least one field is required',
    );

export const createComparisonSchema: z.ZodType<CreateComparisonRequest> =
  z.object({
    analysisIds: z
      .tuple([z.string().uuid(), z.string().uuid()])
      .refine(([left, right]) => left !== right, 'Analyses must be different'),
  });

export const updateSavedAnalysisSchema: z.ZodType<UpdateSavedAnalysisRequest> =
  z.object({ saved: z.boolean() });

export const updateUserProfileSchema: z.ZodType<UpdateUserProfileRequest> = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    locale: z
      .string()
      .trim()
      .regex(/^[a-z]{2}-[A-Z]{2}$/)
      .optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required',
  );

export const registerDeviceSchema: z.ZodType<RegisterDeviceRequest> = z.object({
  token: z.string().trim().min(16).max(4096),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
});

export const createDataExportSchema: z.ZodType<CreateDataExportRequest> =
  z.object({
    format: z.literal('JSON'),
  });

export const deleteAccountSchema: z.ZodType<DeleteAccountRequest> = z.object({
  confirmation: z.literal('DELETE'),
});

export const createCheckoutSessionSchema: z.ZodType<CreateCheckoutSessionRequest> =
  z.object({
    planId: z.string().trim().min(1).max(100),
    successUrl: z.url(),
    cancelUrl: z.url(),
  });

export const createBillingPortalSessionSchema: z.ZodType<CreateBillingPortalSessionRequest> =
  z.object({ returnUrl: z.url() });

export const billingEligibilityQuerySchema: z.ZodType<BillingEligibilityQuery> =
  z.object({
    platform: z.nativeEnum(BillingClientPlatform),
    distributionChannel: z.nativeEnum(BillingDistributionChannel),
    storefront: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  });

export const verifyMobilePurchaseSchema: z.ZodType<VerifyMobilePurchaseRequest> =
  z.object({
    provider: z.enum([
      SubscriptionProvider.APPLE,
      SubscriptionProvider.GOOGLE_PLAY,
    ]),
    planId: z.string().trim().min(1).max(200),
    transactionToken: z.string().trim().min(1).max(16_384),
  });

export const restoreMobilePurchasesSchema: z.ZodType<RestoreMobilePurchasesRequest> =
  z.object({
    provider: z.enum([
      SubscriptionProvider.APPLE,
      SubscriptionProvider.GOOGLE_PLAY,
    ]),
  });

export const cursorPageSchema = z.object(cursorFields);

export const createSourceSchema: z.ZodType<CreateSourceRequest> = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9.-]+$/)
    .max(100),
  name: z.string().trim().min(1).max(120),
  baseUrl: z.url(),
  parserVersion: z.string().trim().min(1).max(80),
});

export const updateSourceSchema: z.ZodType<UpdateSourceRequest> = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    baseUrl: z.url().optional(),
    enabled: z.boolean().optional(),
    parserVersion: z.string().trim().min(1).max(80).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required',
  );

export const createImportJobSchema: z.ZodType<CreateImportJobRequest> =
  z.object({
    sourceId: z.string().uuid(),
    mode: z.enum(['FULL', 'INCREMENTAL']),
    additiveCodes: z.array(additiveCodeSchema).max(500).optional(),
  });

export const cancelImportJobSchema: z.ZodType<CancelImportJobRequest> =
  z.object({
    reason: z.string().trim().max(500).optional(),
  });

export const retryImportJobSchema: z.ZodType<RetryImportJobRequest> = z.object({
  failedOnly: z.boolean().optional(),
});

export const updateAdditiveDraftSchema: z.ZodType<UpdateAdditiveDraftRequest> =
  z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      category: z.string().trim().min(1).max(80).optional(),
      description: z.string().trim().min(1).max(20_000).optional(),
      foodIndustryUses: z.string().trim().min(1).max(20_000).optional(),
      healthImpact: z.string().trim().min(1).max(20_000).optional(),
      lowDoseEffects: z.string().trim().max(20_000).nullable().optional(),
      highDoseEffects: z.string().trim().max(20_000).nullable().optional(),
      toxicityLevel: z.nativeEnum(ToxicityLevel).optional(),
      pregnancyStatus: z.nativeEnum(PregnancyStatus).optional(),
      pregnancyReason: z.string().trim().min(1).max(20_000).optional(),
    })
    .refine(
      (value) => Object.keys(value).length > 0,
      'At least one field is required',
    );

export const publishAdditiveSchema: z.ZodType<PublishAdditiveRequest> =
  z.object({
    reviewNote: z.string().trim().min(1).max(2000),
  });

export const unpublishAdditiveSchema: z.ZodType<UnpublishAdditiveRequest> =
  z.object({
    reason: z.string().trim().min(1).max(2000),
  });

export const restoreAdditiveRevisionSchema: z.ZodType<RestoreAdditiveRevisionRequest> =
  z.object({ reason: z.string().trim().min(1).max(2000) });
