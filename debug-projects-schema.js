// Complete Database Schema Check for Projects Table
console.log('🔍 Complete Database Schema Check for Projects Table');

const checkProjectsSchema = async () => {
  console.log('=== CHECKING PROJECTS TABLE SCHEMA ===');
  
  try {
    // Test endpoint to get schema information
    const response = await fetch('/api/debug/projects-schema-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'check_schema',
        timestamp: Date.now()
      })
    });
    
    console.log(`Schema check status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Schema check successful:', data);
    } else {
      console.log('❌ Schema check failed - endpoint may not exist');
      console.log('Will create the endpoint to check schema');
    }
    
  } catch (error) {
    console.log('❌ Schema check error:', error.message);
    console.log('Will need to create schema check endpoint');
  }
  
  // Test a simple project creation to see the exact error
  console.log('\n🧪 Testing Project Creation...');
  
  const testProject = {
    name: 'Schema Test Project',
    description: 'Testing database schema compliance',
    project_type: 'technology',
    location: 'Test Location',
    total_project_budget: 50000,
    funding_request_amount: 25000,
    project_categories: ['technology', 'research'],
    primary_goals: ['innovation', 'development'],
    status: 'draft'
  };
  
  try {
    // Use the direct projects service
    const createResponse = await fetch('/api/debug/test-project-creation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProject)
    });
    
    console.log(`Project creation test status: ${response.status}`);
    
    if (createResponse.ok) {
      console.log('✅ Project creation would work');
    } else {
      const errorData = await createResponse.json();
      console.log('❌ Project creation would fail:', errorData);
    }
    
  } catch (error) {
    console.log('❌ Project creation test error:', error.message);
  }
};

checkProjectsSchema();