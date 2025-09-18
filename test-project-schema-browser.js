// Browser Console Test for Project Creation Schema Issues
console.log('🔍 Testing Project Creation Schema in Browser');

const testProjectCreationSchema = async () => {
  console.log('=== BROWSER PROJECT CREATION SCHEMA TEST ===');
  
  // Test data matching exactly what EnhancedCreateProjectModal sends
  const testProjectData = {
    // Basic fields
    name: 'Schema Test Project',
    description: 'Testing project creation to identify database schema issues',
    // Location mapping (EnhancedCreateProjectModal maps project_location to location)
    location: 'Test City, Test State',
    
    // Category/Type fields (multiple mappings for compatibility)
    project_categories: ['technology', 'research'],
    project_category: 'technology', // Legacy compatibility
    project_type: 'technology', // Derived from project_categories[0]
    
    // Financial fields (parsed as floats)
    total_project_budget: 50000,
    funding_request_amount: 25000,
    cash_match_available: 5000,
    in_kind_match_available: 10000,
    estimated_people_served: 100,
    
    // Budget breakdown percentages
    personnel_percentage: 60.0,
    equipment_percentage: 20.0,
    travel_percentage: 5.0,
    indirect_percentage: 10.0,
    other_percentage: 5.0,
    
    // Array fields for goals and funding types
    primary_goals: ['innovation', 'development'],
    preferred_funding_types: ['grants'],
    
    // Status and other fields
    status: 'draft'
  };
  
  console.log('📊 Test project data structure:', testProjectData);
  
  // Method 1: Test with existing Supabase client if available
  if (typeof window !== 'undefined' && window.supabase) {
    console.log('\n1️⃣ Testing direct Supabase insert...');
    
    try {
      const fullProjectData = {
        ...testProjectData,
        user_id: '1134a8c4-7dce-4b1f-8b97-247580e16e9c', // Your actual user ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Attempting to insert:', fullProjectData);
      
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
        
        // Detailed error analysis
        console.log('\n🔍 ERROR ANALYSIS:');
        
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const columnMatch = error.message.match(/column "([^"]+)" of relation "projects" does not exist/);
          if (columnMatch) {
            console.log(`🎯 MISSING COLUMN: "${columnMatch[1]}" needs to be added to projects table`);
            console.log(`   SQL to fix: ALTER TABLE projects ADD COLUMN ${columnMatch[1]} TEXT;`);
          }
        }
        
        if (error.message.includes('null value in column')) {
          const nullMatch = error.message.match(/null value in column "([^"]+)"/);
          if (nullMatch) {
            console.log(`🎯 NULL CONSTRAINT VIOLATION: Column "${nullMatch[1]}" cannot be null`);
            console.log(`   SQL to fix: ALTER TABLE projects ALTER COLUMN ${nullMatch[1]} DROP NOT NULL;`);
            console.log(`   Or add a default: ALTER TABLE projects ALTER COLUMN ${nullMatch[1]} SET DEFAULT 'default_value';`);
          }
        }
        
        if (error.message.includes('invalid input syntax')) {
          console.log('🎯 DATA TYPE ISSUE: Likely array/JSON field type mismatch');
          console.log('   Check that array fields (project_categories, primary_goals, preferred_funding_types) are JSONB type');
          
          // Check which field caused the issue
          const arrayFields = ['project_categories', 'primary_goals', 'preferred_funding_types'];
          arrayFields.forEach(field => {
            if (error.message.includes(field) || error.details?.includes(field)) {
              console.log(`   Problem field: ${field} - should be JSONB type`);
              console.log(`   SQL to fix: ALTER TABLE projects ALTER COLUMN ${field} TYPE JSONB USING ${field}::JSONB;`);
            }
          });
        }
        
        if (error.message.includes('violates foreign key constraint')) {
          console.log('🎯 FOREIGN KEY VIOLATION: user_id reference issue');
          console.log('   Check that user_profiles table exists and user_id is valid');
        }
        
        if (error.code === '42P01') {
          console.log('🎯 TABLE MISSING: projects table does not exist');
          console.log('   Need to create projects table first');
        }
        
        console.log('\n💡 QUICK FIXES TO TRY:');
        console.log('1. Run the SQL fix script: fix-projects-table-schema.sql');
        console.log('2. Check Supabase SQL Editor for the exact table structure');
        console.log('3. Compare with the expected schema printed above');
        
        return false;
        
      } else {
        console.log('✅ Direct Supabase insert succeeded!', data);
        
        // Clean up test data
        if (data[0]?.id) {
          console.log('🧹 Cleaning up test project...');
          await window.supabase
            .from('projects')
            .delete()
            .eq('id', data[0].id);
          console.log('✅ Test project cleaned up');
        }
        return true;
      }
      
    } catch (error) {
      console.log('❌ Supabase test error:', error.message);
      return false;
    }
    
  } else {
    console.log('⚠️ No Supabase client found in browser');
    console.log('💡 Open a page with project functionality to access Supabase client');
    return false;
  }
};

// Method 2: Test the actual UI flow if possible
const testUIProjectCreation = () => {
  console.log('\n2️⃣ Testing UI Project Creation...');
  
  // Look for create project buttons
  const createButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent && (
      btn.textContent.toLowerCase().includes('create') && 
      btn.textContent.toLowerCase().includes('project')
    )
  );
  
  if (createButtons.length > 0) {
    console.log(`✅ Found ${createButtons.length} create project button(s)`);
    console.log('💡 Try clicking one to open the project creation modal and test the actual flow');
    createButtons.forEach((btn, index) => {
      console.log(`   Button ${index + 1}: "${btn.textContent.trim()}"`);
    });
  } else {
    console.log('⚠️ No create project buttons found on this page');
    console.log('💡 Navigate to your dashboard or projects page to find the create project UI');
  }
};

// Method 3: Check current database schema
const checkCurrentSchema = async () => {
  console.log('\n3️⃣ Checking current database schema...');
  
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      // Try a simple query to see what columns exist
      const { data, error } = await window.supabase
        .from('projects')
        .select('*')
        .limit(1);
        
      if (error && error.code !== 'PGRST116') {
        console.log('❌ Schema check error:', error.message);
      } else {
        console.log('📋 Current projects table structure available');
        if (data && data.length > 0) {
          console.log('✅ Sample project columns:', Object.keys(data[0]));
        } else {
          console.log('💡 No existing projects found, but table exists');
        }
      }
      
    } catch (error) {
      console.log('❌ Schema check failed:', error.message);
    }
  }
};

// Run all tests
console.log('\n🚀 Starting comprehensive project creation schema test...');
testProjectCreationSchema().then(success => {
  if (success) {
    console.log('\n✅ PROJECT CREATION SCHEMA TEST PASSED!');
    console.log('   Database schema appears compatible with frontend data structure');
  } else {
    console.log('\n❌ PROJECT CREATION SCHEMA TEST FAILED');
    console.log('   Check the detailed error analysis above for specific fixes needed');
  }
  
  // Run UI test regardless
  testUIProjectCreation();
  checkCurrentSchema();
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. If schema test failed, run the SQL fix script in Supabase');
  console.log('2. Try creating a project through the UI to confirm fixes work');
  console.log('3. Check browser console for any additional errors');
});

// Also provide the expected schema for reference
console.log('\n📚 EXPECTED PROJECTS TABLE SCHEMA:');
console.log('=====================================');
console.log('Core columns:');
console.log('- id: UUID PRIMARY KEY (auto-generated)');
console.log('- user_id: UUID NOT NULL (references user_profiles.user_id)');
console.log('- name: TEXT NOT NULL');
console.log('- description: TEXT NOT NULL');
console.log('- location: TEXT NOT NULL');
console.log('- project_type: TEXT NOT NULL');
console.log('- status: TEXT (default: draft)');
console.log('- created_at: TIMESTAMP NOT NULL');
console.log('- updated_at: TIMESTAMP NOT NULL');
console.log('');
console.log('Financial columns (NUMERIC):');
console.log('- total_project_budget: NUMERIC');
console.log('- funding_request_amount: NUMERIC');
console.log('- cash_match_available: NUMERIC'); 
console.log('- in_kind_match_available: NUMERIC');
console.log('- estimated_people_served: INTEGER');
console.log('');
console.log('Array/JSON columns (JSONB):');
console.log('- project_categories: JSONB');
console.log('- primary_goals: JSONB');
console.log('- preferred_funding_types: JSONB');
console.log('');
console.log('Budget breakdown (NUMERIC):');
console.log('- personnel_percentage: NUMERIC');
console.log('- equipment_percentage: NUMERIC');
console.log('- travel_percentage: NUMERIC');
console.log('- indirect_percentage: NUMERIC');
console.log('- other_percentage: NUMERIC');