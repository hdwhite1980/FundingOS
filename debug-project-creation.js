// Test script to debug project creation issue
console.log('=== Project Creation Debug Test ===')

// Sample data that would be sent from the form
const sampleFormData = {
  name: 'Test Project',
  description: 'A test project to debug the creation issue',
  project_categories: ['program_expansion', 'technology_implementation'],
  project_category_other: '',
  total_project_budget: '1,000,000', // This will be formatted with commas
  funding_request_amount: '500,000',
  estimated_people_served: '1,000',
  personnel_percentage: 50,
  equipment_percentage: 20,
  travel_percentage: 10,
  indirect_percentage: 15,
  other_percentage: 5
}

console.log('\n1. 📋 Original form data:')
console.log(JSON.stringify(sampleFormData, null, 2))

// Simulate the processing that happens in EnhancedCreateProjectModal
const processFormData = (formData) => {
  const projectData = {
    ...formData,
    // Handle both old and new project category fields for backward compatibility
    project_category: formData.project_categories?.length > 0 ? formData.project_categories[0] : null,
    project_categories: formData.project_categories || [],
    total_project_budget: formData.total_project_budget ? parseFloat(formData.total_project_budget.toString().replace(/[^\d.]/g, '')) : null,
    funding_request_amount: formData.funding_request_amount ? parseFloat(formData.funding_request_amount.toString().replace(/[^\d.]/g, '')) : null,
    estimated_people_served: formData.estimated_people_served ? parseInt(formData.estimated_people_served.toString().replace(/[^\d]/g, '')) : null,
    personnel_percentage: formData.personnel_percentage ? parseFloat(formData.personnel_percentage) : null,
    equipment_percentage: formData.equipment_percentage ? parseFloat(formData.equipment_percentage) : null,
    travel_percentage: formData.travel_percentage ? parseFloat(formData.travel_percentage) : null,
    indirect_percentage: formData.indirect_percentage ? parseFloat(formData.indirect_percentage) : null,
    other_percentage: formData.other_percentage ? parseFloat(formData.other_percentage) : null
  }
  
  return projectData
}

const processedData = processFormData(sampleFormData)

console.log('\n2. 🔧 Processed data for database:')
console.log(JSON.stringify(processedData, null, 2))

console.log('\n3. ✅ Key fixes applied:')
console.log('- Added backward compatibility for project_category field')
console.log('- Properly handling project_categories array')
console.log('- Cleaning formatted numbers (removing commas)')
console.log('- Converting string numbers to proper numeric types')

console.log('\n4. 🚨 Potential issues to check:')
console.log('- Database needs project_categories column (run migration)')
console.log('- Verify all required database columns exist')
console.log('- Check for any validation errors in database constraints')
console.log('- Ensure user has proper permissions to create projects')

console.log('\n5. 📊 Data type verification:')
console.log('total_project_budget type:', typeof processedData.total_project_budget)
console.log('funding_request_amount type:', typeof processedData.funding_request_amount)
console.log('estimated_people_served type:', typeof processedData.estimated_people_served)
console.log('project_categories type:', typeof processedData.project_categories)
console.log('project_categories value:', processedData.project_categories)

console.log('\n=== Next Steps ===')
console.log('1. Run the database migration: database_project_categories_migration.sql')
console.log('2. Try creating a project again')
console.log('3. Check browser console for detailed error logs')
console.log('4. Verify all form fields are properly formatted')