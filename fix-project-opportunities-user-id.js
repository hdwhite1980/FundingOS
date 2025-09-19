#!/usr/bin/env node

/**
 * Fix project_opportunities NULL user_id values
 * This script will populate missing user_id values from the related projects
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixProjectOpportunitiesUserIds() {
  console.log('🔧 Fixing project_opportunities NULL user_id values\n')

  try {
    // Step 1: Get all records with NULL user_id
    console.log('1️⃣ Finding records with NULL user_id...')
    const { data: nullRecords, error: nullError } = await supabase
      .from('project_opportunities')
      .select('id, project_id, opportunity_id, user_id')
      .is('user_id', null)

    if (nullError) {
      throw new Error(`Failed to query NULL records: ${nullError.message}`)
    }

    console.log(`📊 Found ${nullRecords.length} records with NULL user_id`)

    if (nullRecords.length === 0) {
      console.log('✅ No NULL user_id records found - nothing to fix!')
      return
    }

    // Step 2: For each NULL record, find the corresponding project's user_id
    console.log('\n2️⃣ Looking up user_id from related projects...')
    const fixes = []

    for (const record of nullRecords) {
      if (record.project_id) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('user_id')
          .eq('id', record.project_id)
          .single()

        if (!projectError && project && project.user_id) {
          fixes.push({
            recordId: record.id,
            projectId: record.project_id,
            userId: project.user_id
          })
          console.log(`   ✅ ${record.id} → user_id: ${project.user_id}`)
        } else {
          console.log(`   ⚠️  ${record.id} → no matching project or project has NULL user_id`)
        }
      } else {
        console.log(`   ⚠️  ${record.id} → no project_id to look up`)
      }
    }

    console.log(`\n📊 Can fix ${fixes.length} out of ${nullRecords.length} records`)

    // Step 3: Apply the fixes
    if (fixes.length > 0) {
      console.log('\n3️⃣ Applying fixes...')
      let successCount = 0
      let errorCount = 0

      for (const fix of fixes) {
        const { error: updateError } = await supabase
          .from('project_opportunities')
          .update({ user_id: fix.userId })
          .eq('id', fix.recordId)

        if (updateError) {
          console.log(`   ❌ Failed to update ${fix.recordId}: ${updateError.message}`)
          errorCount++
        } else {
          console.log(`   ✅ Updated ${fix.recordId} with user_id: ${fix.userId}`)
          successCount++
        }
      }

      console.log(`\n📊 Results: ${successCount} success, ${errorCount} errors`)
    }

    // Step 4: Verify the fixes
    console.log('\n4️⃣ Verifying fixes...')
    const { data: remainingNull, error: verifyError } = await supabase
      .from('project_opportunities')
      .select('id')
      .is('user_id', null)

    if (!verifyError) {
      console.log(`📊 Remaining NULL user_id records: ${remainingNull.length}`)
      
      if (remainingNull.length === 0) {
        console.log('🎉 All NULL user_id records have been fixed!')
      } else {
        console.log('⚠️  Some records still have NULL user_id (may need manual review)')
      }
    }

    // Step 5: Test RLS policies
    console.log('\n5️⃣ Testing RLS policies...')
    
    // Get a sample user_id
    const { data: sampleProject, error: sampleError } = await supabase
      .from('projects')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(1)
      .single()

    if (!sampleError && sampleProject) {
      const testUserId = sampleProject.user_id
      
      // Test with anon key (should be restricted)
      const anonClient = createClient(
        supabaseUrl, 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTU4NjgsImV4cCI6MjA3MjU3MTg2OH0.LZP_I3MdTl1BL96tP6VGcJAu6nVOBhzI9FxKUEMgN6Q'
      )
      
      const { error: rlsError } = await anonClient
        .from('project_opportunities')
        .select('*')
        .eq('user_id', testUserId)
        .limit(1)
        
      if (rlsError) {
        console.log('   ✅ RLS working - anon access properly restricted')
      } else {
        console.log('   ⚠️  RLS may need adjustment - anon access allowed')
      }
    }

    console.log('\n🎉 project_opportunities user_id fix complete!')

  } catch (error) {
    console.error('💥 Fix failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the fix
fixProjectOpportunitiesUserIds().catch(error => {
  console.error('💥 Fatal fix error:', error.message)
})