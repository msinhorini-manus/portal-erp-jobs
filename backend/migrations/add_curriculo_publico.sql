-- Migration: Add curriculo_publico field to candidates table
-- Date: 2025-11-05

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS curriculo_publico BOOLEAN DEFAULT FALSE;

-- Update existing records to have curriculo_publico as false by default
UPDATE candidates 
SET curriculo_publico = FALSE 
WHERE curriculo_publico IS NULL;
