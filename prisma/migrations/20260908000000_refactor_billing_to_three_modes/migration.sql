-- Migration: Refactor Billing to Three Modes
-- Theo yêu cầu: Reset data billing

BEGIN;

-- Backup existing data
CREATE TABLE IF NOT EXISTS "_backup_TuitionConfig" AS SELECT * FROM "TuitionConfig";

-- Drop and recreate enum with new values
DROP TYPE IF EXISTS "TuitionType_old";
ALTER TYPE "TuitionType" RENAME TO "TuitionType_old";

CREATE TYPE "TuitionType" AS ENUM ('THEO_BUOI', 'THEO_THANG', 'THEO_GOI');

-- Update all rows to default value
UPDATE "TuitionConfig" SET "type" = NULL;

-- Update column type
ALTER TABLE "TuitionConfig" 
  ALTER COLUMN "type" TYPE "TuitionType" USING ("type"::text::"TuitionType"),
  ALTER COLUMN "type" SET DEFAULT 'THEO_BUOI',
  ALTER COLUMN "type" SET NOT NULL;

-- Drop old enum
DROP TYPE IF EXISTS "TuitionType_old";

-- Add customFee column to LessonSession if not exists
ALTER TABLE "LessonSession" ADD COLUMN IF NOT EXISTS "customFee" INTEGER;

COMMIT;
