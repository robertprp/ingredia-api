"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreAdditiveRevisionSchema = exports.unpublishAdditiveSchema = exports.publishAdditiveSchema = exports.updateAdditiveDraftSchema = exports.retryImportJobSchema = exports.cancelImportJobSchema = exports.createImportJobSchema = exports.updateSourceSchema = exports.createSourceSchema = exports.cursorPageSchema = exports.restoreMobilePurchasesSchema = exports.verifyMobilePurchaseSchema = exports.billingEligibilityQuerySchema = exports.createBillingPortalSessionSchema = exports.createCheckoutSessionSchema = exports.deleteAccountSchema = exports.createDataExportSchema = exports.registerDeviceSchema = exports.updateUserProfileSchema = exports.updateSavedAnalysisSchema = exports.createComparisonSchema = exports.updateUserPreferencesSchema = exports.searchAdditivesSchema = exports.listUserAnalysesSchema = exports.reanalyseProductSchema = exports.retryScanSchema = exports.correctScanIngredientsSchema = exports.createTextScanSchema = exports.additiveCodeSchema = exports.UnrecognizedIngredientReason = exports.ValidationErrorCode = exports.ApiErrorCode = exports.UserRole = exports.EvidenceStatus = exports.ImportJobStatus = exports.BillingEligibilityReason = exports.BillingManagementAction = exports.BillingRestoreAction = exports.BillingPurchaseAction = exports.BillingDistributionChannel = exports.BillingClientPlatform = exports.SubscriptionProvider = exports.SubscriptionStatus = exports.ScanStatus = exports.ProductRiskLevel = exports.PregnancyStatus = exports.ToxicityLevel = void 0;
const zod_1 = require("zod");
var ToxicityLevel;
(function (ToxicityLevel) {
    ToxicityLevel["LOW"] = "LOW";
    ToxicityLevel["MEDIUM"] = "MEDIUM";
    ToxicityLevel["HIGH"] = "HIGH";
    ToxicityLevel["VERY_HIGH"] = "VERY_HIGH";
})(ToxicityLevel || (exports.ToxicityLevel = ToxicityLevel = {}));
var PregnancyStatus;
(function (PregnancyStatus) {
    PregnancyStatus["SUITABLE"] = "SUITABLE";
    PregnancyStatus["CAUTION"] = "CAUTION";
    PregnancyStatus["NOT_SUITABLE"] = "NOT_SUITABLE";
    PregnancyStatus["INSUFFICIENT_EVIDENCE"] = "INSUFFICIENT_EVIDENCE";
})(PregnancyStatus || (exports.PregnancyStatus = PregnancyStatus = {}));
var ProductRiskLevel;
(function (ProductRiskLevel) {
    ProductRiskLevel["LOW"] = "LOW";
    ProductRiskLevel["CAUTION"] = "CAUTION";
    ProductRiskLevel["HIGH"] = "HIGH";
    ProductRiskLevel["VERY_HIGH"] = "VERY_HIGH";
    ProductRiskLevel["INSUFFICIENT_EVIDENCE"] = "INSUFFICIENT_EVIDENCE";
})(ProductRiskLevel || (exports.ProductRiskLevel = ProductRiskLevel = {}));
var ScanStatus;
(function (ScanStatus) {
    ScanStatus["UPLOADED"] = "UPLOADED";
    ScanStatus["PROCESSING"] = "PROCESSING";
    ScanStatus["COMPLETED"] = "COMPLETED";
    ScanStatus["NEEDS_REVIEW"] = "NEEDS_REVIEW";
    ScanStatus["FAILED"] = "FAILED";
})(ScanStatus || (exports.ScanStatus = ScanStatus = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["FREE"] = "FREE";
    SubscriptionStatus["TRIALING"] = "TRIALING";
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["EXPIRED"] = "EXPIRED";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var SubscriptionProvider;
(function (SubscriptionProvider) {
    SubscriptionProvider["STRIPE"] = "STRIPE";
    SubscriptionProvider["APPLE"] = "APPLE";
    SubscriptionProvider["GOOGLE_PLAY"] = "GOOGLE_PLAY";
})(SubscriptionProvider || (exports.SubscriptionProvider = SubscriptionProvider = {}));
var BillingClientPlatform;
(function (BillingClientPlatform) {
    BillingClientPlatform["WEB"] = "WEB";
    BillingClientPlatform["IOS"] = "IOS";
    BillingClientPlatform["ANDROID"] = "ANDROID";
})(BillingClientPlatform || (exports.BillingClientPlatform = BillingClientPlatform = {}));
var BillingDistributionChannel;
(function (BillingDistributionChannel) {
    BillingDistributionChannel["WEB_DIRECT"] = "WEB_DIRECT";
    BillingDistributionChannel["APP_STORE"] = "APP_STORE";
    BillingDistributionChannel["GOOGLE_PLAY"] = "GOOGLE_PLAY";
})(BillingDistributionChannel || (exports.BillingDistributionChannel = BillingDistributionChannel = {}));
var BillingPurchaseAction;
(function (BillingPurchaseAction) {
    BillingPurchaseAction["NONE"] = "NONE";
    BillingPurchaseAction["STRIPE_CHECKOUT"] = "STRIPE_CHECKOUT";
    BillingPurchaseAction["APP_STORE_PURCHASE"] = "APP_STORE_PURCHASE";
    BillingPurchaseAction["GOOGLE_PLAY_PURCHASE"] = "GOOGLE_PLAY_PURCHASE";
})(BillingPurchaseAction || (exports.BillingPurchaseAction = BillingPurchaseAction = {}));
var BillingRestoreAction;
(function (BillingRestoreAction) {
    BillingRestoreAction["NONE"] = "NONE";
    BillingRestoreAction["APP_STORE_RESTORE"] = "APP_STORE_RESTORE";
    BillingRestoreAction["GOOGLE_PLAY_RESTORE"] = "GOOGLE_PLAY_RESTORE";
})(BillingRestoreAction || (exports.BillingRestoreAction = BillingRestoreAction = {}));
var BillingManagementAction;
(function (BillingManagementAction) {
    BillingManagementAction["NONE"] = "NONE";
    BillingManagementAction["STRIPE_PORTAL"] = "STRIPE_PORTAL";
    BillingManagementAction["APP_STORE_SUBSCRIPTIONS"] = "APP_STORE_SUBSCRIPTIONS";
    BillingManagementAction["GOOGLE_PLAY_SUBSCRIPTIONS"] = "GOOGLE_PLAY_SUBSCRIPTIONS";
    BillingManagementAction["CONTACT_SUPPORT"] = "CONTACT_SUPPORT";
})(BillingManagementAction || (exports.BillingManagementAction = BillingManagementAction = {}));
var BillingEligibilityReason;
(function (BillingEligibilityReason) {
    BillingEligibilityReason["ELIGIBLE"] = "ELIGIBLE";
    BillingEligibilityReason["CHANNEL_MISMATCH"] = "CHANNEL_MISMATCH";
    BillingEligibilityReason["EXISTING_SUBSCRIPTION"] = "EXISTING_SUBSCRIPTION";
})(BillingEligibilityReason || (exports.BillingEligibilityReason = BillingEligibilityReason = {}));
var ImportJobStatus;
(function (ImportJobStatus) {
    ImportJobStatus["QUEUED"] = "QUEUED";
    ImportJobStatus["RUNNING"] = "RUNNING";
    ImportJobStatus["COMPLETED"] = "COMPLETED";
    ImportJobStatus["COMPLETED_WITH_ERRORS"] = "COMPLETED_WITH_ERRORS";
    ImportJobStatus["FAILED"] = "FAILED";
    ImportJobStatus["CANCELED"] = "CANCELED";
})(ImportJobStatus || (exports.ImportJobStatus = ImportJobStatus = {}));
var EvidenceStatus;
(function (EvidenceStatus) {
    EvidenceStatus["REVIEW_REQUIRED"] = "REVIEW_REQUIRED";
    EvidenceStatus["REVIEWED"] = "REVIEWED";
})(EvidenceStatus || (exports.EvidenceStatus = EvidenceStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["EDITOR"] = "EDITOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var ApiErrorCode;
(function (ApiErrorCode) {
    ApiErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ApiErrorCode["UNAUTHENTICATED"] = "UNAUTHENTICATED";
    ApiErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ApiErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ApiErrorCode["CONFLICT"] = "CONFLICT";
    ApiErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    ApiErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ApiErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ApiErrorCode || (exports.ApiErrorCode = ApiErrorCode = {}));
var ValidationErrorCode;
(function (ValidationErrorCode) {
    ValidationErrorCode["INVALID"] = "INVALID";
    ValidationErrorCode["REQUIRED"] = "REQUIRED";
    ValidationErrorCode["TOO_SMALL"] = "TOO_SMALL";
    ValidationErrorCode["TOO_LARGE"] = "TOO_LARGE";
    ValidationErrorCode["UNSUPPORTED"] = "UNSUPPORTED";
})(ValidationErrorCode || (exports.ValidationErrorCode = ValidationErrorCode = {}));
var UnrecognizedIngredientReason;
(function (UnrecognizedIngredientReason) {
    UnrecognizedIngredientReason["NOT_IN_CATALOG"] = "NOT_IN_CATALOG";
    UnrecognizedIngredientReason["INVALID_E_NUMBER"] = "INVALID_E_NUMBER";
})(UnrecognizedIngredientReason || (exports.UnrecognizedIngredientReason = UnrecognizedIngredientReason = {}));
const cursorFields = {
    cursor: zod_1.z.string().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
};
exports.additiveCodeSchema = zod_1.z
    .string()
    .trim()
    .regex(/^E\d{3,4}[A-Z]{0,3}$/)
    .transform((value) => value);
exports.createTextScanSchema = zod_1.z.object({
    productName: zod_1.z.string().trim().min(1).max(200),
    ingredientsText: zod_1.z.string().trim().min(1).max(10_000),
});
exports.correctScanIngredientsSchema = zod_1.z.object({ ingredientsText: zod_1.z.string().trim().min(1).max(10_000) });
exports.retryScanSchema = zod_1.z.object({
    requestedReason: zod_1.z.string().trim().max(500).optional(),
});
exports.reanalyseProductSchema = zod_1.z.object({
    useCurrentPreferences: zod_1.z.boolean().optional(),
});
exports.listUserAnalysesSchema = zod_1.z.object({
    ...cursorFields,
    filter: zod_1.z.enum(['RECENT', 'SAVED']).default('RECENT'),
    riskLevel: zod_1.z.nativeEnum(ProductRiskLevel).optional(),
});
exports.searchAdditivesSchema = zod_1.z.object({
    ...cursorFields,
    q: zod_1.z.string().trim().max(200).optional(),
    category: zod_1.z.string().trim().max(80).optional(),
    toxicityLevel: zod_1.z.nativeEnum(ToxicityLevel).optional(),
    pregnancyStatus: zod_1.z.nativeEnum(PregnancyStatus).optional(),
    sourceId: zod_1.z.string().uuid().optional(),
    sort: zod_1.z.enum(['CODE', 'NAME', 'TOXICITY']).default('CODE'),
});
exports.updateUserPreferencesSchema = zod_1.z
    .object({
    pregnancyMode: zod_1.z.boolean().optional(),
    riskAlerts: zod_1.z.boolean().optional(),
    locale: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z]{2}-[A-Z]{2}$/)
        .optional(),
})
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
exports.createComparisonSchema = zod_1.z.object({
    analysisIds: zod_1.z
        .tuple([zod_1.z.string().uuid(), zod_1.z.string().uuid()])
        .refine(([left, right]) => left !== right, 'Analyses must be different'),
});
exports.updateSavedAnalysisSchema = zod_1.z.object({ saved: zod_1.z.boolean() });
exports.updateUserProfileSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(120).optional(),
    locale: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z]{2}-[A-Z]{2}$/)
        .optional(),
})
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
exports.registerDeviceSchema = zod_1.z.object({
    token: zod_1.z.string().trim().min(16).max(4096),
    platform: zod_1.z.enum(['IOS', 'ANDROID', 'WEB']),
});
exports.createDataExportSchema = zod_1.z.object({
    format: zod_1.z.literal('JSON'),
});
exports.deleteAccountSchema = zod_1.z.object({
    confirmation: zod_1.z.literal('DELETE'),
});
exports.createCheckoutSessionSchema = zod_1.z.object({
    planId: zod_1.z.string().trim().min(1).max(100),
    successUrl: zod_1.z.url(),
    cancelUrl: zod_1.z.url(),
});
exports.createBillingPortalSessionSchema = zod_1.z.object({ returnUrl: zod_1.z.url() });
exports.billingEligibilityQuerySchema = zod_1.z.object({
    platform: zod_1.z.nativeEnum(BillingClientPlatform),
    distributionChannel: zod_1.z.nativeEnum(BillingDistributionChannel),
    storefront: zod_1.z
        .string()
        .regex(/^[A-Z]{2}$/)
        .optional(),
});
exports.verifyMobilePurchaseSchema = zod_1.z.object({
    provider: zod_1.z.enum([
        SubscriptionProvider.APPLE,
        SubscriptionProvider.GOOGLE_PLAY,
    ]),
    planId: zod_1.z.string().trim().min(1).max(200),
    transactionToken: zod_1.z.string().trim().min(1).max(16_384),
});
exports.restoreMobilePurchasesSchema = zod_1.z.object({
    provider: zod_1.z.enum([
        SubscriptionProvider.APPLE,
        SubscriptionProvider.GOOGLE_PLAY,
    ]),
});
exports.cursorPageSchema = zod_1.z.object(cursorFields);
exports.createSourceSchema = zod_1.z.object({
    key: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z0-9.-]+$/)
        .max(100),
    name: zod_1.z.string().trim().min(1).max(120),
    baseUrl: zod_1.z.url(),
    parserVersion: zod_1.z.string().trim().min(1).max(80),
});
exports.updateSourceSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(120).optional(),
    baseUrl: zod_1.z.url().optional(),
    enabled: zod_1.z.boolean().optional(),
    parserVersion: zod_1.z.string().trim().min(1).max(80).optional(),
})
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
exports.createImportJobSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    mode: zod_1.z.enum(['FULL', 'INCREMENTAL']),
    additiveCodes: zod_1.z.array(exports.additiveCodeSchema).max(500).optional(),
});
exports.cancelImportJobSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().max(500).optional(),
});
exports.retryImportJobSchema = zod_1.z.object({
    failedOnly: zod_1.z.boolean().optional(),
});
exports.updateAdditiveDraftSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(1).max(200).optional(),
    category: zod_1.z.string().trim().min(1).max(80).optional(),
    description: zod_1.z.string().trim().min(1).max(20_000).optional(),
    foodIndustryUses: zod_1.z.string().trim().min(1).max(20_000).optional(),
    healthImpact: zod_1.z.string().trim().min(1).max(20_000).optional(),
    lowDoseEffects: zod_1.z.string().trim().max(20_000).nullable().optional(),
    highDoseEffects: zod_1.z.string().trim().max(20_000).nullable().optional(),
    toxicityLevel: zod_1.z.nativeEnum(ToxicityLevel).optional(),
    pregnancyStatus: zod_1.z.nativeEnum(PregnancyStatus).optional(),
    pregnancyReason: zod_1.z.string().trim().min(1).max(20_000).optional(),
})
    .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
exports.publishAdditiveSchema = zod_1.z.object({
    reviewNote: zod_1.z.string().trim().min(1).max(2000),
});
exports.unpublishAdditiveSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().min(1).max(2000),
});
exports.restoreAdditiveRevisionSchema = zod_1.z.object({ reason: zod_1.z.string().trim().min(1).max(2000) });
