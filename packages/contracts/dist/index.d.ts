import { z } from 'zod';
export type AdditiveCode = `E${number}` | `E${number}${Uppercase<string>}`;
export type UserId = string;
export type ScanId = string;
export type AnalysisId = string;
export type ComparisonId = string;
export type SourceId = string;
export type ImportJobId = string;
export type ISODateTime = string;
export declare enum ToxicityLevel {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    VERY_HIGH = "VERY_HIGH"
}
export declare enum PregnancyStatus {
    SUITABLE = "SUITABLE",
    CAUTION = "CAUTION",
    NOT_SUITABLE = "NOT_SUITABLE",
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
}
export declare enum ProductRiskLevel {
    LOW = "LOW",
    CAUTION = "CAUTION",
    HIGH = "HIGH",
    VERY_HIGH = "VERY_HIGH",
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
}
export declare enum ScanStatus {
    UPLOADED = "UPLOADED",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    NEEDS_REVIEW = "NEEDS_REVIEW",
    FAILED = "FAILED"
}
export declare enum SubscriptionStatus {
    FREE = "FREE",
    TRIALING = "TRIALING",
    ACTIVE = "ACTIVE",
    PAST_DUE = "PAST_DUE",
    CANCELED = "CANCELED",
    EXPIRED = "EXPIRED"
}
export declare enum SubscriptionProvider {
    STRIPE = "STRIPE",
    APPLE = "APPLE",
    GOOGLE_PLAY = "GOOGLE_PLAY"
}
export declare enum BillingClientPlatform {
    WEB = "WEB",
    IOS = "IOS",
    ANDROID = "ANDROID"
}
export declare enum BillingDistributionChannel {
    WEB_DIRECT = "WEB_DIRECT",
    APP_STORE = "APP_STORE",
    GOOGLE_PLAY = "GOOGLE_PLAY"
}
export declare enum BillingPurchaseAction {
    NONE = "NONE",
    STRIPE_CHECKOUT = "STRIPE_CHECKOUT",
    APP_STORE_PURCHASE = "APP_STORE_PURCHASE",
    GOOGLE_PLAY_PURCHASE = "GOOGLE_PLAY_PURCHASE"
}
export declare enum BillingRestoreAction {
    NONE = "NONE",
    APP_STORE_RESTORE = "APP_STORE_RESTORE",
    GOOGLE_PLAY_RESTORE = "GOOGLE_PLAY_RESTORE"
}
export declare enum BillingManagementAction {
    NONE = "NONE",
    STRIPE_PORTAL = "STRIPE_PORTAL",
    APP_STORE_SUBSCRIPTIONS = "APP_STORE_SUBSCRIPTIONS",
    GOOGLE_PLAY_SUBSCRIPTIONS = "GOOGLE_PLAY_SUBSCRIPTIONS",
    CONTACT_SUPPORT = "CONTACT_SUPPORT"
}
export declare enum BillingEligibilityReason {
    ELIGIBLE = "ELIGIBLE",
    CHANNEL_MISMATCH = "CHANNEL_MISMATCH",
    EXISTING_SUBSCRIPTION = "EXISTING_SUBSCRIPTION"
}
export declare enum ImportJobStatus {
    QUEUED = "QUEUED",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS",
    FAILED = "FAILED",
    CANCELED = "CANCELED"
}
export declare enum EvidenceStatus {
    REVIEW_REQUIRED = "REVIEW_REQUIRED",
    REVIEWED = "REVIEWED"
}
export declare enum UserRole {
    USER = "USER",
    EDITOR = "EDITOR",
    ADMIN = "ADMIN"
}
export declare enum ApiErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    UNAUTHENTICATED = "UNAUTHENTICATED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    RATE_LIMITED = "RATE_LIMITED",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export declare enum ValidationErrorCode {
    INVALID = "INVALID",
    REQUIRED = "REQUIRED",
    TOO_SMALL = "TOO_SMALL",
    TOO_LARGE = "TOO_LARGE",
    UNSUPPORTED = "UNSUPPORTED"
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
    user: {
        id: UserId;
        name: string;
    };
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
export declare enum UnrecognizedIngredientReason {
    NOT_IN_CATALOG = "NOT_IN_CATALOG",
    INVALID_E_NUMBER = "INVALID_E_NUMBER"
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
    productId: string;
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
export declare const additiveCodeSchema: z.ZodPipe<z.ZodString, z.ZodTransform<`E${number}` | `E${number}${Uppercase<string>}`, string>>;
export declare const createTextScanSchema: z.ZodType<CreateTextScanRequest>;
export declare const correctScanIngredientsSchema: z.ZodType<CorrectScanIngredientsRequest>;
export declare const retryScanSchema: z.ZodType<RetryScanRequest>;
export declare const reanalyseProductSchema: z.ZodType<ReanalyseProductRequest>;
export declare const listUserAnalysesSchema: z.ZodObject<{
    filter: z.ZodDefault<z.ZodEnum<{
        RECENT: "RECENT";
        SAVED: "SAVED";
    }>>;
    riskLevel: z.ZodOptional<z.ZodEnum<typeof ProductRiskLevel>>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type ListUserAnalysesQuery = z.infer<typeof listUserAnalysesSchema>;
export declare const searchAdditivesSchema: z.ZodType<SearchAdditivesQuery>;
export declare const updateUserPreferencesSchema: z.ZodType<UpdateUserPreferencesRequest>;
export declare const createComparisonSchema: z.ZodType<CreateComparisonRequest>;
export declare const updateUserProfileSchema: z.ZodType<UpdateUserProfileRequest>;
export declare const registerDeviceSchema: z.ZodType<RegisterDeviceRequest>;
export declare const createDataExportSchema: z.ZodType<CreateDataExportRequest>;
export declare const deleteAccountSchema: z.ZodType<DeleteAccountRequest>;
export declare const createCheckoutSessionSchema: z.ZodType<CreateCheckoutSessionRequest>;
export declare const createBillingPortalSessionSchema: z.ZodType<CreateBillingPortalSessionRequest>;
export declare const billingEligibilityQuerySchema: z.ZodType<BillingEligibilityQuery>;
export declare const verifyMobilePurchaseSchema: z.ZodType<VerifyMobilePurchaseRequest>;
export declare const restoreMobilePurchasesSchema: z.ZodType<RestoreMobilePurchasesRequest>;
export declare const cursorPageSchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const createSourceSchema: z.ZodType<CreateSourceRequest>;
export declare const updateSourceSchema: z.ZodType<UpdateSourceRequest>;
export declare const createImportJobSchema: z.ZodType<CreateImportJobRequest>;
export declare const cancelImportJobSchema: z.ZodType<CancelImportJobRequest>;
export declare const retryImportJobSchema: z.ZodType<RetryImportJobRequest>;
export declare const updateAdditiveDraftSchema: z.ZodType<UpdateAdditiveDraftRequest>;
export declare const publishAdditiveSchema: z.ZodType<PublishAdditiveRequest>;
export declare const unpublishAdditiveSchema: z.ZodType<UnpublishAdditiveRequest>;
export declare const restoreAdditiveRevisionSchema: z.ZodType<RestoreAdditiveRevisionRequest>;
//# sourceMappingURL=index.d.ts.map