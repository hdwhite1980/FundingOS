// Browser-based Project Schema Analysis
console.log('🔍 Project Schema Analysis - Expected vs Actual');

const analyzeProjectSchema = async () => {
  console.log('=== ANALYZING EXPECTED PROJECT SCHEMA ===');
  
  // Use the endpoint to check what the database expects
  try {
    const response = await fetch('/api/debug/projects-schema-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'check_schema' })
    });
    
    const data = await response.json();
    console.log('✅ Database schema response:', data);
    
  } catch (error) {
    console.log('⏳ Schema endpoint deploying, will analyze from code...');
  }
  
  // Test with the exact data structure the frontend sends
  console.log('\n📊 Testing with frontend project data structure...');
  
  const frontendProjectData = {
    name: 'Frontend Test Project',
    description: 'Test project with frontend data structure',
    project_type: 'technology',
    location: 'Test Location',
    total_project_budget: 50000,
    funding_request_amount: 25000,
    cash_match_available: 5000,
    in_kind_match_available: 10000,
    estimated_people_served: 100,
    project_categories: ['technology', 'research'], // Array field
    primary_goals: ['innovation', 'development'], // Array field
    preferred_funding_types: ['grants'], // Array field
    status: 'draft'
  };
  
  console.log('Frontend sends this data structure:', frontendProjectData);
  
  // Test the actual API endpoint
  try {
    const testResponse = await fetch('/api/debug/projects-schema-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'test_project_data',
        projectData: {
          ...frontendProjectData,
          user_id: '1134a8c4-7dce-4b1f-8b97-247580e16e9c', // Your actual user ID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
    });
    
    const testResult = await testResponse.json();
    
    if (testResult.success) {
      console.log('✅ Project data structure is compatible with database');
      console.log('Test result:', testResult);
    } else {
      console.log('❌ Project data structure has issues:');
      console.log('Error:', testResult.error?.message);
      console.log('Details:', testResult.error?.details);
      console.log('Hint:', testResult.error?.hint);
      console.log('Code:', testResult.error?.code);
      
      // Specific error analysis
      if (testResult.error?.message?.includes('column') && testResult.error?.message?.includes('does not exist')) {
        const match = testResult.error.message.match(/column "([^"]+)" of relation "projects" does not exist/);
        if (match) {
          console.log(`🎯 MISSING COLUMN: "${match[1]}" needs to be added to projects table`);
        }
      }
      
      if (testResult.error?.message?.includes('null value in column')) {
        const match = testResult.error.message.match(/null value in column "([^"]+)"/);
        if (match) {
          console.log(`🎯 NULL CONSTRAINT: Column "${match[1]}" requires a NOT NULL constraint or default value`);
        }
      }
      
      if (testResult.error?.message?.includes('invalid input syntax')) {
        console.log('🎯 DATA TYPE ISSUE: Likely array/JSON field type mismatch');
      }
    }
    
  } catch (error) {
    console.log('❌ Test endpoint error:', error.message);
  }
};

// Run the analysis
analyzeProjectSchema();

// Also log the expected schema from code analysis
console.log('\n📋 EXPECTED PROJECTS TABLE SCHEMA (from code analysis):');
console.log('===================================================');
console.log('Required columns:');
console.log('- id (UUID, PRIMARY KEY, auto-generated)');
console.log('- user_id (UUID, NOT NULL, references user_profiles.user_id)');
console.log('- name (TEXT, NOT NULL)');
console.log('- description (TEXT, NOT NULL)');
console.log('- created_at (TIMESTAMP, NOT NULL)');
console.log('- updated_at (TIMESTAMP, NOT NULL)');
console.log('');
console.log('Core project columns:');
console.log('- project_type (TEXT, NOT NULL) -- e.g., "technology", "research"');
console.log('- location (TEXT, NOT NULL) -- project location');
console.log('- status (TEXT) -- e.g., "draft", "active", "completed"');
console.log('');
console.log('Financial columns (NUMERIC/INTEGER):');
console.log('- total_project_budget (NUMERIC)');
console.log('- funding_request_amount (NUMERIC)');
console.log('- cash_match_available (NUMERIC)');
console.log('- in_kind_match_available (NUMERIC)');
console.log('- estimated_people_served (INTEGER)');
console.log('- amount_raised (NUMERIC)');
console.log('- funding_goal (NUMERIC)');
console.log('');
console.log('Array/JSON columns (should be JSONB or JSON type):');
console.log('- project_categories (JSONB) -- e.g., ["technology", "research"]');
console.log('- primary_goals (JSONB) -- e.g., ["innovation", "development"]');
console.log('- preferred_funding_types (JSONB) -- e.g., ["grants", "contracts"]');
console.log('');
console.log('Date columns (TIMESTAMP or DATE):');
console.log('- proposed_start_date (DATE)');
console.log('- Any other columns ending with _date or _at');

console.log('\n💡 COMMON ISSUES TO CHECK:');
console.log('1. Missing columns in database table');
console.log('2. Wrong data types (especially JSONB vs TEXT for arrays)');
console.log('3. Missing NOT NULL constraints');
console.log('4. Missing default values for required fields');
console.log('5. Foreign key constraints to user_profiles table');