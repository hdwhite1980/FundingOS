-- Expected schema for the investors table
-- This is what the table SHOULD have based on the app's usage

/*
Expected columns for investors table:
- id (UUID, primary key)
- user_id (UUID, foreign key to auth.users)
- name (VARCHAR/TEXT) - Investor/donor name
- email (VARCHAR/TEXT) - Contact email
- phone (VARCHAR/TEXT) - Contact phone
- company (VARCHAR/TEXT) - Company/organization name
- investor_type (VARCHAR) - Type: 'angel', 'vc', 'family_office', 'individual', etc.
- status (VARCHAR) - Status: 'active', 'inactive', 'prospective', etc.
- investment_range_min (NUMERIC/INTEGER) - Minimum investment amount
- investment_range_max (NUMERIC/INTEGER) - Maximum investment amount
- focus_areas (TEXT/TEXT[]) - Investment focus areas
- location (VARCHAR/TEXT) - Location/region
- notes (TEXT) - Additional notes
- website (VARCHAR/TEXT) - Website URL
- linkedin (VARCHAR/TEXT) - LinkedIn profile
- preferred_contact_method (VARCHAR) - Email, phone, etc.
- last_contact_date (TIMESTAMP) - Last contact timestamp
- next_followup_date (TIMESTAMP) - Next follow-up date
- tags (TEXT[] or JSONB) - Tags for categorization
- metadata (JSONB) - Additional flexible data
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
*/

-- Note: The error mentions 'donor_type' which suggests the app might be trying to 
-- insert into a donors-related field. Let's check what columns are actually being used.
