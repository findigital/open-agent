-- Migration: Add character limits and scoring support to proposal sections
-- Date: 2025-01-26
-- Description: Adds character limit fields and enhances metadata to support scoring rubrics

-- Add character limit fields to proposal_sections
ALTER TABLE "proposal_sections"
  ADD COLUMN IF NOT EXISTS "character_limit" INTEGER,
  ADD COLUMN IF NOT EXISTS "character_limit_no_spaces" INTEGER;

-- Add character limit fields to template_sections
ALTER TABLE "template_sections"
  ADD COLUMN IF NOT EXISTS "character_limit" INTEGER,
  ADD COLUMN IF NOT EXISTS "character_limit_no_spaces" INTEGER;

-- Add comment explaining the metadata field usage
COMMENT ON COLUMN "proposal_sections"."metadata" IS 'Stores scoring rubric info, constraints, and strategic guidance. Schema: {constraints: {wordLimit, characterLimit, characterLimitNoSpaces, isHardLimit, warningThreshold}, scoring: {maxPoints, percentage, description, reviewerLookFor, commonPitfalls}, strategicGuidance: string, required: boolean}';

COMMENT ON COLUMN "template_sections"."metadata" IS 'Stores default constraints and scoring rubric for template. Same schema as proposal_sections.metadata';

-- Note: The metadata JsonB field already exists and can store scoring rubric information
-- No changes needed to metadata structure
