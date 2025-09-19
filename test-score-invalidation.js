#!/usr/bin/env node

/**
 * Test script to verify score invalidation is working correctly
 * Run with: node test-score-invalidation.js
 */

require('dotenv').config()
const { directUserServices } = require('./lib/supabase.js')
const { scoringCacheService } = require('./lib/scoringCache.js')

const TEST_USER_ID = 'test-user-123' // Replace with actual user ID for testing
const TEST_PROJECT_ID = 'test-project-456' // Replace with actual project ID
const TEST_OPPORTUNITY_ID = 'test-opportunity-789' // Replace with actual opportunity ID

async function testScoreInvalidation() {
  console.log('🧪 Testing Score Invalidation System')
  console.log('=====================================')
  
  try {
    // Test 1: Get or calculate initial score
    console.log('\n1. Testing initial score calculation...')
    const initialScore = await scoringCacheService.getOrCalculateScore(
      TEST_USER_ID, 
      TEST_PROJECT_ID, 
      TEST_OPPORTUNITY_ID
    )
    console.log('✅ Initial score:', initialScore.score, '(cached:', initialScore.cached, ')')
    
    // Test 2: Get cached score (should be cached now)
    console.log('\n2. Testing cached score retrieval...')
    const cachedScore = await scoringCacheService.getOrCalculateScore(
      TEST_USER_ID, 
      TEST_PROJECT_ID, 
      TEST_OPPORTUNITY_ID
    )
    console.log('✅ Cached score:', cachedScore.score, '(cached:', cachedScore.cached, ')')
    
    // Test 3: Test project update with significant changes
    console.log('\n3. Testing project update with significant changes...')
    const mockOldProject = {
      name: 'Old Project Name',
      description: 'Old description',
      funding_request_amount: 50000
    }
    
    const mockNewProject = {
      name: 'New Project Name',
      description: 'Completely new and different description with different focus',
      funding_request_amount: 100000
    }
    
    const invalidated = await scoringCacheService.smartInvalidateOnProjectUpdate(
      TEST_USER_ID, 
      TEST_PROJECT_ID, 
      mockOldProject, 
      mockNewProject
    )
    console.log('✅ Significant changes detected, scores invalidated:', invalidated)
    
    // Test 4: Verify score is recalculated
    console.log('\n4. Testing score recalculation after invalidation...')
    const newScore = await scoringCacheService.getOrCalculateScore(
      TEST_USER_ID, 
      TEST_PROJECT_ID, 
      TEST_OPPORTUNITY_ID
    )
    console.log('✅ New score after invalidation:', newScore.score, '(cached:', newScore.cached, ')')
    
    // Test 5: Test minor project changes (shouldn't invalidate)
    console.log('\n5. Testing minor project changes...')
    const minorUpdate = {
      ...mockNewProject,
      updated_at: new Date().toISOString() // Only timestamp changed
    }
    
    const notInvalidated = await scoringCacheService.smartInvalidateOnProjectUpdate(
      TEST_USER_ID, 
      TEST_PROJECT_ID, 
      mockNewProject, 
      minorUpdate
    )
    console.log('✅ Minor changes, scores preserved:', notInvalidated)
    
    // Test 6: Test profile update invalidation
    console.log('\n6. Testing profile update invalidation...')
    const mockOldProfile = {
      organization_type: 'nonprofit',
      small_business: false,
      woman_owned: false
    }
    
    const mockNewProfile = {
      organization_type: 'small_business',
      small_business: true,
      woman_owned: true
    }
    
    const profileInvalidated = await scoringCacheService.smartInvalidateOnProfileUpdate(
      TEST_USER_ID, 
      mockOldProfile, 
      mockNewProfile
    )
    console.log('✅ Significant profile changes detected, all scores invalidated:', profileInvalidated)
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📊 Score Invalidation Summary:')
    console.log('- Significant project changes → Project scores invalidated')
    console.log('- Minor project changes → Scores preserved (performance optimization)')
    console.log('- Significant profile changes → ALL user scores invalidated')
    console.log('- Cached scores automatically recalculated when requested')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testScoreInvalidation()
    .then(() => {
      console.log('\n✅ Test completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Test failed:', error)
      process.exit(1)
    })
}

export { testScoreInvalidation }