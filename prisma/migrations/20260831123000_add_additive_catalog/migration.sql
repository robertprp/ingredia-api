CREATE TYPE "toxicityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');
CREATE TYPE "pregnancySuitability" AS ENUM ('SUITABLE', 'NOT_SUITABLE', 'UNKNOWN');
CREATE TYPE "curationStatus" AS ENUM ('AUTO_GENERATED', 'REVIEW_REQUIRED', 'REVIEWED');
CREATE TYPE "ingestionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "additive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "foodUses" TEXT NOT NULL,
    "healthImpact" TEXT NOT NULL,
    "lowDoseEffects" TEXT,
    "highDoseEffects" TEXT,
    "toxicityLevel" "toxicityLevel" NOT NULL,
    "pregnancySuitability" "pregnancySuitability" NOT NULL DEFAULT 'UNKNOWN',
    "pregnancyRationale" TEXT NOT NULL,
    "curationStatus" "curationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "additive_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "additiveAlias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "additiveId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "additive_alias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "informationSource" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "information_source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "additiveSourceRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "additiveId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "foodUses" TEXT NOT NULL,
    "healthImpact" TEXT NOT NULL,
    "lowDoseEffects" TEXT,
    "highDoseEffects" TEXT,
    "toxicityLevel" "toxicityLevel" NOT NULL,
    "sourceClassification" TEXT,
    "pregnancySuitability" "pregnancySuitability" NOT NULL DEFAULT 'UNKNOWN',
    "pregnancyRationale" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "additive_source_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "additiveIngestionRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL,
    "status" "ingestionStatus" NOT NULL DEFAULT 'RUNNING',
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "additive_ingestion_run_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "additive_e_number_key" ON "additive"("eNumber");
CREATE INDEX "additive_toxicity_level_idx" ON "additive"("toxicityLevel");
CREATE INDEX "additive_pregnancy_suitability_idx" ON "additive"("pregnancySuitability");
CREATE UNIQUE INDEX "additive_alias_additive_id_normalized_name_key" ON "additiveAlias"("additiveId", "normalizedName");
CREATE INDEX "additive_alias_normalized_name_idx" ON "additiveAlias"("normalizedName");
CREATE UNIQUE INDEX "information_source_key_key" ON "informationSource"("key");
CREATE UNIQUE INDEX "additive_source_record_additive_id_source_id_key" ON "additiveSourceRecord"("additiveId", "sourceId");
CREATE INDEX "additive_source_record_source_id_last_seen_at_idx" ON "additiveSourceRecord"("sourceId", "lastSeenAt");
CREATE INDEX "additive_ingestion_run_source_id_started_at_idx" ON "additiveIngestionRun"("sourceId", "startedAt");

ALTER TABLE "additiveAlias" ADD CONSTRAINT "additive_alias_additive_id_fkey" FOREIGN KEY ("additiveId") REFERENCES "additive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "additiveSourceRecord" ADD CONSTRAINT "additive_source_record_additive_id_fkey" FOREIGN KEY ("additiveId") REFERENCES "additive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "additiveSourceRecord" ADD CONSTRAINT "additive_source_record_source_id_fkey" FOREIGN KEY ("sourceId") REFERENCES "informationSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "additiveIngestionRun" ADD CONSTRAINT "additive_ingestion_run_source_id_fkey" FOREIGN KEY ("sourceId") REFERENCES "informationSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;