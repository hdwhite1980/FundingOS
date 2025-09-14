// Test script to validate the API logic directly
console.log('🔧 Testing API Logic for Dynamic Forms')
console.log('================================================')

// Simulate the data that would be sent to the API
const mockApplicationData = {
  opportunityDetails: {
    title: 'Missouri Community Grant Program'
  },
  organizationData: {
    organizationName: 'Test Company',
    organizationType: 'for-profit'
  },
  projectData: {
    projectName: 'Kingway Affordable Housing',
    projectType: 'Residential Development',
    projectDescription: 'The Kingway Affordable Housing project aims to develop affordable housing units to serve the local community.'
  },
  // This is the key - the dynamic form structure that should trigger templateUsed: true
  dynamicFormStructure: {
    formFields: {
      "organization_name": {
        "label": "Organization Name",
        "type": "text",
        "required": true,
        "section": "organization_info"
      },
      "project_title": {
        "label": "Project Title",
        "type": "text",
        "required": true,
        "section": "project_details"
      },
      "project_description": {
        "label": "Project Description",
        "type": "textarea",
        "required": true,
        "maxLength": 2000,
        "section": "project_details"
      },
      "project_budget": {
        "label": "Total Project Budget",
        "type": "number",
        "required": true,
        "min": 0,
        "section": "budget"
      },
      "requested_amount": {
        "label": "Amount Requested",
        "type": "number",
        "required": true,
        "min": 0,
        "section": "budget"
      }
    },
    formMetadata: {
      title: "Missouri Community Grant Application",
      sections: ["organization_info", "project_details", "budget"]
    }
  }
}

// Test the logic that's used in the API
console.log('📝 Testing form structure detection...')

if (mockApplicationData.dynamicFormStructure?.formFields) {
  console.log('✅ Dynamic form structure detected!')
  console.log(`📊 Found ${Object.keys(mockApplicationData.dynamicFormStructure.formFields).length} fields`)
  
  // This is what should happen in the API
  const templateUsed = true
  console.log(`🎯 templateUsed should be: ${templateUsed}`)
  
  // List the fields that would be used
  console.log('📋 Fields that would be used:')
  Object.entries(mockApplicationData.dynamicFormStructure.formFields).forEach(([key, field]) => {
    console.log(`  - ${field.label} (${field.type}) ${field.required ? '[required]' : '[optional]'}`)
  })
} else {
  console.log('❌ No dynamic form structure detected')
  console.log('🎯 templateUsed would be: false')
}

console.log('')
console.log('🔍 Checking what data structure we currently have...')
console.log('Has dynamicFormStructure:', !!mockApplicationData.dynamicFormStructure)
console.log('Has formFields:', !!mockApplicationData.dynamicFormStructure?.formFields)
console.log('Number of fields:', Object.keys(mockApplicationData.dynamicFormStructure?.formFields || {}).length)

console.log('')
console.log('================================================')
console.log('🏁 API Logic Test Complete')

// Expected outcome: This test should show that when dynamicFormStructure 
// is properly passed, templateUsed should be true