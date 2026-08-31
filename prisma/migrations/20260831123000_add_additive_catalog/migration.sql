CREATE TYPE "ToxicityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');
CREATE TYPE "PregnancySuitability" AS ENUM ('SUITABLE', 'NOT_SUITABLE', 'UNKNOWN');
CREATE TYPE "CurationStatus" AS ENUM ('AUTO_GENERATED', 'REVIEW_REQUIRED', 'REVIEWED');
CREATE TYPE "IngestionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "additive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "e_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "food_uses" TEXT NOT NULL,
    "health_impact" TEXT NOT NULL,
    "low_dose_effects" TEXT,
    "high_dose_effects" TEXT,
    "toxicity_level" "ToxicityLevel" NOT NULL,
    "pregnancy_suitability" "PregnancySuitability" NOT NULL DEFAULT 'UNKNOWN',
    "pregnancy_rationale" TEXT NOT NULL,
    "curation_status" "CurationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "content_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "additive_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "additive_alias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "additive_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "additive_alias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "information_source" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "information_source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "additive_source_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "additive_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "food_uses" TEXT NOT NULL,
    "health_impact" TEXT NOT NULL,
    "low_dose_effects" TEXT,
    "high_dose_effects" TEXT,
    "toxicity_level" "ToxicityLevel" NOT NULL,
    "source_classification" TEXT,
    "pregnancy_suitability" "PregnancySuitability" NOT NULL DEFAULT 'UNKNOWN',
    "pregnancy_rationale" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "additive_source_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "additive_ingestion_run" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "status" "IngestionStatus" NOT NULL DEFAULT 'RUNNING',
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "additive_ingestion_run_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "additive_e_number_key" ON "additive"("e_number");
CREATE INDEX "additive_toxicity_level_idx" ON "additive"("toxicity_level");
CREATE INDEX "additive_pregnancy_suitability_idx" ON "additive"("pregnancy_suitability");
CREATE UNIQUE INDEX "additive_alias_additive_id_normalized_name_key" ON "additive_alias"("additive_id", "normalized_name");
CREATE INDEX "additive_alias_normalized_name_idx" ON "additive_alias"("normalized_name");
CREATE UNIQUE INDEX "information_source_key_key" ON "information_source"("key");
CREATE UNIQUE INDEX "additive_source_record_additive_id_source_id_key" ON "additive_source_record"("additive_id", "source_id");
CREATE INDEX "additive_source_record_source_id_last_seen_at_idx" ON "additive_source_record"("source_id", "last_seen_at");
CREATE INDEX "additive_ingestion_run_source_id_started_at_idx" ON "additive_ingestion_run"("source_id", "started_at");

ALTER TABLE "additive_alias" ADD CONSTRAINT "additive_alias_additive_id_fkey" FOREIGN KEY ("additive_id") REFERENCES "additive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "additive_source_record" ADD CONSTRAINT "additive_source_record_additive_id_fkey" FOREIGN KEY ("additive_id") REFERENCES "additive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "additive_source_record" ADD CONSTRAINT "additive_source_record_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "information_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "additive_ingestion_run" ADD CONSTRAINT "additive_ingestion_run_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "information_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
