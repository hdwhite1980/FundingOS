/**
 * Test the fixed AI Enhanced Application Generation
 * This simulates what should happen with proper template usage and token limits
 */

// Mock the Enhanced Application Tracker flow with Missouri template
const mockDocumentAnalysis = [
  {
    fileName: 'Missouri-Common-Grant-Application-Version-2.0_0.pdf',
    analysis: {
      formFields: {
        organization_name: {
          label: "Organization Name",
          type: "text",
          required: true,
          section: "SECTION A: APPLICANT INFORMATION"
        },
        primary_contact_name: {
          label: "Primary Contact Name", 
          type: "text",
          required: true,
          section: "SECTION A: APPLICANT INFORMATION"
        },
        primary_contact_email: {
          label: "Primary Contact Email",
          type: "email",
          required: true,
          section: "SECTION A: APPLICANT INFORMATION"
        },
        project_title: {
          label: "Project Title",
          type: "text",
          required: true,
          section: "SECTION B: PROJECT INFORMATION"
        },
        project_summary_250_words: {
          label: "Project Summary (250 words max)",
          type: "textarea",
          required: true,
          placeholder: "250 words max",
          section: "SECTION B: PROJECT INFORMATION"
        },
        total_project_cost: {
          label: "Total Project Cost",
          type: "currency",
          required: true,
          section: "SECTION B: PROJECT INFORMATION"
        },
        amount_requested: {
          label: "Amount Requested",
          type: "currency",
          required: true,
          section: "SECTION B: PROJECT INFORMATION"
        },
        statement_of_need: {
          label: "Statement of Need (500 words max)",
          type: "textarea",
          required: true,
          placeholder: "500 words max",
          section: "SECTION C: PROJECT DESCRIPTION"
        },
        project_goals_objectives: {
          label: "Project Goals and Objectives",
          type: "textarea",
          required: true,
          section: "SECTION C: PROJECT DESCRIPTION"
        }
      },
      title: "Missouri Common Grant Application",
      documentType: "application_form",
      extractionConfidence: 0.95
    }
  }
]

const mockProjectData = {
  id: 'test-project-1',
  name: "Kingway Affordable Housing Initiative",
  project_type: "affordable_housing",
  description: "A residential development project providing affordable housing",
  budget: 750000
}

const mockUserProfile = {
  organization_name: "Test Company",
  full_name: "John Smith",
  email: "john.smith@testcompany.com"
}

// Simulate the Enhanced Application Tracker logic
function prepareApplicationData(documentAnalysis, projectData, userProfile) {
  // Combine all form fields from analyzed documents
  const combinedFormFields = {}
  documentAnalysis.forEach(({ analysis }) => {
    if (analysis.formFields) {
      Object.assign(combinedFormFields, analysis.formFields)
    }
  })
  
  let formTemplate = null
  if (Object.keys(combinedFormFields).length > 0) {
    formTemplate = {
      formFields: combinedFormFields,
      fileName: documentAnalysis[0]?.fileName || 'Analyzed_Document',
      source: 'document_analysis'
    }
    console.log('📝 Using form template from document analysis:', formTemplate.fileName)
  }

  const mockOpportunity = {
    id: `ai-generated-${Date.now()}`,
    title: 'Missouri Community Development Grant',
    sponsor: 'Missouri Department of Economic Development',
    amount_min: 100000,
    amount_max: 1000000
  }

  return {
    opportunity: mockOpportunity,
    project: projectData,
    userProfile: userProfile,
    analysis: {
      fitScore: 85,
      strengths: ['Missouri form template detected', 'Affordable housing focus aligns well'],
      challenges: ['Budget alignment needed'],
      recommendations: ['Highlight community impact', 'Include sustainability measures'],
      nextSteps: ['Complete Missouri Common Grant Application'],
      confidence: 0.9,
      reasoning: 'High-quality match with proper form template'
    },
    formTemplate: formTemplate,
    applicationDraft: '',
    createdAt: new Date().toISOString()
  }
}

// Simulate the API request payload
const applicationData = prepareApplicationData(mockDocumentAnalysis, mockProjectData, mockUserProfile)

console.log('🧪 Testing AI Enhanced Application Generation')
console.log('='.repeat(60))

console.log('\n📋 APPLICATION DATA STRUCTURE:')
console.log('='.repeat(40))
console.log(`Project: ${applicationData.project.name}`)
console.log(`Opportunity: ${applicationData.opportunity.title}`)
console.log(`Form Template: ${applicationData.formTemplate ? 'YES' : 'NO'}`)
if (applicationData.formTemplate) {
  console.log(`Template Source: ${applicationData.formTemplate.source}`)
  console.log(`Template File: ${applicationData.formTemplate.fileName}`)
  console.log(`Template Fields: ${Object.keys(applicationData.formTemplate.formFields).length}`)
}

console.log('\n🔧 FORM TEMPLATE FIELDS:')
console.log('='.repeat(40))
if (applicationData.formTemplate) {
  Object.entries(applicationData.formTemplate.formFields).forEach(([fieldName, fieldInfo]) => {
    console.log(`• ${fieldInfo.label} (${fieldName})`)
    console.log(`  Type: ${fieldInfo.type}, Required: ${fieldInfo.required}`)
    console.log(`  Section: ${fieldInfo.section}`)
  })
}

console.log('\n🎯 EXPECTED API BEHAVIOR:')
console.log('='.repeat(40))
console.log('✅ Should use Claude Haiku with 4000 token limit (not 8000)')
console.log('✅ Should detect formTemplate in applicationData')
console.log('✅ Should use Missouri Common Grant Application fields')
console.log('✅ Should generate filled PDF matching Missouri form structure')
console.log('✅ Should NOT generate generic grant application')

console.log('\n📨 API REQUEST PAYLOAD:')
console.log('='.repeat(40))
console.log('POST /api/ai/generate-document')
console.log('Body:', JSON.stringify({
  applicationData,
  documentType: 'grant-application'
}, null, 2))

console.log('\n💡 WHAT SHOULD HAPPEN NOW:')
console.log('='.repeat(40))
console.log('1. AI should detect the Missouri form template')
console.log('2. Generate responses for SPECIFIC Missouri fields') 
console.log('3. Create PDF matching Missouri Common Grant Application layout')
console.log('4. No more token limit errors with Claude Haiku')
console.log('5. Professional output ready for submission')

console.log('\n🔍 DEBUGGING CHECKLIST:')
console.log('='.repeat(40))
console.log('- Check logs for "Using direct form template with X fields"')
console.log('- Verify Missouri form fields are used (not generic ones)')
console.log('- Confirm token count is under 4000 for Claude Haiku')
console.log('- Validate PDF matches Missouri Common Grant Application structure')

console.log('\n' + '='.repeat(60))
console.log('✅ Test setup complete - ready for Enhanced Application Tracker!')