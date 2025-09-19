#!/usr/bin/env node

/**
 * Comprehensive Database Table Name Fix
 * This script fixes all references from "user_profiles" to "profiles" throughout the codebase
 */

const fs = require('fs')
const path = require('path')

// Files to update (from the grep search results)
const filesToUpdate = [
  'components/EnhancedOnboardingFlow.js',
  'lib/supabase.js',
  'pages/api/ai/agent/[...action].js',
  'app/api/chat/logout/route.js',
  'app/api/auth/delete-account/route.js',
  'app/api/auth/2fa/status/route.js',
  'app/api/auth/2fa/setup/route.js',
  'app/api/auth/2fa/verify/route.js',
  'app/api/auth/2fa/disable/route.js',
  'app/api/auth/env-check/route.js',
  'app/api/auth/user-status/route.js',
  'app/api/auth/2fa/setup-new/route.js',
  'app/api/auth/2fa/verify-new/route.js',
  'app/api/auth/2fa/disable-new/route.js',
  'app/api/user-profiles/route.js',
  'lib/ai/contextBuilder.js',
  'lib/ai/projectAnalysisService.js',
  'utils/serviceWrapper.js',
  'lib/ai-agent/UnifiedManager.js'
]

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return false
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8')
    const originalContent = content
    
    // Replace .from('user_profiles') with .from('profiles')
    content = content.replace(/\.from\('user_profiles'\)/g, ".from('profiles')")
    
    // Replace .from("user_profiles") with .from("profiles")
    content = content.replace(/\.from\("user_profiles"\)/g, '.from("profiles")')
    
    // Replace references in comments
    content = content.replace(/user_profiles table/g, 'profiles table')
    content = content.replace(/user_profiles\s/g, 'profiles ')
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8')
      console.log(`✅ Updated: ${filePath}`)
      return true
    } else {
      console.log(`📝 No changes needed: ${filePath}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Error updating ${filePath}: ${error.message}`)
    return false
  }
}

async function fixAllTableReferences() {
  console.log('🔧 Fixing all user_profiles → profiles table references\n')

  let updatedCount = 0
  let totalCount = filesToUpdate.length

  for (const file of filesToUpdate) {
    if (updateFile(file)) {
      updatedCount++
    }
  }

  console.log(`\n📊 Summary: Updated ${updatedCount} out of ${totalCount} files`)
  
  if (updatedCount > 0) {
    console.log('\n🎉 Database table name fixes complete!')
    console.log('📝 All user_profiles references have been changed to profiles')
    console.log('⚠️  Note: Some test files and comments may still reference the old name')
  } else {
    console.log('\n✅ All files were already using correct table names')
  }
}

// Run the fix
fixAllTableReferences().catch(error => {
  console.error('💥 Fix failed:', error.message)
})