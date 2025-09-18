// Direct Project Creation Test - using existing endpoints
console.log('🧪 Direct Project Creation Test');

const testProjectCreationDirect = async () => {
  console.log('=== TESTING PROJECT CREATION DIRECTLY ===');
  
  // Test project data matching what your frontend sends
  const testProjectData = {
    name: 'Schema Test Project',
    description: 'Testing project creation to identify database issues',
    project_type: 'technology',
    location: 'Test Location, USA',
    total_project_budget: 50000,
    funding_request_amount: 25000,
    cash_match_available: 5000,
    in_kind_match_available: 10000,
    estimated_people_served: 100,
    project_categories: ['technology', 'research'],
    primary_goals: ['innovation', 'development'], 
    preferred_funding_types: ['grants'],
    status: 'draft'
  };
  
  console.log('📊 Testing with this project data:', testProjectData);
  
  // Method 1: Try to create via your existing API (if you have one)
  console.log('\n1️⃣ Testing via existing project API...');
  try {
    // First check if there's a projects API endpoint
    const apiResponse = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProjectData)
    });
    
    console.log(`API Response Status: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      const result = await apiResponse.json();
      console.log('✅ API creation succeeded:', result);
      
      // Clean up if successful
      if (result.id) {
        console.log('🧹 Cleaning up test project...');
        // Cleanup would go here if you have a delete endpoint
      }
    } else {
      const errorResult = await apiResponse.json().catch(() => ({ error: 'No JSON response' }));
      console.log('❌ API creation failed:', errorResult);
    }
    
  } catch (error) {
    console.log('⚠️ No /api/projects endpoint found:', error.message);
  }
  
  // Method 2: Test using the Supabase client directly in browser
  console.log('\n2️⃣ Testing direct Supabase insert...');
  
  // Check if supabase is available in the browser
  if (typeof window !== 'undefined' && window.supabase) {
    console.log('📡 Found Supabase client in browser...');
    
    try {
      const fullProjectData = {
        ...testProjectData,
        user_id: '1134a8c4-7dce-4b1f-8b97-247580e16e9c', // Your user ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await window.supabase
        .from('projects')
        .insert([fullProjectData])
        .select();
      
      if (error) {
        console.log('❌ Direct Supabase insert failed:');
        console.log('Error Message:', error.message);
        console.log('Error Details:', error.details);
        console.log('Error Hint:', error.hint);
        console.log('Error Code:', error.code);
        
        // Analyze the specific error
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const match = error.message.match(/column "([^"]+)" of relation "projects" does not exist/);
          if (match) {
            console.log(`🎯 MISSING COLUMN: "${match[1]}" is missing from projects table`);
          }
        }
        
        if (error.message.includes('null value in column')) {
          const match = error.message.match(/null value in column "([^"]+)"/);
          if (match) {
            console.log(`🎯 NULL CONSTRAINT: Column "${match[1]}" cannot be null`);
          }
        }
        
        if (error.message.includes('invalid input syntax')) {
          console.log('🎯 DATA TYPE MISMATCH: Likely array/JSON fields have wrong type');
        }
        
      } else {
        console.log('✅ Direct Supabase insert succeeded!', data);
        
        // Clean up
        if (data[0]?.id) {
          await window.supabase
            .from('projects')
            .delete()
            .eq('id', data[0].id);
          console.log('🧹 Cleaned up test project');
        }
      }
      
    } catch (error) {
      console.log('❌ Supabase insert error:', error.message);
    }
    
  } else {
    console.log('⚠️ No Supabase client found in browser');
    console.log('💡 This means we need to wait for the debug endpoint to deploy');
  }
  
  // Method 3: Analyze the current project creation modal
  console.log('\n3️⃣ Checking current project creation modal...');
  
  // Check if the create project modal exists
  const createButton = document.querySelector('[class*="create"], [class*="project"]') || 
                      document.querySelector('button').filter?.(btn => 
                        btn.textContent?.includes('Create') || 
                        btn.textContent?.includes('Project') ||
                        btn.textContent?.includes('New')
                      );
                      
  if (createButton) {
    console.log('✅ Found create project UI elements');
    console.log('💡 Try creating a real project to see the exact error');
  } else {
    console.log('⚠️ No create project UI found - check if you are on the right page');
  }
  
  console.log('\n📋 SUMMARY:');
  console.log('1. Try creating a project through the UI to see the exact error');
  console.log('2. Check the browser console for detailed error messages');
  console.log('3. Look for column missing or constraint violation errors');
  console.log('4. Run the SQL schema fix script in Supabase once we identify issues');
};

testProjectCreationDirect();