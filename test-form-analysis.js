/**
 * Test script to analyze Missouri Common Grant Application form
 * This helps understand what form fields should be extracted
 */

const fs = require('fs')
const path = require('path')

// Mock the Missouri Common Grant Application structure based on typical forms
const mockFormContent = `
Missouri Common Grant Application - Version 2.0

SECTION A: APPLICANT INFORMATION
Organization Name: ___________________________
Federal Tax ID Number: _______________________
Organization Type: ___________________________
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

Total Project Cost: $_________________________
Amount Requested: $__________________________
Grant Period: From ________ to ______________
Project Start Date: _________________________
Project End Date: ___________________________

SECTION C: PROJECT DESCRIPTION
1. Statement of Need (500 words max):
___________________________________________
___________________________________________

2. Project Goals and Objectives:
Goal 1: ___________________________________
Goal 2: ___________________________________
Goal 3: ___________________________________

3. Project Activities and Timeline:
Activity 1: _______________________________
Timeline: ________________________________
Activity 2: _______________________________
Timeline: ________________________________

4. Expected Outcomes and Impact:
___________________________________________
___________________________________________

SECTION D: ORGANIZATIONAL CAPACITY
1. Organization History and Mission:
___________________________________________

2. Staff Qualifications:
Project Director: ___________________________
Key Staff Member 1: _______________________
Key Staff Member 2: _______________________

3. Previous Grant Experience:
___________________________________________

SECTION E: BUDGET NARRATIVE
Personnel Costs: $__________________________
Equipment Costs: $__________________________
Supply Costs: $____________________________
Travel Costs: $_____________________________
Other Direct Costs: $______________________
Administrative Costs: $____________________
Total Budget: $_____________________________

Budget Justification:
___________________________________________
___________________________________________

SECTION F: EVALUATION PLAN
1. Evaluation Methods:
___________________________________________

2. Success Metrics:
___________________________________________

SECTION G: SUSTAINABILITY
___________________________________________
___________________________________________

SECTION H: ATTACHMENTS CHECKLIST
☐ IRS Determination Letter
☐ Audited Financial Statements
☐ Board of Directors List
☐ Letters of Support
☐ Organizational Chart
☐ Project Timeline
☐ Budget Worksheets
`

// Extract form fields from the mock content
function extractFormFields(formContent) {
  const fields = []
  
  // Find all form fields (lines with underscores or specific patterns)
  const lines = formContent.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines and section headers
    if (!line || line.startsWith('SECTION') || line.startsWith('☐')) continue
    
    // Look for field patterns
    if (line.includes(':') && (line.includes('_') || line.includes('$_'))) {
      const [label, ...rest] = line.split(':')
      const fieldName = label.trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
      
      let fieldType = 'text'
      let required = true
      
      // Determine field type based on label
      if (label.toLowerCase().includes('email')) fieldType = 'email'
      else if (label.toLowerCase().includes('phone')) fieldType = 'tel'
      else if (label.toLowerCase().includes('website')) fieldType = 'url'
      else if (label.toLowerCase().includes('date')) fieldType = 'date'
      else if (label.toLowerCase().includes('cost') || label.toLowerCase().includes('amount') || label.toLowerCase().includes('$')) fieldType = 'currency'
      else if (label.toLowerCase().includes('summary') || label.toLowerCase().includes('description') || label.toLowerCase().includes('narrative')) fieldType = 'textarea'
      
      // Check for word limits
      let placeholder = ''
      const nextLine = lines[i + 1]?.trim() || ''
      if (nextLine.includes('words max') || nextLine.includes('characters max')) {
        placeholder = nextLine
      } else if (line.includes('max')) {
        const match = line.match(/\((\d+\s+words?\s+max)\)/i)
        if (match) placeholder = match[1]
      }
      
      fields.push({
        label: label.trim(),
        fieldName,
        type: fieldType,
        required,
        placeholder: placeholder || (fieldType === 'textarea' ? 'Provide detailed information...' : ''),
        section: getCurrentSection(lines, i)
      })
    }
    
    // Look for multi-line text areas
    else if (line.includes('(') && line.includes('words max')) {
      const prevLine = lines[i - 1]?.trim() || ''
      if (prevLine.endsWith(':')) {
        const label = prevLine.replace(':', '').trim()
        const fieldName = label.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '_')
        
        fields.push({
          label,
          fieldName,
          type: 'textarea',
          required: true,
          placeholder: line.trim(),
          section: getCurrentSection(lines, i)
        })
      }
    }
  }
  
  return fields
}

function getCurrentSection(lines, currentIndex) {
  // Look backwards to find the most recent section header
  for (let i = currentIndex; i >= 0; i--) {
    const line = lines[i].trim()
    if (line.startsWith('SECTION')) {
      return line
    }
  }
  return 'General'
}

// Test the extraction
console.log('🔍 Analyzing Missouri Common Grant Application form structure...\n')

const extractedFields = extractFormFields(mockFormContent)

console.log(`📋 Found ${extractedFields.length} form fields:\n`)

// Group by section
const fieldsBySection = {}
extractedFields.forEach(field => {
  if (!fieldsBySection[field.section]) {
    fieldsBySection[field.section] = []
  }
  fieldsBySection[field.section].push(field)
})

// Display organized results
Object.keys(fieldsBySection).forEach(section => {
  console.log(`\n${section}:`)
  fieldsBySection[section].forEach(field => {
    console.log(`  • ${field.label}`)
    console.log(`    Field: ${field.fieldName}, Type: ${field.type}, Required: ${field.required}`)
    if (field.placeholder) console.log(`    Hint: ${field.placeholder}`)
  })
})

console.log('\n' + '='.repeat(80))
console.log('📝 Complete Form Template Structure:')
console.log('='.repeat(80))

const formTemplate = {
  formFields: {},
  metadata: {
    title: 'Missouri Common Grant Application',
    version: '2.0',
    totalFields: extractedFields.length,
    sections: Object.keys(fieldsBySection).length
  }
}

extractedFields.forEach(field => {
  formTemplate.formFields[field.fieldName] = {
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder,
    section: field.section
  }
})

console.log(JSON.stringify(formTemplate, null, 2))

console.log('\n' + '='.repeat(80))
console.log('🎯 This is the structure that should be extracted from your uploaded form!')
console.log('💡 When you upload the Missouri Common Grant Application PDF,')
console.log('   the system should extract these fields and use them as a template.')
console.log('='.repeat(80))