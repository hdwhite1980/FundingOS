-- COMPREHENSIVE SECURITY FEATURES STATUS CHECK
-- Run this to see which authentication and security features are ready

-- ================================================================
-- 1. CHECK EXISTING TABLES AND THEIR COLUMNS
-- ================================================================

SELECT 
  'TABLE STATUS' as check_type,
  'user_profiles' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name='user_profiles'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name='user_profiles'
  ) as column_count
UNION ALL
SELECT 
  'TABLE STATUS',
  'user_sessions',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name='user_sessions'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END,
  (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name='user_sessions'
  )
UNION ALL
SELECT 
  'TABLE STATUS',
  'user_devices',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name='user_devices'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END,
  (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name='user_devices'
  );

-- ================================================================
-- 2. CHECK 2FA COLUMNS IN USER_PROFILES
-- ================================================================

SELECT 
  'USER_PROFILES 2FA' as check_type,
  c.column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='user_profiles' AND column_name=c.column_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COALESCE(ic.data_type, 'N/A') as type
FROM (
  VALUES 
    ('two_factor_enabled'),
    ('two_factor_secret'),
    ('two_factor_secret_temp'),
    ('two_factor_backup_codes')
) AS c(column_name)
LEFT JOIN information_schema.columns ic 
  ON ic.table_name='user_profiles' AND ic.column_name=c.column_name;

-- ================================================================
-- 3. CHECK SESSION TRACKING COLUMNS
-- ================================================================

SELECT 
  'USER_SESSIONS' as check_type,
  c.column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='user_sessions' AND column_name=c.column_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COALESCE(ic.data_type, 'N/A') as type
FROM (
  VALUES 
    ('device_fingerprint'),
    ('deactivated_at'),
    ('deactivation_reason'),
    ('ip_address'),
    ('user_agent'),
    ('is_active')
) AS c(column_name)
LEFT JOIN information_schema.columns ic 
  ON ic.table_name='user_sessions' AND ic.column_name=c.column_name;

-- ================================================================
-- 4. CHECK DEVICE MANAGEMENT COLUMNS
-- ================================================================

SELECT 
  'USER_DEVICES' as check_type,
  c.column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='user_devices' AND column_name=c.column_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COALESCE(ic.data_type, 'N/A') as type
FROM (
  VALUES 
    ('device_fingerprint'),
    ('user_agent'),
    ('last_ip'),
    ('is_trusted'),
    ('trusted_at'),
    ('is_active'),
    ('removed_at')
) AS c(column_name)
LEFT JOIN information_schema.columns ic 
  ON ic.table_name='user_devices' AND ic.column_name=c.column_name;

-- ================================================================
-- 5. CHECK ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

SELECT 
  'RLS POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN cmd LIKE '%SELECT%' THEN 'SELECT'
    WHEN cmd LIKE '%INSERT%' THEN 'INSERT'
    WHEN cmd LIKE '%UPDATE%' THEN 'UPDATE'
    WHEN cmd LIKE '%DELETE%' THEN 'DELETE'
    ELSE 'ALL'
  END as policy_type,
  '✅ ACTIVE' as status
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_sessions', 'user_devices')
ORDER BY tablename, policyname;

-- ================================================================
-- 6. CHECK INDEXES FOR PERFORMANCE
-- ================================================================

SELECT 
  'INDEXES' as check_type,
  t.relname as table_name,
  i.relname as index_name,
  CASE 
    WHEN i.relname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status,
  COALESCE(am.amname, 'N/A') as index_type
FROM pg_class t
LEFT JOIN pg_index ix ON t.oid = ix.indrelid
LEFT JOIN pg_class i ON i.oid = ix.indexrelid
LEFT JOIN pg_am am ON i.relam = am.oid
WHERE t.relkind = 'r'
  AND t.relname IN ('user_profiles', 'user_sessions', 'user_devices')
  AND i.relname IS NOT NULL
ORDER BY t.relname, i.relname;

-- ================================================================
-- 7. CHECK TRIGGER FUNCTIONS
-- ================================================================

SELECT 
  'TRIGGER FUNCTIONS' as check_type,
  routine_name as function_name,
  '✅ EXISTS' as status,
  routine_type as type
FROM information_schema.routines
WHERE routine_name IN (
  'update_updated_at_column',
  'update_session_activity',
  'cleanup_old_sessions',
  'cleanup_inactive_devices'
) 
AND routine_schema = 'public'
ORDER BY routine_name;

-- ================================================================
-- 8. SUMMARY REPORT
-- ================================================================

SELECT 
  'FEATURE SUMMARY' as check_type,
  feature_name,
  CASE 
    WHEN required_tables = existing_tables AND required_columns = existing_columns 
    THEN '✅ READY' 
    ELSE '❌ NEEDS MIGRATION'
  END as status,
  CONCAT(existing_columns, '/', required_columns) as columns_status
FROM (
  SELECT 
    'Two-Factor Authentication' as feature_name,
    1 as required_tables,
    4 as required_columns,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_profiles') THEN 1 ELSE 0 END as existing_tables,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_profiles' AND column_name IN ('two_factor_enabled', 'two_factor_secret', 'two_factor_secret_temp', 'two_factor_backup_codes')) as existing_columns
  UNION ALL
  SELECT 
    'Active Session Management',
    1,
    6,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_sessions') THEN 1 ELSE 0 END,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_sessions' AND column_name IN ('device_fingerprint', 'deactivated_at', 'deactivation_reason', 'ip_address', 'user_agent', 'is_active'))
  UNION ALL
  SELECT 
    'Device Management',
    1,
    7,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='user_devices') THEN 1 ELSE 0 END,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_devices' AND column_name IN ('device_fingerprint', 'user_agent', 'last_ip', 'is_trusted', 'trusted_at', 'is_active', 'removed_at'))
) feature_check
ORDER BY feature_name;

-- ================================================================
-- 9. NEXT STEPS RECOMMENDATIONS
-- ================================================================

SELECT 
  'RECOMMENDATIONS' as check_type,
  recommendation,
  priority as priority_level,
  'ACTION REQUIRED' as status
FROM (
  SELECT 
    '1. Run fix-device-fingerprint-error.sql to create all missing tables/columns' as recommendation,
    'HIGH' as priority
  UNION ALL
  SELECT 
    '2. Test 2FA setup/disable functionality in Account Settings',
    'HIGH'
  UNION ALL
  SELECT 
    '3. Test Active Sessions view and logout functionality',
    'MEDIUM'
  UNION ALL
  SELECT 
    '4. Test Device Management trust/untrust functionality',
    'MEDIUM'
  UNION ALL
  SELECT 
    '5. Verify all API endpoints return proper data',
    'HIGH'
) recommendations
ORDER BY priority DESC;