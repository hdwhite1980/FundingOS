/**
 * Test Dynamic Form Generation End-to-End
 * 
 * This script tests the complete flow: 
 * 1. Form upload and analysis
 * 2. Template extraction
 * 3. Document generation using extracted template
 */

const testEndToEndFormGeneration = async () => {
  console.log('🔄 Testing End-to-End Dynamic Form Generation')
  console.log('=' .repeat(60))

  // Step 1: Simulate Missouri Common Grant Application content
  const missouriFormContent = `
Missouri Common Grant Application - Version 2.0

SECTION A: APPLICANT INFORMATION
Organization Name: ___________________________
Federal Tax ID Number: _______________________
Organization Type: [ ] 501(c)(3) [ ] Government [ ] Other: _______
Primary Contact Name: ________________________
Primary Contact Title: _______________________
Primary Contact Email: _______________________
Primary Contact Phone: _______________________
Mailing Address: _____________________________
City: ________________ State: _____ Zip: _____
Website: ____________________________________

SECTION B: PROJECT INFORMATION
Project Title: _______________________________
Project Summary (250 words max): _____________
___________________________________________
___________________________________________
___________________________________________

Total Project Cost: $_________________________
Amount Requested: $__________________________
Grant Period: From ________ to ______________
Project Start Date: _________________________
Project End Date: ___________________________

SECTION C: PROJECT DESCRIPTION
Project Narrative (1000 words max):
___________________________________________
___________________________________________
___________________________________________
___________________________________________

Project Goals and Objectives:
___________________________________________
___________________________________________

Target Population:
___________________________________________

Expected Outcomes:
___________________________________________
___________________________________________

SECTION D: ORGANIZATIONAL CAPACITY
Organization Mission:
___________________________________________

Years in Operation: _________________________
Annual Operating Budget: $__________________
Number of Board Members: ___________________
Number of Staff: Full-time: _____ Part-time: _____

Previous Experience with Similar Projects:
___________________________________________
___________________________________________

SECTION E: PROJECT BUDGET
Personnel Costs: $__________________________
Fringe Benefits: $__________________________
Equipment: $________________________________
Supplies: $_________________________________
Travel: $__________________________________
Contractual: $______________________________
Other: $___________________________________
Total Project Cost: $______________________
Amount Requested: $________________________
Matching Funds: $__________________________

SECTION F: EVALUATION PLAN
1. Evaluation Methods:
___________________________________________

2. Success Metrics:
___________________________________________

SECTION G: SUSTAINABILITY
___________________________________________
___________________________________________

SECTION H: CERTIFICATION
[ ] I certify that the organization is tax-exempt under section 501(c)(3)
[ ] I certify that this information is complete and accurate
[ ] I agree to comply with all grant requirements

Signature: ______________________ Date: ________
Print Name: _____________________________________
Title: _________________________________________
`

  console.log('📄 Step 1: Analyzing Missouri Common Grant Application form...')
  
  try {
    // Step 1: Extract form structure using dynamic form analysis
    const analysisResponse = await fetch('http://localhost:3000/api/ai/dynamic-form-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentContent: missouriFormContent,
        documentType: 'grant_application',
        extractionMode: 'comprehensive',
        context: {
          formName: 'Missouri Common Grant Application',
          version: '2.0',
          expectedFields: 25
        }
      })
    })

    if (!analysisResponse.ok) {
      throw new Error(`Form analysis failed: ${analysisResponse.status}`)
    }

    const analysisResult = await analysisResponse.json()
    
    if (!analysisResult.success) {
      throw new Error(`Form analysis error: ${analysisResult.error}`)
    }

    const { formStructure, fieldMappings, extractionMetadata } = analysisResult.data

    console.log('✅ Form analysis successful!')
    console.log(`   📊 Fields detected: ${extractionMetadata.totalFieldsDetected}`)
    console.log(`   📑 Sections: ${extractionMetadata.sectionsDetected}`)
    console.log(`   🎯 Confidence: ${Math.round(extractionMetadata.confidence * 100)}%`)
    
    // Show some sample fields
    console.log('\n📋 Sample Extracted Fields:')
    const sampleFields = Object.entries(formStructure.formFields || {}).slice(0, 8)
    sampleFields.forEach(([key, field]) => {
      console.log(`   • ${field.label} (${field.type}${field.required ? ', required' : ''})`)
    })

    console.log('\n🏗️  Step 2: Generating application using extracted form structure...')

    // Step 2: Generate document using the extracted form structure
    const mockApplicationData = {
      opportunity: {
        title: 'Missouri Community Development Grant',
        sponsor: 'Missouri Department of Social Services',
        amount_min: 10000,
        amount_max: 50000,
        deadline_date: '2024-03-15',
        description: 'Funding for community development projects that improve quality of life for Missouri residents',
        eligibility_requirements: '501(c)(3) organizations with community focus'
      },
      project: {
        name: 'Kingway Affordable Housing Initiative',
        project_type: 'affordable_housing',
        description: 'Development of affordable housing units for low-income families in Kansas City area',
        goals: 'Create 24 affordable housing units, provide housing stability for 75 individuals, strengthen community infrastructure',
        budget: 45000,
        timeline: '18 months'
      },
      userProfile: {
        organization_name: 'Kingway Community Development Corporation',
        full_name: 'Sarah Johnson',
        location: 'Kansas City, Missouri',
        organization_type: '501(c)(3)',
        years_in_operation: 12,
        annual_budget: 250000,
        mission: 'To revitalize underserved communities through affordable housing and community development'
      },
      analysis: {
        fitScore: 92,
        strengths: [
          'Strong alignment with affordable housing funding priorities',
          'Experienced organization with 12-year track record',
          'Clear community impact and target population',
          'Realistic budget within funding range'
        ],
        challenges: [
          'Competitive applicant pool for housing grants',
          'Need detailed community needs assessment'
        ],
        recommendations: [
          'Emphasize community partnerships and local support',
          'Include detailed budget breakdown and sustainability plan',
          'Highlight previous successful housing projects'
        ],
        nextSteps: [
          'Complete detailed project narrative',
          'Gather community impact data',
          'Prepare required supporting documents'
        ],
        reasoning: 'Excellent match for Missouri community development priorities with experienced applicant organization'
      },
      dynamicFormStructure: formStructure // This is the key - pass the extracted structure
    }

    const generationResponse = await fetch('http://localhost:3000/api/ai/generate-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockApplicationData)
    })

    if (!generationResponse.ok) {
      throw new Error(`Document generation failed: ${generationResponse.status}`)
    }

    const generationResult = await generationResponse.json()

    if (!generationResult.success) {
      throw new Error(`Document generation error: ${generationResult.error}`)
    }

    console.log('✅ Document generation successful!')
    
    const generatedFields = generationResult.formFields || []
    const metadata = generationResult.metadata || {}
    
    console.log(`   📄 Generated fields: ${generatedFields.length}`)
    console.log(`   📋 Form title: ${metadata.title || 'Unknown'}`)
    console.log(`   ✅ Template used: ${metadata.templateUsed}`)
    console.log(`   🏷️  Form type: ${metadata.formType || 'Unknown'}`)

    // Show what was generated vs what was expected
    console.log('\n📊 Field Generation Analysis:')
    const originalFieldCount = Object.keys(formStructure.formFields || {}).length
    console.log(`   Original fields detected: ${originalFieldCount}`)
    console.log(`   Fields generated: ${generatedFields.length}`)
    console.log(`   Coverage: ${Math.round((generatedFields.length / originalFieldCount) * 100)}%`)

    // Check if generated fields match the original structure
    console.log('\n🔍 Field Mapping Verification:')
    const originalFieldNames = Object.keys(formStructure.formFields || {})
    const generatedFieldNames = generatedFields.map(f => f.fieldName)
    
    const matched = originalFieldNames.filter(name => 
      generatedFieldNames.includes(name)
    )
    const missing = originalFieldNames.filter(name => 
      !generatedFieldNames.includes(name)
    )
    const extra = generatedFieldNames.filter(name => 
      !originalFieldNames.includes(name)
    )

    console.log(`   ✅ Matched fields: ${matched.length}`)
    console.log(`   ❌ Missing fields: ${missing.length}`)
    console.log(`   ➕ Extra fields: ${extra.length}`)

    if (missing.length > 0) {
      console.log('\n   Missing fields:')
      missing.slice(0, 5).forEach(field => console.log(`     - ${field}`))
      if (missing.length > 5) console.log(`     ... and ${missing.length - 5} more`)
    }

    if (extra.length > 0) {
      console.log('\n   Extra fields:')
      extra.slice(0, 5).forEach(field => console.log(`     + ${field}`))
      if (extra.length > 5) console.log(`     ... and ${extra.length - 5} more`)
    }

    // Show sample generated content
    console.log('\n📝 Sample Generated Responses:')
    generatedFields.slice(0, 5).forEach(field => {
      console.log(`\n   ${field.label}:`)
      const value = field.value || 'No value generated'
      const truncated = value.length > 100 ? value.substring(0, 100) + '...' : value
      console.log(`   "${truncated}"`)
    })

    // Success metrics
    const templateUsed = metadata.templateUsed === true
    const fieldsCovered = (generatedFields.length / originalFieldCount) >= 0.8 // At least 80% coverage
    const hasContent = generatedFields.every(f => f.value && f.value.length > 5)

    console.log('\n🎯 Success Metrics:')
    console.log(`   Template Detection: ${templateUsed ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   Field Coverage: ${fieldsCovered ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   Content Quality: ${hasContent ? '✅ PASS' : '❌ FAIL'}`)

    const overallSuccess = templateUsed && fieldsCovered && hasContent
    console.log(`\n🏆 Overall Test: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`)

    if (!overallSuccess) {
      console.log('\n💡 Issues to investigate:')
      if (!templateUsed) console.log('   - Form template not being detected/passed properly')
      if (!fieldsCovered) console.log('   - Not enough fields being generated from template')
      if (!hasContent) console.log('   - Generated content is too brief or missing')
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`)
    console.log('Stack:', error.stack)
  }

  console.log('\n' + '=' .repeat(60))
  console.log('🏁 End-to-End Test Complete')
}

// Auto-run if this script is executed directly
if (require.main === module) {
  testEndToEndFormGeneration().catch(console.error)
}

module.exports = { testEndToEndFormGeneration }