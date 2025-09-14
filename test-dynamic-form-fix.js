/**
 * Test Fix: Dynamic Form Structure Flow
 * 
 * This simulates the complete flow to test if the fix is working:
 * 1. Upload and analyze a form (simulated)
 * 2. Generate document using the extracted structure 
 * 3. Verify templateUsed is true
 */
const http = require('http')

const testDynamicFormFix = async () => {
  console.log('🔧 Testing Dynamic Form Structure Fix')
  console.log('=' .repeat(50))

  // Step 1: Mock extracted form structure (this simulates what comes from the document upload)
  const mockDynamicFormStructure = {
    formFields: {
      organization_name: {
        label: "Organization Name",
        type: "text",
        required: true,
        section: "SECTION A: APPLICANT INFORMATION"
      },
      federal_tax_id: {
        label: "Federal Tax ID Number",
        type: "text",
        required: true,
        section: "SECTION A: APPLICANT INFORMATION"
      },
      organization_type: {
        label: "Organization Type",
        type: "select",
        required: true,
        options: ["501(c)(3)", "Government", "Other"],
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
      project_summary: {
        label: "Project Summary",
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
      project_narrative: {
        label: "Project Narrative",
        type: "textarea",
        required: true,
        placeholder: "1000 words max",
        section: "SECTION C: PROJECT DESCRIPTION"
      },
      project_goals: {
        label: "Project Goals and Objectives",
        type: "textarea",
        required: true,
        section: "SECTION C: PROJECT DESCRIPTION"
      },
      organization_mission: {
        label: "Organization Mission",
        type: "textarea",
        required: true,
        section: "SECTION D: ORGANIZATIONAL CAPACITY"
      },
      years_in_operation: {
        label: "Years in Operation",
        type: "number",
        required: true,
        section: "SECTION D: ORGANIZATIONAL CAPACITY"
      },
      annual_budget: {
        label: "Annual Operating Budget",
        type: "currency",
        required: true,
        section: "SECTION D: ORGANIZATIONAL CAPACITY"
      },
      certification_501c3: {
        label: "I certify that the organization is tax-exempt under section 501(c)(3)",
        type: "checkbox",
        required: true,
        section: "SECTION H: CERTIFICATION"
      }
    },
    formMetadata: {
      title: "Missouri Common Grant Application", 
      version: "2.0",
      totalFields: 15,
      sections: 4,
      documentType: "grant_application"
    }
  }

  console.log('📝 Simulated dynamic form structure with', Object.keys(mockDynamicFormStructure.formFields).length, 'fields')

  // Step 2: Test document generation with the extracted structure
  const testApplicationData = {
    opportunity: {
      title: 'Missouri Community Development Grant',
      sponsor: 'Missouri Department of Social Services',
      amount_min: 10000,
      amount_max: 50000,
      description: 'Community development funding for Missouri nonprofits'
    },
    project: {
      name: 'Kingway Affordable Housing Initiative',
      project_type: 'affordable_housing',
      description: 'Development of affordable housing for low-income families',
      goals: 'Provide stable housing for 75 individuals in the Kansas City area',
      budget: 45000,
      timeline: '18 months'
    },
    userProfile: {
      organization_name: 'Kingway Community Development Corporation',
      full_name: 'Sarah Johnson',
      location: 'Kansas City, Missouri',
      organization_type: '501(c)(3)'
    },
    analysis: {
      fitScore: 92,
      strengths: ['Strong mission alignment', 'Experienced team'],
      challenges: ['Competitive funding'],
      recommendations: ['Highlight community partnerships'],
      reasoning: 'Excellent match for community development priorities'
    },
    dynamicFormStructure: mockDynamicFormStructure // This is the key fix
  }

  console.log('🚀 Testing document generation with dynamic form structure...')

  try {
    const result = await new Promise((resolve, reject) => {
      const postData = JSON.stringify(testApplicationData)
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/ai/generate-document',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      const req = http.request(options, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || data}`))
            } else {
              resolve(parsed)
            }
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}, Response: ${data}`))
          }
        })
      })

      req.on('error', (e) => {
        reject(new Error(`Request error: ${e.message}`))
      })

      req.write(postData)
      req.end()
    })

    if (!result.success) {
      throw new Error(`Generation failed: ${result.error}`)
    }

    // Analyze the results
    console.log('✅ Document generation successful!')
    console.log('')
    
    const metadata = result.metadata || {}
    const formFields = result.formFields || []
    
    console.log('📊 Results Analysis:')
    console.log(`   Template Used: ${metadata.templateUsed}`)
    console.log(`   Form Title: ${metadata.title}`)
    console.log(`   Form Type: ${metadata.formType}`)
    console.log(`   Generated Fields: ${formFields.length}`)
    console.log(`   Expected Fields: ${Object.keys(mockDynamicFormStructure.formFields).length}`)
    
    // Check if all expected fields were generated
    const expectedFields = Object.keys(mockDynamicFormStructure.formFields)
    const generatedFieldNames = formFields.map(f => f.fieldName)
    
    const matchedFields = expectedFields.filter(field => 
      generatedFieldNames.includes(field)
    )
    const missingFields = expectedFields.filter(field => 
      !generatedFieldNames.includes(field)
    )
    
    console.log(`   Matched Fields: ${matchedFields.length}/${expectedFields.length}`)
    console.log(`   Coverage: ${Math.round((matchedFields.length / expectedFields.length) * 100)}%`)
    
    if (missingFields.length > 0) {
      console.log(`   Missing Fields: ${missingFields.join(', ')}`)
    }

    // Show some sample generated content
    console.log('')
    console.log('📝 Sample Generated Content:')
    formFields.slice(0, 3).forEach(field => {
      const value = field.value || ''
      const truncated = value.length > 80 ? value.substring(0, 80) + '...' : value
      console.log(`   ${field.label}: "${truncated}"`)
    })

    // Test success criteria
    const templateDetected = metadata.templateUsed === true
    const goodCoverage = matchedFields.length >= (expectedFields.length * 0.8) // At least 80%
    const hasContent = formFields.every(f => f.value && f.value.length > 5)

    console.log('')
    console.log('🎯 Fix Validation:')
    console.log(`   ✅ Template Detection: ${templateDetected ? 'PASS' : 'FAIL'}`)
    console.log(`   ✅ Field Coverage: ${goodCoverage ? 'PASS' : 'FAIL'}`)
    console.log(`   ✅ Content Quality: ${hasContent ? 'PASS' : 'FAIL'}`)
    
    const fixWorking = templateDetected && goodCoverage && hasContent
    console.log(`   🏆 Overall Fix Status: ${fixWorking ? 'SUCCESS ✅' : 'NEEDS WORK ❌'}`)

    if (!fixWorking) {
      console.log('')
      console.log('🔍 Issue Analysis:')
      if (!templateDetected) {
        console.log('   • Dynamic form structure not being detected by generate-document API')
        console.log('   • Check if dynamicFormStructure is properly passed in request body')
      }
      if (!goodCoverage) {
        console.log('   • Not generating enough fields from the template')
        console.log('   • AI may not be following the form structure properly')
      }
      if (!hasContent) {
        console.log('   • Generated content is too brief or missing')
        console.log('   • Check AI prompt and content generation logic')
      }
    } else {
      console.log('')
      console.log('🎉 The fix is working! Dynamic form structures are now properly')
      console.log('   being detected and used for document generation.')
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`)
  }

  console.log('')
  console.log('=' .repeat(50))
  console.log('🏁 Dynamic Form Fix Test Complete')
}

// Auto-run if this script is executed directly
if (require.main === module) {
  testDynamicFormFix().catch(console.error)
}

module.exports = { testDynamicFormFix }