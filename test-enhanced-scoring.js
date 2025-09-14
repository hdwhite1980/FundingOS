// Test script to verify enhanced scoring produces varied results

const testOpportunity = {
  id: 'test-opp-1',
  title: 'Small Business Innovation Research (SBIR) Technology Development Grant',
  description: 'This opportunity supports small businesses in developing innovative technology solutions that address critical needs in healthcare, defense, and energy sectors. The program provides funding for research and development activities, prototype development, and commercialization efforts. Eligible organizations must be for-profit small businesses with fewer than 500 employees.',
  sponsor: 'National Science Foundation',
  source: 'grants_gov',
  amount_min: 50000,
  amount_max: 500000,
  organization_types: ['for_profit'],
  project_types: ['technology', 'research'],
  small_business_only: true,
  focus_areas: ['technology', 'innovation', 'research', 'healthcare', 'energy'],
  deadline_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days from now
}

const testProject1 = {
  id: 'test-project-1',
  title: 'AI-Powered Healthcare Diagnostic Platform',
  name: 'AI-Powered Healthcare Diagnostic Platform',
  description: 'Developing an artificial intelligence platform that uses machine learning algorithms to assist healthcare professionals in diagnosing complex medical conditions. The system analyzes patient data, medical imaging, and clinical indicators to provide diagnostic recommendations.',
  project_category: 'technology',
  funding_request_amount: 250000,
  primary_goals: ['Develop AI diagnostic algorithms', 'Create user-friendly interface for healthcare providers', 'Conduct clinical validation studies'],
  target_population: 'healthcare providers and patients',
  unique_innovation: 'Novel machine learning approach combining multiple data sources for improved diagnostic accuracy'
}

const testProject2 = {
  id: 'test-project-2', 
  title: 'Community Garden Educational Program',
  name: 'Community Garden Educational Program',
  description: 'A community-based program that teaches sustainable gardening practices to urban residents. The program includes workshops on organic farming, nutrition education, and food security awareness. Participants will learn to grow their own vegetables and contribute to community food systems.',
  project_category: 'community',
  funding_request_amount: 75000,
  primary_goals: ['Establish community gardens', 'Provide educational workshops', 'Improve food security'],
  target_population: 'urban residents and families',
  unique_innovation: 'Integration of nutrition education with practical gardening skills'
}

const testUserProfile = {
  organization_type: 'for_profit',
  organization_name: 'TechHealth Innovations LLC',
  primary_focus_areas: ['healthcare', 'technology', 'artificial intelligence'],
  populations_served: ['healthcare providers', 'patients'],
  annual_revenue: 750000,
  employee_count: 15,
  industry: 'healthcare technology'
}

async function testEnhancedScoring() {
  console.log('🧪 Testing Enhanced Scoring System...\n')

  // Test 1: High-match scenario (tech project + tech opportunity)
  console.log('Test 1: High-match scenario')
  console.log('Project: AI Healthcare Platform')
  console.log('Opportunity: SBIR Technology Grant')
  
  try {
    const response1 = await fetch('http://localhost:3000/api/ai/enhanced-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunity: testOpportunity,
        project: testProject1,
        userProfile: testUserProfile,
        action: 'fast-score'
      })
    })

    if (response1.ok) {
      const result1 = await response1.json()
      console.log('✅ Score:', result1.data.overallScore + '%')
      console.log('   Eligible:', result1.data.eligible)
      console.log('   Strengths:', result1.data.strengths.slice(0, 2))
      console.log('   Processing time:', result1.data.processingTime + 'ms')
      console.log('')
    } else {
      console.log('❌ Test 1 failed:', response1.status)
    }
  } catch (error) {
    console.log('❌ Test 1 error:', error.message)
  }

  // Test 2: Low-match scenario (community project + tech opportunity)
  console.log('Test 2: Low-match scenario') 
  console.log('Project: Community Garden Program')
  console.log('Opportunity: SBIR Technology Grant')
  
  try {
    const response2 = await fetch('http://localhost:3000/api/ai/enhanced-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunity: testOpportunity,
        project: testProject2,
        userProfile: testUserProfile,
        action: 'fast-score'
      })
    })

    if (response2.ok) {
      const result2 = await response2.json()
      console.log('✅ Score:', result2.data.overallScore + '%')
      console.log('   Eligible:', result2.data.eligible)
      console.log('   Strengths:', result2.data.strengths.slice(0, 2))
      console.log('   Weaknesses:', result2.data.weaknesses.slice(0, 2))
      console.log('   Processing time:', result2.data.processingTime + 'ms')
      console.log('')
    } else {
      console.log('❌ Test 2 failed:', response2.status)
    }
  } catch (error) {
    console.log('❌ Test 2 error:', error.message)
  }

  // Test 3: Enhanced scoring (full AI analysis)
  console.log('Test 3: Full enhanced scoring with AI analysis')
  console.log('Project: AI Healthcare Platform')
  console.log('Opportunity: SBIR Technology Grant')
  
  try {
    const response3 = await fetch('http://localhost:3000/api/ai/enhanced-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunity: testOpportunity,
        project: testProject1,
        userProfile: testUserProfile,
        action: 'enhanced-score'
      })
    })

    if (response3.ok) {
      const result3 = await response3.json()
      console.log('✅ Enhanced Score:', result3.data.overallScore + '%')
      console.log('   Fast Track Score:', result3.data.fastScore?.overallScore + '%')
      console.log('   AI Analysis Score:', result3.data.aiAnalysis?.fitScore + '%')
      console.log('   Confidence:', Math.round((result3.data.confidence || 0) * 100) + '%')
      console.log('')
    } else {
      const errorText = await response3.text()
      console.log('❌ Test 3 failed:', response3.status, errorText)
    }
  } catch (error) {
    console.log('❌ Test 3 error:', error.message)
  }

  console.log('🧪 Enhanced Scoring Tests Complete!')
}

testEnhancedScoring().catch(console.error)