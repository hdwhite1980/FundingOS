-- Complete Database Schema Export
-- This script exports all tables, columns, indexes, triggers, and constraints

-- =============================================
-- TABLES AND COLUMNS
-- =============================================

SELECT 
  'TABLE_SCHEMA' as record_type,
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- =============================================
-- INDEXES
-- =============================================

SELECT 
  'INDEX_SCHEMA' as record_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================
-- TRIGGERS
-- =============================================

SELECT 
  'TRIGGER_SCHEMA' as record_type,
  t.trigger_name,
  t.event_manipulation,
  t.event_object_table,
  t.action_timing,
  t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;

-- =============================================
-- CONSTRAINTS
-- =============================================

SELECT 
  'CONSTRAINT_SCHEMA' as record_type,
  tc.constraint_name,
  tc.table_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================
-- FUNCTIONS
-- =============================================

SELECT 
  'FUNCTION_SCHEMA' as record_type,
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;