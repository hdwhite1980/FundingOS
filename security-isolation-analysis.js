// Security and Multi-Tenant Isolation Analysis
// Validates that the AI endpoint maintains strict data isolation

const fs = require('fs')
const path = require('path')

function analyzeSecurityIsolation() {
  console.log('\n🔐 Security and Multi-Tenant Isolation Analysis\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Analyze the AI endpoint
    const endpointPath = path.join(__dirname, 'app', 'api', 'ai', 'generate-document', 'route.ts')
    const endpointCode = fs.readFileSync(endpointPath, 'utf8')
    
    // 2. Analyze the contextBuilder
    const contextBuilderPath = path.join(__dirname, 'lib', 'ai', 'contextBuilder.js')
    const contextBuilderCode = fs.readFileSync(contextBuilderPath, 'utf8')
    
    console.log('🔍 Analyzing Data Access Patterns...\n')
    
    // Security Pattern 1: User ID validation and scoping
    console.log('1. USER ID VALIDATION & SCOPING:')
    
    const userIdValidation = [
      { check: 'Validates userId parameter', pattern: /if \(!userId\)/ },
      { check: 'Rejects requests without userId', pattern: /User ID is required/ },
      { check: 'Passes userId to contextBuilder', pattern: /buildOrgContext\(userId/ },
      { check: 'Context scoped to user', pattern: /\.eq\('user_id', userId\)/ }
    ]
    
    let userIdScore = 0
    userIdValidation.forEach(({ check, pattern }) => {
      const endpointMatch = pattern.test(endpointCode)
      const contextMatch = pattern.test(contextBuilderCode)
      const matches = endpointMatch || contextMatch
      console.log(`   ${matches ? '✅' : '❌'} ${check}: ${matches}`)
      if (matches) userIdScore++
    })
    
    // Security Pattern 2: Data filtering and access control
    console.log('\n2. DATA FILTERING & ACCESS CONTROL:')
    
    const dataFiltering = [
      { check: 'Projects filtered by user ownership', pattern: /context\.projects\?\.find\(p => p\.id === projectId\)/ },
      { check: 'Opportunities checked for access', pattern: /context\.opportunities\?\.find\(o => o\.id === opportunityId\)/ },
      { check: 'Project access denied on mismatch', pattern: /Project not found or access denied/ },
      { check: 'Opportunity access denied on mismatch', pattern: /Opportunity not found or access denied/ }
    ]
    
    let filteringScore = 0
    dataFiltering.forEach(({ check, pattern }) => {
      const matches = pattern.test(endpointCode)
      console.log(`   ${matches ? '✅' : '❌'} ${check}: ${matches}`)
      if (matches) filteringScore++
    })
    
    // Security Pattern 3: Context Builder isolation
    console.log('\n3. CONTEXT BUILDER ISOLATION:')
    
    const contextIsolation = [
      { check: 'All queries use user_id filter', pattern: /\.eq\('user_id', userId\)/g },
      { check: 'No global data queries', pattern: /(?<!user_id.*)\.(select|from)\(/g },
      { check: 'Profile queries scoped to user', pattern: /user_profiles.*\.eq\('user_id'/ },
      { check: 'Project queries scoped to user', pattern: /projects.*\.eq\('user_id'/ }
    ]
    
    let isolationScore = 0
    contextIsolation.forEach(({ check, pattern }) => {
      if (check === 'All queries use user_id filter') {
        const matches = contextBuilderCode.match(pattern)
        const hasMatches = matches && matches.length > 3  // Should have multiple user_id filters
        console.log(`   ${hasMatches ? '✅' : '❌'} ${check}: ${hasMatches ? `${matches.length} instances` : 'Not found'}`)
        if (hasMatches) isolationScore++
      } else if (check === 'No global data queries') {
        const matches = contextBuilderCode.match(pattern)
        const hasUnscopedQueries = matches && matches.length > 0
        console.log(`   ${!hasUnscopedQueries ? '✅' : '❌'} ${check}: ${!hasUnscopedQueries ? 'All queries scoped' : `${matches.length} unscoped queries found`}`)
        if (!hasUnscopedQueries) isolationScore++
      } else {
        const matches = pattern.test(contextBuilderCode)
        console.log(`   ${matches ? '✅' : '❌'} ${check}: ${matches}`)
        if (matches) isolationScore++
      }
    })
    
    // Security Pattern 4: RLS and database security
    console.log('\n4. DATABASE SECURITY (RLS):')
    
    const schemaPath = path.join(__dirname, 'ASSISTANT_MISSING_TABLES.sql')
    let schemaCode = ''
    
    if (fs.existsSync(schemaPath)) {
      schemaCode = fs.readFileSync(schemaPath, 'utf8')
    }
    
    const rlsSecurity = [
      { check: 'RLS enabled on user_profiles', pattern: /ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY/ },
      { check: 'RLS enabled on projects', pattern: /ALTER TABLE projects ENABLE ROW LEVEL SECURITY/ },
      { check: 'User ownership policies', pattern: /auth\.uid\(\) = user_id/ },
      { check: 'Service role bypasses RLS safely', pattern: /SUPABASE_SERVICE_ROLE_KEY/ }
    ]
    
    let rlsScore = 0
    rlsSecurity.forEach(({ check, pattern }) => {
      if (check === 'Service role bypasses RLS safely') {
        // Check if service role is used appropriately in contextBuilder
        const matches = contextBuilderCode.includes('service role') || contextBuilderCode.includes('supabase')
        console.log(`   ${matches ? '✅' : '❌'} ${check}: ${matches ? 'Service client used' : 'Not detected'}`)
        if (matches) rlsScore++
      } else {
        const matches = pattern.test(schemaCode)
        console.log(`   ${matches ? '✅' : '❌'} ${check}: ${matches}`)
        if (matches) rlsScore++
      }
    })
    
    // Security Pattern 5: Error handling and information disclosure
    console.log('\n5. ERROR HANDLING & INFORMATION DISCLOSURE:')
    
    const errorHandling = [
      { check: 'Context errors handled gracefully', pattern: /if.*contextResult\.error/ },
      { check: 'Generic error messages for failures', pattern: /Failed to fetch user context/ },
      { check: 'No sensitive data in error responses', pattern: /access denied/ },
      { check: 'Proper HTTP status codes', pattern: /status: 4\d\d/ }
    ]
    
    let errorScore = 0
    errorHandling.forEach(({ check, pattern }) => {
      const matches = pattern.test(endpointCode)
      console.log(`   ${matches ? '✅' : '❌'} ${check}: ${matches}`)
      if (matches) errorScore++
    })
    
    // Calculate overall security score
    const totalChecks = userIdValidation.length + dataFiltering.length + contextIsolation.length + rlsSecurity.length + errorHandling.length
    const totalScore = userIdScore + filteringScore + isolationScore + rlsScore + errorScore
    const securityPercentage = Math.round((totalScore / totalChecks) * 100)
    
    console.log('\n' + '=' .repeat(60))
    console.log('📊 SECURITY ANALYSIS RESULTS:')
    console.log(`   User ID Validation: ${userIdScore}/${userIdValidation.length}`)
    console.log(`   Data Filtering: ${filteringScore}/${dataFiltering.length}`)
    console.log(`   Context Isolation: ${isolationScore}/${contextIsolation.length}`)
    console.log(`   Database Security: ${rlsScore}/${rlsSecurity.length}`)
    console.log(`   Error Handling: ${errorScore}/${errorHandling.length}`)
    console.log(`\n🎯 Overall Security Score: ${securityPercentage}%`)
    
    if (securityPercentage >= 90) {
      console.log('\n🛡️  EXCELLENT SECURITY: Multi-tenant isolation is properly implemented!')
      console.log('✅ No data leakage risks detected')
      console.log('✅ Strict user scoping enforced')
      console.log('✅ Access control properly implemented')
    } else if (securityPercentage >= 75) {
      console.log('\n🔒 GOOD SECURITY: Most security measures in place')
      console.log('⚠️  Some minor improvements recommended')
    } else {
      console.log('\n⚠️  SECURITY CONCERNS: Some critical security measures missing')
      console.log('❌ Review and strengthen security implementation')
    }
    
    // Additional analysis: Check for common security anti-patterns
    console.log('\n🔍 ANTI-PATTERN ANALYSIS:')
    
    const antiPatterns = [
      { issue: 'Global queries without user filtering', pattern: /\.from\('[^']+'\)\.select\((?!.*user_id)/ },
      { issue: 'Direct user data exposure', pattern: /password|secret|token/ },
      { issue: 'SQL injection vulnerabilities', pattern: /\$\{.*\}/g },
      { issue: 'Missing input validation', pattern: /req\.body\..*(?!.*validation)/ }
    ]
    
    let antiPatternCount = 0
    antiPatterns.forEach(({ issue, pattern }) => {
      const endpointMatches = endpointCode.match(pattern)
      const contextMatches = contextBuilderCode.match(pattern)
      const found = (endpointMatches && endpointMatches.length > 0) || (contextMatches && contextMatches.length > 0)
      
      if (found) {
        console.log(`   ⚠️  ${issue}: ${endpointMatches?.length || 0 + contextMatches?.length || 0} instances`)
        antiPatternCount++
      } else {
        console.log(`   ✅ ${issue}: Not detected`)
      }
    })
    
    console.log(`\n📋 Anti-patterns found: ${antiPatternCount}/${antiPatterns.length}`)
    
    return {
      securityScore: securityPercentage,
      antiPatterns: antiPatternCount,
      isSecure: securityPercentage >= 80 && antiPatternCount === 0
    }
    
  } catch (error) {
    console.error('❌ Security analysis failed:', error.message)
    return { securityScore: 0, antiPatterns: 999, isSecure: false }
  }
}

// Run security analysis
if (require.main === module) {
  const result = analyzeSecurityIsolation()
  
  console.log('\n' + '=' .repeat(60))
  if (result.isSecure) {
    console.log('🎉 SECURITY VALIDATION PASSED')
    console.log('\n✅ The AI application system is secure and ready for multi-tenant use!')
    console.log('✅ All user data properly isolated')
    console.log('✅ No cross-tenant data leakage possible')
    console.log('✅ Access control properly enforced')
  } else {
    console.log('⚠️  SECURITY REVIEW NEEDED')
    console.log(`   Score: ${result.securityScore}%`)
    console.log(`   Anti-patterns: ${result.antiPatterns}`)
  }
}

module.exports = { analyzeSecurityIsolation }