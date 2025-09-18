// Test project creation with empty string handling
const testProjectCreation = async () => {
  try {
    console.log('🧪 Testing project creation with empty date strings...')
    
    const testData = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Project',
      description: 'Test project description',
      location: 'Test City, TS',
      project_type: 'community_development',
      funding_needed: '50000',
      timeline: '12 months',
      // These empty strings should be converted to null
      proposed_start_date: '',
      end_date: '',
      deadline: '',
      matching_funds_available: '',
      expected_jobs_created: ''
    }
    
    console.log('📤 Sending test data:', testData)
    
    const response = await fetch('http://localhost:3000/api/projects/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Project creation successful:', result)
    } else {
      console.log('❌ Project creation failed:', result)
    }
    
  } catch (error) {
    console.error('🚨 Test error:', error)
  }
}

// We can't actually run this without a server, but this shows the logic
console.log('Test script ready. This would test the project creation API with empty strings.')