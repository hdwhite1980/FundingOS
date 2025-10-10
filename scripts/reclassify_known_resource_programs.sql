-- Reclassify known non‑monetary resource programs in opportunities
-- Idempotent bulk updater: sets ai_analysis.isNonMonetaryResource=true, ensures ai_categories include resource tags,
-- nullifies amounts, and writes audit records to opportunity_reclassification_audit.
--
-- Safe patterns covered:
--  - Google Ad Grants / Nonprofit Advertising (ad_credits)
--  - AWS Promotional Credit Program (cloud_credits)
--
-- How to run (examples):
--  - In Supabase SQL editor: paste and run
--  - With psql: psql "$DATABASE_URL" -f scripts/reclassify_known_resource_programs.sql
--
-- Notes:
--  - acted_by_user_id is left NULL since this is a maintenance job; UI reclassifications will include a user.
--  - Uses array deduping to avoid repeated tags.

begin;

-- Helper: dedupe array (returns distinct text[])
-- Using an inline expression instead of a function for portability

-- Rule 1: Google Ad Grants / Nonprofit Advertising -> ad_credits
with target as (
  select id, ai_analysis, ai_categories
  from opportunities
  where (
    lower(title) like '%google ad grants%'
    or lower(title) like '%nonprofit advertising%'
    or (lower(sponsor) = 'google' and (lower(title) like '%ad grant%' or lower(title) like '%advertis%'))
    or (coalesce(lower(source_url), '') like '%google.com/grants%'
         or coalesce(lower(source_url), '') like '%nonprofits.google.com%')
  )
),
updated as (
  update opportunities o
  set
    amount_min = null,
    amount_max = null,
    estimated_funding = null,
    ai_analysis = (
      -- ensure JSON exists and set flags/types
      with base as (
        select coalesce(o.ai_analysis, '{}'::jsonb) as j
      ),
      with_flag as (
        select jsonb_set(j, '{isNonMonetaryResource}', 'true'::jsonb, true) as j
        from base
      ),
      with_types as (
        select jsonb_set(
          j,
          '{resourceTypes}',
          to_jsonb(
            (select array(select distinct x from unnest(
              coalesce(
                (select array(select jsonb_array_elements_text(coalesce(j->'resourceTypes','[]'::jsonb)))),
                array[]::text[]
              ) || array['ad_credits']
            ) as t(x)))
          ),
          true
        ) as j
        from with_flag
      )
      select j from with_types
    ),
    ai_categories = (
      select array(select distinct x from unnest(coalesce(o.ai_categories, array[]::text[]) || array['resources','non_monetary','ad_credits']) as t(x))
    )
  from target t
  where o.id = t.id
  returning o.id, t.ai_analysis as prev_ai_analysis, t.ai_categories as prev_ai_categories, o.ai_analysis as new_ai_analysis, o.ai_categories as new_ai_categories
)
insert into opportunity_reclassification_audit (
  opportunity_id, acted_by_user_id, action, reason, previous_ai_analysis, new_ai_analysis, previous_ai_categories, new_ai_categories
)
select id::uuid, null, 'mark_non_monetary', 'Bulk reclassify: Google Ad Grants / Nonprofit Advertising', prev_ai_analysis, new_ai_analysis, prev_ai_categories, new_ai_categories
from updated;

-- Rule 2: AWS Promotional Credit Program -> cloud_credits
with target as (
  select id, ai_analysis, ai_categories
  from opportunities
  where (
    lower(title) like '%aws promotional credit%'
    or (lower(sponsor) in ('aws','amazon web services') and (lower(title) like '%credit%' or lower(title) like '%promotional%'))
    or (coalesce(lower(source_url), '') like '%aws.amazon.com/activate%'
         or coalesce(lower(source_url), '') like '%aws.amazon.com/credits%')
  )
),
updated as (
  update opportunities o
  set
    amount_min = null,
    amount_max = null,
    estimated_funding = null,
    ai_analysis = (
      with base as (
        select coalesce(o.ai_analysis, '{}'::jsonb) as j
      ),
      with_flag as (
        select jsonb_set(j, '{isNonMonetaryResource}', 'true'::jsonb, true) as j
        from base
      ),
      with_types as (
        select jsonb_set(
          j,
          '{resourceTypes}',
          to_jsonb(
            (select array(select distinct x from unnest(
              coalesce(
                (select array(select jsonb_array_elements_text(coalesce(j->'resourceTypes','[]'::jsonb)))),
                array[]::text[]
              ) || array['cloud_credits']
            ) as t(x)))
          ),
          true
        ) as j
        from with_flag
      )
      select j from with_types
    ),
    ai_categories = (
      select array(select distinct x from unnest(coalesce(o.ai_categories, array[]::text[]) || array['resources','non_monetary','cloud_credits']) as t(x))
    )
  from target t
  where o.id = t.id
  returning o.id, t.ai_analysis as prev_ai_analysis, t.ai_categories as prev_ai_categories, o.ai_analysis as new_ai_analysis, o.ai_categories as new_ai_categories
)
insert into opportunity_reclassification_audit (
  opportunity_id, acted_by_user_id, action, reason, previous_ai_analysis, new_ai_analysis, previous_ai_categories, new_ai_categories
)
select id::uuid, null, 'mark_non_monetary', 'Bulk reclassify: AWS Promotional Credits', prev_ai_analysis, new_ai_analysis, prev_ai_categories, new_ai_categories
from updated;

commit;
