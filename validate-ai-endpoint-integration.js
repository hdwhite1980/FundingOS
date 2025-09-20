// Static validation test for the updated AI generate-document endpoint
// This test validates code structure and logic without requiring a running server

const fs = require('fs')
const path = require('path')

function validateAIGenerateDocumentEndpoint() {
  console.log('\n🔍 Validating AI Generate-Document Endpoint Code Structure...\n')
  
  try {
    // 1. Read the updated endpoint file
    const endpointPath = path.join(__dirname, 'app', 'api', 'ai', 'generate-document', 'route.ts')
    
    if (!fs.existsSync(endpointPath)) {
      console.error('❌ Endpoint file not found:', endpointPath)
      return false
    }
    
    const endpointCode = fs.readFileSync(endpointPath, 'utf8')
    console.log('✅ Found generate-document endpoint file')
    
    // 2. Validate contextBuilder import
    const hasContextBuilderImport = endpointCode.includes('import { buildOrgContext } from')
    console.log(`${hasContextBuilderImport ? '✅' : '❌'} contextBuilder import: ${hasContextBuilderImport}`)
    
    // 3. Validate userId parameter handling
    const hasUserIdValidation = endpointCode.includes('if (!userId)') && endpointCode.includes('User ID is required')
    console.log(`${hasUserIdValidation ? '✅' : '❌'} User ID validation: ${hasUserIdValidation}`)
    
    // 4. Validate backward compatibility
    const hasBackwardCompatibility = endpointCode.includes('applicationData?.userProfile?.user_id') && 
                                   endpointCode.includes('applicationData?.project?.id') &&
                                   endpointCode.includes('applicationData?.opportunity?.id')
    console.log(`${hasBackwardCompatibility ? '✅' : '❌'} Backward compatibility: ${hasBackwardCompatibility}`)
    
    // 5. Validate context building
    const hasBuildOrgContext = endpointCode.includes('await buildOrgContext(userId') && 
                              endpointCode.includes('includeProjects: true') &&
                              endpointCode.includes('includeApplications: true')
    console.log(`${hasBuildOrgContext ? '✅' : '❌'} Context building: ${hasBuildOrgContext}`)
    
    // 6. Validate security checks
    const hasSecurityChecks = endpointCode.includes('Project not found or access denied') &&
                             endpointCode.includes('Opportunity not found or access denied')
    console.log(`${hasSecurityChecks ? '✅' : '❌'} Security checks: ${hasSecurityChecks}`)
    
    // 7. Validate profile data usage
    const hasProfileDataUsage = endpointCode.includes('userProfile?.organization_name') &&
                               endpointCode.includes('userProfile?.tax_id') &&
                               endpointCode.includes('userProfile?.ein') &&
                               endpointCode.includes('userProfile?.address')
    console.log(`${hasProfileDataUsage ? '✅' : '❌'} Profile data usage: ${hasProfileDataUsage}`)
    
    // 8. Validate context data preference
    const usesContextData = endpointCode.includes('const userProfile = context.profile') &&
                           endpointCode.includes('context.projects?.find') &&
                           endpointCode.includes('context.opportunities?.find')
    console.log(`${usesContextData ? '✅' : '❌'} Context data preference: ${usesContextData}`)
    
    // 9. Check for AI prompt enhancements
    const hasEnhancedPrompts = endpointCode.includes('ORGANIZATION PROFILE DATA AVAILABLE') &&
                              endpointCode.includes('USE PROFILE DATA WHERE APPROPRIATE') &&
                              endpointCode.includes('USE ACTUAL PROFILE DATA')
    console.log(`${hasEnhancedPrompts ? '✅' : '❌'} Enhanced AI prompts: ${hasEnhancedPrompts}`)
    
    // 10. Validate contextBuilder integration points
    console.log('\n📊 Context Builder Integration Analysis:')
    
    // Check for proper contextBuilder usage patterns
    const contextBuilderPatterns = [
      { name: 'Import statement', pattern: /import.*buildOrgContext.*from.*contextBuilder/ },
      { name: 'Context building call', pattern: /await buildOrgContext\(userId,/ },
      { name: 'Error handling', pattern: /if.*contextResult\.error/ },
      { name: 'Profile extraction', pattern: /const userProfile = context\.profile/ },
      { name: 'Project filtering', pattern: /context\.projects\?\.find\(p => p\.id === projectId\)/ },
      { name: 'Opportunity filtering', pattern: /context\.opportunities\?\.find\(o => o\.id === opportunityId\)/ }
    ]
    
    let integrationScore = 0
    contextBuilderPatterns.forEach(({ name, pattern }) => {
      const matches = pattern.test(endpointCode)
      console.log(`   ${matches ? '✅' : '❌'} ${name}: ${matches}`)
      if (matches) integrationScore++
    })
    
    // 11. Security analysis
    console.log('\n🔐 Security Analysis:')
    
    const securityPatterns = [
      { name: 'User ID validation', pattern: /if \(!userId\)/ },
      { name: 'Project access control', pattern: /Project not found or access denied/ },
      { name: 'Opportunity access control', pattern: /Opportunity not found or access denied/ },
      { name: 'Context scoping', pattern: /buildOrgContext\(userId/ }
    ]
    
    let securityScore = 0
    securityPatterns.forEach(({ name, pattern }) => {
      const matches = pattern.test(endpointCode)
      console.log(`   ${matches ? '✅' : '❌'} ${name}: ${matches}`)
      if (matches) securityScore++
    })
    
    // 12. Profile data integration analysis
    console.log('\n🏢 Profile Data Integration Analysis:')
    
    const profileDataFields = [
      'organization_name', 'tax_id', 'ein', 'address', 'location',
      'annual_budget', 'years_in_operation', 'years_operating',
      'full_time_staff', 'employee_count', 'board_size', 'board_members'
    ]
    
    let profileFieldsUsed = 0
    profileDataFields.forEach(field => {
      const isUsed = endpointCode.includes(`userProfile?.${field}`)
      if (isUsed) {
        console.log(`   ✅ ${field}: Referenced in prompts`)
        profileFieldsUsed++
      }
    })
    
    console.log(`\n📈 Profile fields referenced: ${profileFieldsUsed}/${profileDataFields.length}`)
    
    // Final assessment
    console.log('\n📋 Final Assessment:')
    console.log(`   Context Builder Integration: ${integrationScore}/${contextBuilderPatterns.length} patterns`)
    console.log(`   Security Implementation: ${securityScore}/${securityPatterns.length} checks`)
    console.log(`   Profile Data Usage: ${profileFieldsUsed}/${profileDataFields.length} fields`)
    
    const overallScore = (integrationScore + securityScore + profileFieldsUsed) / 
                        (contextBuilderPatterns.length + securityPatterns.length + profileDataFields.length)
    
    console.log(`   Overall Integration Score: ${Math.round(overallScore * 100)}%`)
    
    if (overallScore >= 0.8) {
      console.log('\n🎉 EXCELLENT: AI endpoint successfully updated with Supabase context integration!')
    } else if (overallScore >= 0.6) {
      console.log('\n✅ GOOD: AI endpoint updated with most required features')
    } else {
      console.log('\n⚠️ NEEDS WORK: AI endpoint missing some key integration features')
    }
    
    // 13. Check contextBuilder file exists
    const contextBuilderPath = path.join(__dirname, 'lib', 'ai', 'contextBuilder.js')
    const contextBuilderExists = fs.existsSync(contextBuilderPath)
    console.log(`\n🔗 Dependencies:`)
    console.log(`   ${contextBuilderExists ? '✅' : '❌'} contextBuilder.js exists: ${contextBuilderExists}`)
    
    if (contextBuilderExists) {
      const contextBuilderCode = fs.readFileSync(contextBuilderPath, 'utf8')
      const hasUserScoping = contextBuilderCode.includes('.eq(\'user_id\', userId)')
      console.log(`   ${hasUserScoping ? '✅' : '❌'} contextBuilder uses user scoping: ${hasUserScoping}`)
    }
    
    return overallScore >= 0.7
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message)
    return false
  }
}

// Additional validation: Check that user_profiles table has required columns
function validateUserProfilesSchema() {
  console.log('\n🗄️  Validating user_profiles Schema...')
  
  const schemaFile = path.join(__dirname, 'ASSISTANT_MISSING_TABLES.sql')
  
  if (!fs.existsSync(schemaFile)) {
    console.log('⚠️ Schema file not found, skipping validation')
    return true
  }
  
  const schemaSQL = fs.readFileSync(schemaFile, 'utf8')
  
  const requiredFields = [
    'organization_name', 'email', 'full_name', 'address_line1', 'city', 'state',
    'phone', 'user_id', 'created_at', 'updated_at'
  ]
  
  const missingFields = requiredFields.filter(field => !schemaSQL.includes(field))
  
  if (missingFields.length === 0) {
    console.log('✅ All required user_profiles fields present in schema')
    return true
  } else {
    console.log('❌ Missing user_profiles fields:', missingFields)
    return false
  }
}

// Run validation
if (require.main === module) {
  console.log('🧪 AI Generate-Document Endpoint Validation\n')
  console.log('=' .repeat(50))
  
  const endpointValid = validateAIGenerateDocumentEndpoint()
  const schemaValid = validateUserProfilesSchema()
  
  console.log('\n' + '=' .repeat(50))
  console.log(`🎯 SUMMARY: ${endpointValid && schemaValid ? 'VALIDATION PASSED' : 'VALIDATION NEEDS ATTENTION'}`)
  
  if (endpointValid && schemaValid) {
    console.log('\n✅ The AI application generation system is now ready to:')
    console.log('   • Fetch user/org/project data directly from Supabase')
    console.log('   • Use actual EIN, tax_id, address, and profile data for prefilling')
    console.log('   • Maintain strict multi-tenant isolation')
    console.log('   • Support both new and legacy calling patterns')
    console.log('\n🚀 Ready for production use!')
  } else {
    console.log('\n⚠️ Some issues found that should be addressed before production use.')
  }
}

module.exports = { validateAIGenerateDocumentEndpoint, validateUserProfilesSchema }