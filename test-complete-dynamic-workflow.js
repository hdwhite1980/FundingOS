/**
 * Complete End-to-End Test: Dynamic Form Extraction and Application Generation
 * 
 * This test demonstrates the complete workflow:
 * 1. Create a project with uploaded form template (Missouri Common Grant Application)
 * 2. Extract dynamic form structure 
 * 3. Generate application using the extracted template
 * 4. Verify templateUsed: true in the result
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Mock PDF content for Missouri Common Grant Application (simplified)
const MISSOURI_APPLICATION_CONTENT = `
MISSOURI COMMON GRANT APPLICATION

ORGANIZATION INFORMATION
Organization Name: _________________________
Tax ID Number: ____________________________
Organization Type: [ ] Non-profit [ ] For-profit [ ] Government [ ] Other

CONTACT INFORMATION  
Primary Contact Name: _____________________
Title: ___________________________________
Email: __________________________________
Phone: _________________________________
Address: ________________________________
City: _____________________ State: MO ZIP: __________

PROJECT INFORMATION
Project Title: ___________________________
Project Description: _____________________
_______________________________________
_______________________________________

FUNDING REQUEST
Amount Requested: $_____________________
Project Start Date: ____________________
Project End Date: ______________________

PROJECT NARRATIVE
Problem Statement: ______________________
_______________________________________
_______________________________________

Project Goals and Objectives: ____________
_______________________________________
_______________________________________

Methodology and Activities: ______________
_______________________________________
_______________________________________

Expected Outcomes: ______________________
_______________________________________

Evaluation Plan: _______________________
_______________________________________

BUDGET SUMMARY
Personnel: $_____________
Equipment: $_____________
Supplies: $______________
Travel: $_______________
Other: $________________
Total Project Cost: $___________________

ORGANIZATIONAL CAPACITY
Organization History: ___________________
_______________________________________

Previous Grant Experience: _______________
_______________________________________

Key Staff Qualifications: _______________
_______________________________________

CERTIFICATIONS
[ ] I certify that the information provided is true and accurate
[ ] I agree to comply with all grant requirements
[ ] Organization is in good standing with the State of Missouri

Signature: _________________ Date: _______
Print Name: _______________
Title: ____________________
`

async function testCompleteDynamicFormWorkflow() {
  console.log('🚀 Starting Complete Dynamic Form Workflow Test')
  console.log('==================================================\n')

  try {
    // Step 1: Test dynamic form analysis API directly
    console.log('📝 Step 1: Testing dynamic form analysis...')
    const dynamicFormResponse = await fetch('http://localhost:3000/api/ai/dynamic-form-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentContent: MISSOURI_APPLICATION_CONTENT,
        documentType: 'grant_application',
        extractionMode: 'comprehensive',
        context: {
          fileName: 'missouri_application.pdf',
          userProfile: { organization_name: 'Test Organization' },
          projectData: { name: 'Test Dynamic Project' }
        }
      })
    })

    if (!dynamicFormResponse.ok) {
      throw new Error(`Dynamic form analysis failed: ${dynamicFormResponse.status}`)
    }

    const formAnalysisResult = await dynamicFormResponse.json()
    console.log('✅ Dynamic form analysis successful!')
    console.log('📊 Extracted fields:', Object.keys(formAnalysisResult.data?.formStructure?.formFields || {}).length)
    console.log('📋 Form title:', formAnalysisResult.data?.formStructure?.formMetadata?.title)

    const dynamicFormStructure = formAnalysisResult.data.formStructure

    // Step 2: Create a project with the dynamic form structure
    console.log('\n🏗️  Step 2: Creating project with dynamic form structure...')
    
    const projectData = {
      name: 'Test Dynamic Form Project',
      description: 'Testing dynamic form extraction and generation',
      project_type: 'community_development',
      funding_goal: '50000',
      project_location: 'Missouri, USA',
      target_beneficiaries: 'Local community',
      project_timeline: 12,
      organization_type: 'nonprofit',
      uploaded_documents: [{
        fileName: 'missouri_application.pdf',
        type: 'application/pdf',
        size: MISSOURI_APPLICATION_CONTENT.length,
        documentType: 'application',
        uploadedAt: new Date().toISOString()
      }],
      dynamic_form_structure: dynamicFormStructure,
      user_id: '00000000-0000-0000-0000-000000000000' // Test user ID
    }

    const { data: createdProject, error: createError } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()

    if (createError) {
      throw new Error(`Project creation failed: ${createError.message}`)
    }

    console.log('✅ Project created successfully!')
    console.log('📊 Project ID:', createdProject.id)
    console.log('📋 Has dynamic form structure:', !!createdProject.dynamic_form_structure)

    // Step 3: Create opportunity for testing 
    const opportunityData = {
      title: 'Missouri Community Development Grant',
      sponsor: 'State of Missouri',
      amount_min: 10000,
      amount_max: 100000,
      deadline_date: '2024-12-31',
      description: 'Supporting community development projects in Missouri',
      eligibility_requirements: 'Must be a Missouri-based organization',
      status: 'active'
    }

    const { data: createdOpportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert([opportunityData])
      .select()
      .single()

    if (oppError) {
      throw new Error(`Opportunity creation failed: ${oppError.message}`)
    }

    console.log('✅ Opportunity created for testing')

    // Step 4: Test document generation with the dynamic form
    console.log('\n📄 Step 3: Testing document generation with dynamic form...')
    
    const applicationData = {
      opportunity: createdOpportunity,
      project: createdProject,
      userProfile: {
        organization_name: 'Test Organization',
        full_name: 'Test User',
        city: 'Kansas City',
        state: 'Missouri'
      },
      analysis: {
        fitScore: 95,
        strengths: ['Great project alignment', 'Strong organizational capacity'],
        challenges: ['Timeline constraints'],
        recommendations: ['Apply early', 'Provide detailed budget'],
        nextSteps: ['Submit application', 'Prepare supporting documents'],
        reasoning: 'Excellent match for community development funding'
      },
      // This is the key - pass the dynamic form structure extracted from the project
      dynamicFormStructure: createdProject.dynamic_form_structure
    }

    const documentGenResponse = await fetch('http://localhost:3000/api/ai/generate-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationData })
    })

    if (!documentGenResponse.ok) {
      throw new Error(`Document generation failed: ${documentGenResponse.status}`)
    }

    const documentResult = await documentGenResponse.json()
    console.log('✅ Document generation successful!')
    console.log('📊 Generated fields:', documentResult.formFields?.length || 0)
    console.log('🎯 Template used:', documentResult.metadata?.templateUsed)
    console.log('📋 Form type:', documentResult.metadata?.formType)

    // Step 5: Verify the results
    console.log('\n🔍 Step 4: Verifying results...')
    
    const success = documentResult.metadata?.templateUsed === true
    const fieldCount = documentResult.formFields?.length || 0
    
    console.log('\n📊 FINAL RESULTS:')
    console.log('==================')
    console.log(`✅ Dynamic form extraction: SUCCESS`)
    console.log(`✅ Project creation with form structure: SUCCESS`) 
    console.log(`✅ Document generation: SUCCESS`)
    console.log(`🎯 Template used: ${documentResult.metadata?.templateUsed ? 'YES ✅' : 'NO ❌'}`)
    console.log(`📝 Generated ${fieldCount} form fields`)
    console.log(`📋 Form type: ${documentResult.metadata?.formType || 'unknown'}`)
    
    if (success) {
      console.log('\n🎉 COMPLETE SUCCESS! Dynamic form workflow is working correctly!')
      console.log('The system can now:')
      console.log('- Extract form structures from uploaded documents')
      console.log('- Store them in project records') 
      console.log('- Use them to generate accurate, template-driven applications')
    } else {
      console.log('\n⚠️  Template not used - investigating...')
      console.log('Generated form fields:')
      documentResult.formFields?.slice(0, 3).forEach((field, i) => {
        console.log(`  ${i+1}. ${field.label} (${field.fieldName})`)
      })
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await supabase.from('projects').delete().eq('id', createdProject.id)
    await supabase.from('opportunities').delete().eq('id', createdOpportunity.id)
    console.log('✅ Cleanup complete')

    return success

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    return false
  }
}

// Run the test
testCompleteDynamicFormWorkflow()
  .then(success => {
    console.log('\n' + '='.repeat(50))
    console.log(success ? '🎉 ALL TESTS PASSED!' : '❌ TESTS FAILED')
    console.log('='.repeat(50))
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })