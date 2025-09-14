/**
 * Test Script: Dynamic Form Analysis System
 * 
 * Tests the new dynamic form field extraction system with various types of forms
 * to ensure it can handle any application form without hardcoded templates.
 */

const testDynamicFormAnalysis = async () => {
  console.log('🧪 Testing Dynamic Form Analysis System')
  console.log('=' .repeat(50))

  // Test forms of different types to validate dynamic extraction
  const testForms = [
    {
      name: 'Generic Grant Application',
      type: 'grant_application',
      content: `
GRANT APPLICATION FORM

Organization Information:
Organization Name: _________________________
EIN Number: _______________
Address: ________________________________________________
City: _______________ State: _____ ZIP: __________
Website: _________________________
Mission Statement: ________________________________________
________________________________________________________

Contact Information:
Executive Director: _______________________
Email: _____________________ Phone: _______________
Project Contact: _________________________
Email: _____________________ Phone: _______________

Project Details:
Project Title: ___________________________________
Project Description (500 words maximum):
____________________________________________________
____________________________________________________
____________________________________________________

Amount Requested: $ __________________
Project Start Date: ___________
Project End Date: _____________

Budget Summary:
Personnel: $ ____________
Equipment: $ ____________
Travel: $ _______________
Other: $ _______________
Total: $ _______________

Certification:
[ ] I certify that this information is accurate
[ ] Organization is in good standing
[ ] Will comply with all requirements

Signature: _________________________ Date: ________
      `
    },
    {
      name: 'Business Loan Application',
      type: 'loan_application',
      content: `
SMALL BUSINESS LOAN APPLICATION

Business Information:
Legal Business Name: ________________________________
DBA (if different): ________________________________
Federal Tax ID: _______________
Business Type: [ ] Corporation [ ] LLC [ ] Partnership [ ] Sole Proprietorship
Date Established: __________
Number of Employees: _______

Business Address:
Street: ___________________________________________
City: _______________ State: _____ ZIP: __________
Business Phone: _________________ Fax: ___________
Email: ______________________ Website: ___________

Owner Information:
Owner Name: ______________________________________
SSN: ________________ Date of Birth: ______________
Home Address: ____________________________________
Home Phone: _____________ Cell: ________________
Email: _________________________

Loan Information:
Loan Amount Requested: $ _____________________
Loan Purpose: ____________________________________
Repayment Term: _________ months
Use of Funds:
Working Capital: $ _____________
Equipment: $ __________________
Real Estate: $ ________________
Other: $ _____________________

Financial Information:
Annual Gross Revenue: $ ______________________
Net Income: $ ______________________________
Current Debt: $ ____________________________
Collateral Offered: ___________________________

Authorization:
[ ] I authorize credit check
[ ] Information provided is accurate
[ ] Will provide additional documentation as requested

Applicant Signature: _________________ Date: _______
      `
    },
    {
      name: 'Event Registration Form',
      type: 'registration',
      content: `
CONFERENCE REGISTRATION FORM

Personal Information:
First Name: ________________ Last Name: _______________
Title: _________________________
Organization: __________________________________
Department: ___________________________________

Contact Information:
Email Address: ________________________________
Phone Number: ________________________________
Mobile Number: _______________________________

Mailing Address:
Address Line 1: _______________________________
Address Line 2: _______________________________
City: ______________ State/Province: ___________
ZIP/Postal Code: ______________________________
Country: ____________________________________

Registration Options:
[ ] Full Conference ($299)
[ ] Single Day Pass ($149)
[ ] Student Rate ($99)
[ ] Virtual Attendance ($49)

Workshop Selection (choose up to 3):
[ ] Workshop A: Marketing Strategies
[ ] Workshop B: Financial Planning
[ ] Workshop C: Technology Trends
[ ] Workshop D: Leadership Skills

Dietary Requirements:
[ ] No restrictions
[ ] Vegetarian
[ ] Vegan
[ ] Gluten-free
[ ] Other: ___________________

Accessibility Needs:
[ ] None
[ ] Wheelchair accessible seating
[ ] Sign language interpreter
[ ] Large print materials
[ ] Other: ___________________

Emergency Contact:
Name: ____________________________________
Relationship: ______________________________
Phone: __________________________________

Payment Information:
Total Amount Due: $ _______________________
Payment Method: [ ] Credit Card [ ] Check [ ] Purchase Order
      `
    },
    {
      name: 'Survey Form',
      type: 'survey',
      content: `
CUSTOMER SATISFACTION SURVEY

About You:
Age Group: [ ] 18-25 [ ] 26-35 [ ] 36-45 [ ] 46-55 [ ] 56+
Gender: [ ] Male [ ] Female [ ] Other [ ] Prefer not to say
Annual Income: [ ] Under $25k [ ] $25k-$50k [ ] $50k-$75k [ ] $75k-$100k [ ] Over $100k

Service Experience:
How did you hear about us?
[ ] Website [ ] Social Media [ ] Referral [ ] Advertisement
[ ] Other: ___________________

Overall Satisfaction (1-5 scale):
Service Quality: 1 2 3 4 5
Staff Helpfulness: 1 2 3 4 5
Value for Money: 1 2 3 4 5
Ease of Use: 1 2 3 4 5

What did you like most?
________________________________________________
________________________________________________

What could we improve?
________________________________________________
________________________________________________

Would you recommend us to others?
[ ] Definitely [ ] Probably [ ] Maybe [ ] Probably Not [ ] Definitely Not

Additional Comments:
________________________________________________
________________________________________________
________________________________________________

Contact Information (optional):
Name: ____________________________________
Email: __________________________________
Phone: __________________________________

May we contact you about this feedback?
[ ] Yes [ ] No
      `
    }
  ]

  // Test each form type
  for (const form of testForms) {
    console.log(`\n🔍 Testing: ${form.name}`)
    console.log('-'.repeat(30))
    
    try {
      // Call our dynamic form analysis API
      const response = await fetch('http://localhost:3000/api/ai/dynamic-form-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: form.content,
          documentType: form.type,
          extractionMode: 'comprehensive',
          context: {
            testForm: true,
            expectedType: form.type
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        const { formStructure, fieldMappings, extractionMetadata } = result.data
        
        console.log(`✅ Successfully extracted ${extractionMetadata.totalFieldsDetected} fields`)
        console.log(`📊 Sections detected: ${extractionMetadata.sectionsDetected}`)
        console.log(`🎯 Confidence: ${Math.round(extractionMetadata.confidence * 100)}%`)
        console.log(`🏷️  Detected type: ${extractionMetadata.documentType}`)
        
        // Show some example fields
        const fieldCount = Object.keys(formStructure.formFields || {}).length
        if (fieldCount > 0) {
          console.log(`\n📋 Sample Fields (showing first 5 of ${fieldCount}):`)
          const sampleFields = Object.entries(formStructure.formFields || {}).slice(0, 5)
          sampleFields.forEach(([key, field]) => {
            console.log(`  • ${field.label} (${field.type}${field.required ? ', required' : ''})`)
          })
        }

        // Show sections if detected
        if (formStructure.formSections && formStructure.formSections.length > 0) {
          console.log(`\n📑 Sections Detected:`)
          formStructure.formSections.forEach(section => {
            console.log(`  • ${section.title} (${section.fields?.length || 0} fields)`)
          })
        }

        // Show field type distribution
        if (fieldCount > 0) {
          const typeDistribution = {}
          Object.values(formStructure.formFields).forEach(field => {
            typeDistribution[field.type] = (typeDistribution[field.type] || 0) + 1
          })
          console.log(`\n🔢 Field Types:`, typeDistribution)
        }

        // Test document generation with extracted form
        console.log(`\n🚀 Testing document generation with extracted form...`)
        
        const mockApplicationData = {
          opportunity: {
            title: `Test ${form.name}`,
            sponsor: 'Test Organization',
            amount_min: 1000,
            amount_max: 10000,
            description: `Test opportunity for ${form.type}`
          },
          project: {
            name: 'Test Project',
            project_type: 'test_project',
            description: 'Test project for form validation',
            goals: 'Validate dynamic form system',
            budget: 5000,
            timeline: '6 months'
          },
          userProfile: {
            organization_name: 'Test Organization',
            full_name: 'Test User',
            location: 'Test City, ST'
          },
          analysis: {
            fitScore: 85,
            strengths: ['Good match', 'Clear objectives'],
            challenges: ['Timeline constraints'],
            recommendations: ['Follow best practices'],
            nextSteps: ['Complete application'],
            reasoning: 'Strong alignment with requirements'
          },
          dynamicFormStructure: formStructure // Use the extracted structure
        }

        const genResponse = await fetch('http://localhost:3000/api/ai/generate-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockApplicationData)
        })

        if (genResponse.ok) {
          const genResult = await genResponse.json()
          if (genResult.success) {
            console.log(`✅ Document generation successful!`)
            console.log(`📄 Generated ${genResult.formFields?.length || 0} field responses`)
            console.log(`📋 Form: ${genResult.metadata?.title || 'Generated Document'}`)
          } else {
            console.log(`❌ Document generation failed:`, genResult.error)
          }
        } else {
          console.log(`❌ Document generation request failed: ${genResponse.status}`)
        }

      } else {
        console.log(`❌ Form analysis failed:`, result.error || 'Unknown error')
      }

    } catch (error) {
      console.log(`❌ Test failed:`, error.message)
    }
  }

  console.log('\n🎉 Dynamic Form Analysis Testing Complete!')
  console.log('=' .repeat(50))
}

// Auto-run if this script is executed directly
if (require.main === module) {
  testDynamicFormAnalysis().catch(console.error)
}

module.exports = { testDynamicFormAnalysis }