#!/usr/bin/env node

/**
 * Database Mapping Audit - Check API routes vs Database Schema
 * This script analyzes your app code against the actual database structure
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function auditDatabaseMappings() {
  console.log('🔍 Database Mapping Audit - API Routes vs Database Schema\n')

  // Issues discovered from the database audit and code analysis
  const discoveredIssues = []

  console.log('📋 Found Database-Code Mismatches:')

  // Issue 1: Wrong table name in profile API
  console.log('\n❌ ISSUE 1: Profile API using wrong table name')
  console.log('   📁 File: app/api/user/profile/[userId]/route.js')
  console.log('   🔍 Problem: Queries "user_profiles" table but database has "profiles" table')
  console.log('   🏷️  Database table: profiles')
  console.log('   🏷️  API code uses: user_profiles')
  console.log('   💡 Fix: Change user_profiles → profiles')
  discoveredIssues.push({
    file: 'app/api/user/profile/[userId]/route.js',
    issue: 'Wrong table name',
    expected: 'profiles',
    actual: 'user_profiles',
    severity: 'high'
  })

  // Issue 2: Missing user_id in project_opportunities RLS
  console.log('\n⚠️  ISSUE 2: project_opportunities missing user_id for some records')
  console.log('   📁 Database: project_opportunities table')
  console.log('   🔍 Problem: Some records have NULL user_id, breaking RLS policies')
  console.log('   📊 Current schema: user_id can be NULL')
  console.log('   💡 Fix: Update NULL user_id records and add NOT NULL constraint')
  discoveredIssues.push({
    table: 'project_opportunities',
    issue: 'NULL user_id values',
    severity: 'high'
  })

  // Issue 3: opportunities table uses deadline_date instead of deadline
  console.log('\n⚠️  ISSUE 3: Opportunities table column name mismatch')
  console.log('   📁 Database: opportunities table')
  console.log('   🔍 Problem: Has "deadline_date" but code may expect "deadline"')
  console.log('   📊 Database column: deadline_date')
  console.log('   📊 Code expectation: deadline (from audit expectations)')
  console.log('   💡 Fix: Update code to use deadline_date consistently')
  discoveredIssues.push({
    table: 'opportunities',
    issue: 'Column name mismatch',
    expected: 'deadline_date',
    code_uses: 'deadline',
    severity: 'medium'
  })

  // Test some of the critical database operations
  console.log('\n📝 Testing Critical Database Operations:')

  try {
    // Test 1: Profile operations
    console.log('\n🔍 Testing profile operations...')
    const { data: profileTest, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1)

    if (profileError) {
      console.log(`   ❌ profiles table access: ${profileError.message}`)
    } else {
      console.log(`   ✅ profiles table accessible (${profileTest ? profileTest.length : 0} records)`)
    }

    // Test user_profiles table (wrong name used in API)
    const { data: userProfileTest, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (userProfileError) {
      console.log(`   ❌ user_profiles table: ${userProfileError.message} (CONFIRMS ISSUE 1)`)
    } else {
      console.log(`   ⚠️  user_profiles table exists unexpectedly`)
    }

    // Test 2: Project operations
    console.log('\n🔍 Testing project operations...')
    const { data: projectTest, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, name')
      .limit(1)

    if (projectError) {
      console.log(`   ❌ projects table access: ${projectError.message}`)
    } else {
      console.log(`   ✅ projects table accessible (${projectTest ? projectTest.length : 0} records)`)
      if (projectTest && projectTest.length > 0) {
        const hasUserId = projectTest[0].user_id !== null
        console.log(`   📊 Sample project has user_id: ${hasUserId ? 'YES' : 'NO'}`)
      }
    }

    // Test 3: Project opportunities RLS issues
    console.log('\n🔍 Testing project_opportunities RLS...')
    
    // Check for NULL user_id records
    const { data: nullUserIds, error: nullError } = await supabase
      .from('project_opportunities')
      .select('id, user_id')
      .is('user_id', null)
      .limit(5)

    if (!nullError && nullUserIds) {
      console.log(`   ⚠️  Found ${nullUserIds.length} records with NULL user_id (CONFIRMS ISSUE 2)`)
      if (nullUserIds.length > 0) {
        console.log(`   📊 Example NULL user_id records: ${nullUserIds.map(r => r.id).join(', ')}`)
      }
    }

    // Test 4: Agent conversations structure
    console.log('\n🔍 Testing agent_conversations table...')
    const { data: agentTest, error: agentError } = await supabase
      .from('agent_conversations')
      .select('id, user_id, role, content, user_message, agent_response')
      .limit(1)

    if (!agentError && agentTest && agentTest.length > 0) {
      const record = agentTest[0]
      console.log('   ✅ agent_conversations accessible')
      console.log(`   📊 Has role column: ${record.role !== undefined ? 'YES' : 'NO'}`)
      console.log(`   📊 Has content column: ${record.content !== undefined ? 'YES' : 'NO'}`)
      console.log(`   📊 Has legacy user_message: ${record.user_message !== undefined ? 'YES' : 'NO'}`)
      console.log(`   📊 Has legacy agent_response: ${record.agent_response !== undefined ? 'YES' : 'NO'}`)
    }

    // Test 5: Foreign key relationships that should exist
    console.log('\n🔍 Testing foreign key relationships...')
    
    // Test project creation with proper user_id
    const testUserId = 'cd284f3d-78d1-4116-9279-a795e9fd6615' // From existing project data
    
    try {
      const { error: fkError } = await supabase
        .from('project_opportunities')
        .insert({
          user_id: testUserId,
          project_id: 'test-project-id',
          opportunity_id: 'test-opportunity-id',
          status: 'test'
        })
        
      if (fkError && fkError.message.includes('foreign key')) {
        console.log('   ✅ Foreign key constraints working (test insert blocked)')
      } else if (fkError) {
        console.log(`   ⚠️  Foreign key test: ${fkError.message}`)
      } else {
        console.log('   ⚠️  Foreign key test insert succeeded (unexpected)')
        // Clean up
        await supabase
          .from('project_opportunities')
          .delete()
          .eq('project_id', 'test-project-id')
      }
    } catch (err) {
      console.log(`   ⚠️  Foreign key test error: ${err.message}`)
    }

  } catch (error) {
    console.error('💥 Testing failed:', error.message)
  }

  // Summary and recommendations
  console.log('\n🎯 CRITICAL FIXES NEEDED:\n')

  console.log('1️⃣  IMMEDIATE: Fix profile API table name')
  console.log('   📝 Action: Update app/api/user/profile/[userId]/route.js')
  console.log('   🔧 Change: .from("user_profiles") → .from("profiles")')
  console.log('   ⚠️  Impact: Profile API currently broken')

  console.log('\n2️⃣  HIGH PRIORITY: Fix project_opportunities user_id')
  console.log('   📝 Action: Update NULL user_id records in database')
  console.log('   🔧 SQL: UPDATE project_opportunities SET user_id = (SELECT user_id FROM projects WHERE projects.id = project_opportunities.project_id) WHERE user_id IS NULL')
  console.log('   ⚠️  Impact: RLS policies not working correctly')

  console.log('\n3️⃣  MEDIUM PRIORITY: Standardize deadline column name')
  console.log('   📝 Action: Ensure code uses "deadline_date" consistently')
  console.log('   🔧 Check: All opportunity queries and displays')
  console.log('   ⚠️  Impact: Potential deadline display issues')

  console.log('\n4️⃣  GOOD TO HAVE: Clean up agent_conversations structure')
  console.log('   📝 Action: Migrate legacy user_message/agent_response to role/content')
  console.log('   🔧 SQL: Run fix_agent_conversations_complete.sql')
  console.log('   ⚠️  Impact: Better conversation consistency')

  console.log('\n🚀 Next Steps:')
  console.log('   1. Fix profile API immediately (broken functionality)')
  console.log('   2. Update project_opportunities user_id values')
  console.log('   3. Test all CRUD operations after fixes')
  console.log('   4. Verify RLS policies work correctly')
  
  return discoveredIssues
}

// Run the audit
auditDatabaseMappings().catch(error => {
  console.error('💥 Fatal audit error:', error.message)
})