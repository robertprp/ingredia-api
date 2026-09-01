CREATE TYPE "scanStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'NEEDS_REVIEW', 'FAILED');
CREATE TYPE "productRiskLevel" AS ENUM ('LOW', 'CAUTION', 'HIGH', 'VERY_HIGH', 'INSUFFICIENT_EVIDENCE');
CREATE TYPE "analysisPregnancyRisk" AS ENUM ('SUITABLE', 'CAUTION', 'NOT_SUITABLE', 'INSUFFICIENT_EVIDENCE');

CREATE TABLE "userPreference" (
  "userId" TEXT NOT NULL,
  "pregnancyMode" BOOLEAN NOT NULL DEFAULT false,
  "riskAlerts" BOOLEAN NOT NULL DEFAULT true,
  "locale" TEXT NOT NULL DEFAULT 'es-ES',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "userPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "scanUsage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "consumed" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scanUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "status" "scanStatus" NOT NULL DEFAULT 'UPLOADED',
  "imageMimeType" TEXT NOT NULL,
  "imageSize" INTEGER NOT NULL,
  "productName" TEXT,
  "ingredientsText" TEXT,
  "ocrConfidence" DOUBLE PRECISION,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "failureRetryable" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "scanId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "ingredientsText" TEXT NOT NULL,
  "overallRisk" "productRiskLevel" NOT NULL,
  "pregnancyRisk" "analysisPregnancyRisk" NOT NULL,
  "summary" TEXT NOT NULL,
  "detectedAdditives" JSONB NOT NULL,
  "unrecognizedIngredients" JSONB NOT NULL,
  "pregnancyModeApplied" BOOLEAN NOT NULL DEFAULT false,
  "saved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "analysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comparison" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "leftAnalysisId" UUID NOT NULL,
  "rightAnalysisId" UUID NOT NULL,
  "recommendedAnalysisId" UUID,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comparison_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accountDeletionRequest" (
  "userId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accountDeletionRequest_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "billingProductReference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "planId" TEXT NOT NULL,
  "provider" "billingProvider" NOT NULL,
  "environment" "billingEnvironment" NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billingProductReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" "billingProvider" NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "billingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scanUsage_userId_periodStart_key" ON "scanUsage"("userId", "periodStart");
CREATE INDEX "scan_userId_createdAt_idx" ON "scan"("userId", "createdAt");
CREATE UNIQUE INDEX "analysis_scanId_key" ON "analysis"("scanId");
CREATE INDEX "analysis_userId_createdAt_idx" ON "analysis"("userId", "createdAt");
CREATE INDEX "analysis_userId_saved_createdAt_idx" ON "analysis"("userId", "saved", "createdAt");
CREATE INDEX "comparison_userId_createdAt_idx" ON "comparison"("userId", "createdAt");
CREATE UNIQUE INDEX "billingProductReference_provider_environment_productId_key" ON "billingProductReference"("provider", "environment", "productId");
CREATE UNIQUE INDEX "billingProductReference_planId_provider_environment_key" ON "billingProductReference"("planId", "provider", "environment");
CREATE INDEX "billingWebhookEvent_provider_receivedAt_idx" ON "billingWebhookEvent"("provider", "receivedAt");

ALTER TABLE "userPreference" ADD CONSTRAINT "userPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scanUsage" ADD CONSTRAINT "scanUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scan" ADD CONSTRAINT "scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analysis" ADD CONSTRAINT "analysis_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comparison" ADD CONSTRAINT "comparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accountDeletionRequest" ADD CONSTRAINT "accountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billingProductReference" ADD CONSTRAINT "billingProductReference_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
