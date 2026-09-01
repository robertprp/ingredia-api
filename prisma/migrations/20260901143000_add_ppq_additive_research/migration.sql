ALTER TABLE "additiveSourceRecord"
ADD COLUMN "evidenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "researchModel" TEXT,
ADD COLUMN "externalRecordId" TEXT;
