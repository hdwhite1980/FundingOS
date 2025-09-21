/**
 * Test Enhanced Field Context Integration
 * 
 * This script demonstrates the new enhanced field context functionality
 * that provides rich, intelligent assistance for form fields.
 */

// Mock data for testing
const mockUserProfile = {
  organization_name: "Community Health Solutions, Inc.",
  organization_type: "Non-profit",
  ein: "12-3456789",
  tax_id: "12-3456789",
  minority_owned: true,
  woman_owned: false,
  veteran_owned: false,
  small_business: true
}

const mockProject = {
  id: "proj-123",
  name: "Healthcare Access Initiative",
  project_type: "Community Health",
  funding_needed: 75000,
  total_project_budget: 75000,
  description: "Expanding healthcare access in underserved communities",
  target_population: "Low-income families"
}

const mockEnhancedFormStructure = {
  formMetadata: {
    detectedFormType: "Federal Grant Application"
  },
  dataFields: {
    organization_name: {
      type: "text",
      required: true,
      section: "Organization Information",
      helpText: "Legal name of your organization"
    },
    project_budget: {
      type: "number",
      required: true,
      section: "Budget",
      helpText: "Total project budget requested"
    }
  },
  narrativeFields: {
    project_description: {
      type: "textarea",
      required: true,
      wordLimit: 500,
      section: "Project Narrative",
      helpText: "Describe your project goals and methodology"
    }
  }
}

const mockFilledForm = {
  organization_name: "Community Health Solutions, Inc.",
  project_title: "Healthcare Access Initiative",
  contact_email: "director@chs.org"
}

// Test functions (these would be imported from the component)
const createFieldSpecificContext = (fieldName, fieldType, project) => {
  const fieldLower = fieldName.toLowerCase()
  
  if (fieldLower.includes('ein') || fieldLower.includes('tax_id')) {
    return {
      purpose: "Your organization's Employer Identification Number (EIN) is required for tax purposes and grant eligibility verification",
      requirements: "Must be 9 digits in format XX-XXXXXXX",
      tips: "This should match your IRS documentation exactly",
      example: "12-3456789"
    }
  }
  
  if (fieldLower.includes('organization_name') || fieldLower.includes('legal_name')) {
    return {
      purpose: "The exact legal name of your organization as registered with state/federal agencies",
      requirements: "Must match incorporation documents and IRS records",
      tips: "Use the full legal name, including LLC, Inc, etc. if applicable",
      example: project?.organization_name || "Community Health Solutions, Inc."
    }
  }
  
  if (fieldLower.includes('project_description') || fieldLower.includes('narrative')) {
    return {
      purpose: "Detailed explanation of your project's goals, methodology, and expected outcomes",
      requirements: "Should clearly articulate the problem, solution, and impact",
      tips: "Include specific numbers, timelines, and measurable outcomes when possible",
      structure: ["Problem statement", "Proposed solution", "Implementation plan", "Expected outcomes"]
    }
  }

  return {
    purpose: `Information required for the ${fieldName.replace(/_/g, ' ')} field`,
    requirements: "Please provide accurate and complete information",
    tips: "Ensure this information aligns with your project goals and organization details"
  }
}

const generateCompletionSuggestions = (fieldName, fieldType, project, userProfile) => {
  const suggestions = []
  const fieldLower = fieldName.toLowerCase()
  
  if (fieldLower.includes('organization_name') && userProfile?.organization_name) {
    suggestions.push({
      type: 'auto_fill',
      value: userProfile.organization_name,
      confidence: 0.9,
      source: 'user_profile'
    })
  }
  
  if (fieldLower.includes('ein') && (userProfile?.ein || userProfile?.tax_id)) {
    suggestions.push({
      type: 'auto_fill',
      value: userProfile.ein || userProfile.tax_id,
      confidence: 0.95,
      source: 'user_profile'
    })
  }
  
  return suggestions
}

const inferFieldTypeFromName = (fieldName) => {
  const fieldLower = fieldName.toLowerCase()
  
  if (fieldLower.includes('email')) return 'email'
  if (fieldLower.includes('phone')) return 'tel'
  if (fieldLower.includes('date') || fieldLower.includes('deadline')) return 'date'
  if (fieldLower.includes('amount') || fieldLower.includes('budget') || fieldLower.includes('funding')) return 'number'
  if (fieldLower.includes('description') || fieldLower.includes('narrative') || fieldLower.includes('summary')) return 'textarea'
  
  return 'text'
}

const generateSpecificQuestion = (fieldName, context) => {
  const { fieldType, specificGuidance, projectContext, isRequired } = context
  
  let question = `I need help with the "${fieldName.replace(/_/g, ' ')}" field. `
  
  if (specificGuidance?.purpose) {
    question += `This field is for: ${specificGuidance.purpose}. `
  }
  
  if (isRequired) {
    question += `This is a required field. `
  }
  
  if (fieldType === 'textarea') {
    question += `Please help me write compelling content that covers the key requirements. `
  } else {
    question += `What specific information should I provide? `
  }
  
  if (projectContext?.name) {
    question += `My project is "${projectContext.name}" `
    if (projectContext.type) {
      question += `which is a ${projectContext.type} project. `
    }
  }
  
  question += `Please provide specific, actionable guidance for completing this field effectively.`
  
  return question
}

// Test the enhanced context creation
const createEnhancedFieldContext = (fieldName, fieldValue) => {
  const dataFieldConfig = mockEnhancedFormStructure?.dataFields?.[fieldName]
  const narrativeFieldConfig = mockEnhancedFormStructure?.narrativeFields?.[fieldName]
  const fieldConfig = dataFieldConfig || narrativeFieldConfig

  const fieldType = fieldConfig?.type || inferFieldTypeFromName(fieldName)
  const isRequired = fieldConfig?.required || false
  const wordLimit = fieldConfig?.wordLimit
  const helpText = fieldConfig?.helpText
  const section = fieldConfig?.section

  const specificContext = createFieldSpecificContext(fieldName, fieldType, mockProject)

  return {
    fieldName,
    fieldValue,
    fieldType,
    isRequired,
    wordLimit,
    helpText,
    section,
    formType: mockEnhancedFormStructure?.formMetadata?.detectedFormType,
    fieldConfiguration: fieldConfig,
    projectContext: {
      name: mockProject?.name,
      type: mockProject?.project_type,
      budget: mockProject?.funding_needed || mockProject?.total_project_budget,
      description: mockProject?.description,
      targetPopulation: mockProject?.target_population
    },
    organizationContext: {
      name: mockUserProfile?.organization_name,
      type: mockUserProfile?.organization_type,
      ein: mockUserProfile?.ein || mockUserProfile?.tax_id,
      certifications: {
        minorityOwned: mockUserProfile?.minority_owned,
        womanOwned: mockUserProfile?.woman_owned,
        veteranOwned: mockUserProfile?.veteran_owned,
        smallBusiness: mockUserProfile?.small_business
      }
    },
    specificGuidance: specificContext,
    completionSuggestions: generateCompletionSuggestions(fieldName, fieldType, mockProject, mockUserProfile)
  }
}

// Run tests
console.log("🧪 Testing Enhanced Field Context Integration\n")

console.log("=" * 60)
console.log("TEST 1: Organization Name Field")
console.log("=" * 60)
const orgNameContext = createEnhancedFieldContext('organization_name', 'Community Health Solutions, Inc.')
console.log("Enhanced Context:")
console.log(JSON.stringify(orgNameContext, null, 2))
console.log("\nSpecific Question:")
console.log(generateSpecificQuestion('organization_name', orgNameContext))

console.log("\n" + "=" * 60)
console.log("TEST 2: EIN Field")
console.log("=" * 60)
const einContext = createEnhancedFieldContext('ein', '')
console.log("Enhanced Context:")
console.log(JSON.stringify(einContext, null, 2))
console.log("\nSpecific Question:")
console.log(generateSpecificQuestion('ein', einContext))

console.log("\n" + "=" * 60)
console.log("TEST 3: Project Description Field")
console.log("=" * 60)
const descContext = createEnhancedFieldContext('project_description', '')
console.log("Enhanced Context:")
console.log(JSON.stringify(descContext, null, 2))
console.log("\nSpecific Question:")
console.log(generateSpecificQuestion('project_description', descContext))

console.log("\n" + "=" * 60)
console.log("✅ Enhanced Field Context Integration Test Complete!")
console.log("=" * 60)
console.log("\n🎯 Key Features Demonstrated:")
console.log("• Rich field-specific context with purpose, requirements, and tips")
console.log("• Auto-fill suggestions from user profile data")
console.log("• Project and organization context integration")
console.log("• Specific, actionable questions for AI assistance")
console.log("• Field type inference and configuration support")
console.log("\n🚀 This enhanced context will provide much more intelligent")
console.log("   and helpful assistance for form field completion!")