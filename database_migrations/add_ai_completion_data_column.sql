-- Migration to add ai_completion_data column to submissions table
-- Run this SQL query in your Supabase SQL editor

-- Add ai_completion_data column as JSONB to store AI completion metadata
ALTER TABLE submissions 
ADD COLUMN ai_completion_data JSONB;

-- Add comment to document the column purpose
COMMENT ON COLUMN submissions.ai_completion_data IS 'Stores AI completion metadata including completion percentage, confidence, analysis date, documents analyzed, and questions answered';

-- Create an index for better query performance on the JSONB data
CREATE INDEX IF NOT EXISTS idx_submissions_ai_completion_data 
ON submissions USING GIN (ai_completion_data);

-- Optional: Add some sample data structure for reference
-- The ai_completion_data column will store JSON like:
-- {
--   "completionPercentage": 85,
--   "confidence": 0.92,
--   "analysisDate": "2025-09-13T18:00:00Z",
--   "documentsAnalyzed": 3,
--   "questionsAnswered": 12
-- }