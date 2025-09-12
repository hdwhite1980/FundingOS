-- SAM.gov Usage Tracking Schema
-- This script creates tables and functions to track daily API usage for rate limiting

-- Create table to track SAM.gov API usage
CREATE TABLE IF NOT EXISTS sam_gov_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sam_gov_usage_date ON sam_gov_usage(date);

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_sam_usage(usage_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO sam_gov_usage (date, request_count)
  VALUES (usage_date, 1)
  ON CONFLICT (date)
  DO UPDATE SET 
    request_count = sam_gov_usage.request_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create RLS policy
ALTER TABLE sam_gov_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage usage tracking
CREATE POLICY "Service can manage SAM usage" ON sam_gov_usage
  FOR ALL USING (true);

COMMENT ON TABLE sam_gov_usage IS 'Tracks daily SAM.gov API usage for rate limiting (10 requests per day for non-federal users)';
COMMENT ON FUNCTION increment_sam_usage IS 'Safely increments the daily request count for SAM.gov API usage tracking';