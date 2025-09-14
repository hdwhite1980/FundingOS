/**
 * Test Missouri Common Grant Application form generation
 * This simulates what should happen when the uploaded form is properly analyzed
 */

// Mock the properly extracted Missouri Common Grant Application template
const missouriFormTemplate = {
  formFields: {
    organization_name: {
      label: "Organization Name",
      type: "text",
      required: true,
      section: "SECTION A: APPLICANT INFORMATION"
    },
    federal_tax_id_number: {
      label: "Federal Tax ID Number",
      type: "text",
      required: true,
      section: "SECTION A: APPLICANT INFORMATION"
    },
    organization_type: {
      label: "Organization Type",
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
    primary_contact_phone: {
      label: "Primary Contact Phone",
      type: "tel",
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
    project_start_date: {
      label: "Project Start Date",
      type: "date",
      required: true,
      section: "SECTION B: PROJECT INFORMATION"
    },
    project_end_date: {
      label: "Project End Date",
      type: "date",
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
    },
    personnel_costs: {
      label: "Personnel Costs",
      type: "currency",
      required: true,
      section: "SECTION E: BUDGET NARRATIVE"
    },
    equipment_costs: {
      label: "Equipment Costs",
      type: "currency",
      required: true,
      section: "SECTION E: BUDGET NARRATIVE"
    }
  },
  metadata: {
    title: "Missouri Common Grant Application",
    version: "2.0",
    totalFields: 16,
    sections: 5
  }
}

// Mock project and opportunity data (Kingway Affordable Housing)
const mockProjectData = {
  name: "Kingway Affordable Housing Initiative",
  project_type: "affordable_housing",
  description: "A residential development project that provides quality affordable housing for low to moderate-income families in our community.",
  goals: "Develop 50 affordable housing units with sustainable building practices and community support services",
  budget: 750000,
  timeline: "12 months"
}

const mockOpportunityData = {
  title: "Community Development Block Grant",
  sponsor: "Missouri Department of Economic Development",
  amount_min: 100000,
  amount_max: 1000000,
  description: "Grants for affordable housing and community development projects"
}

const mockUserProfile = {
  organization_name: "Test Company",
  full_name: "John Smith",
  organization_type: "For-Profit Corporation",
  email: "john.smith@testcompany.com",
  phone: "(555) 123-4567",
  location: "Kansas City, MO"
}

// Function to generate the filled Missouri form
function generateMissouriForm(template, projectData, opportunityData, userProfile) {
  const filledFields = []
  
  Object.entries(template.formFields).forEach(([fieldName, fieldInfo]) => {
    let value = ""
    
    switch (fieldName) {
      case 'organization_name':
        value = userProfile.organization_name
        break
      case 'federal_tax_id_number':
        value = "XX-XXXXXXX" // Would come from user profile
        break
      case 'organization_type':
        value = userProfile.organization_type
        break
      case 'primary_contact_name':
        value = userProfile.full_name
        break
      case 'primary_contact_email':
        value = userProfile.email
        break
      case 'primary_contact_phone':
        value = userProfile.phone
        break
      case 'project_title':
        value = projectData.name
        break
      case 'project_summary_250_words':
        value = `The ${projectData.name} addresses the critical need for affordable housing in our community by developing a sustainable residential project. This initiative will provide quality living spaces for low to moderate-income families while implementing innovative construction methods and energy-efficient technologies. Our comprehensive approach includes community engagement, support services, and long-term sustainability planning. The project aligns with community development goals and will create lasting positive impact through improved housing stability, economic development, and enhanced quality of life for residents. We will collaborate with local stakeholders to ensure the project meets diverse community needs and establishes a model for future affordable housing initiatives in the region.`
        break
      case 'total_project_cost':
        value = `$${projectData.budget.toLocaleString()}`
        break
      case 'amount_requested':
        value = `$${Math.min(projectData.budget, opportunityData.amount_max).toLocaleString()}`
        break
      case 'project_start_date':
        value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        break
      case 'project_end_date':
        value = new Date(Date.now() + 395 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // ~13 months
        break
      case 'statement_of_need':
        value = `Our community faces a severe affordable housing shortage, with over 40% of residents spending more than 30% of their income on housing costs. The rising cost of living combined with stagnant wages has created a critical gap in available affordable housing options. Many families are forced to live in substandard conditions or face displacement due to inability to find suitable housing within their means. This housing instability contributes to broader social issues including educational disruption for children, increased healthcare costs, and reduced economic mobility. The ${projectData.name} directly addresses this urgent need by providing high-quality, affordable housing options that will help stabilize families and strengthen our community. Current market analysis shows a deficit of over 200 affordable housing units in our area, making this project essential for community wellbeing and economic development.`
        break
      case 'project_goals_objectives':
        value = `1. Develop and construct 50 affordable housing units within 12 months\n2. Implement sustainable building practices reducing energy consumption by 30%\n3. Establish on-site community support services including job training and financial literacy programs\n4. Create partnerships with local organizations to provide ongoing resident support\n5. Achieve 95% occupancy rate within 6 months of completion\n6. Generate positive economic impact through job creation during construction phase\n7. Establish a replicable model for future affordable housing developments`
        break
      case 'personnel_costs':
        value = `$${(projectData.budget * 0.3).toLocaleString()}` // 30% of budget
        break
      case 'equipment_costs':
        value = `$${(projectData.budget * 0.15).toLocaleString()}` // 15% of budget
        break
      default:
        value = `[This field would be filled based on project data and user profile]`
    }
    
    filledFields.push({
      fieldName: fieldName,
      label: fieldInfo.label,
      value: value,
      type: fieldInfo.type,
      section: fieldInfo.section
    })
  })
  
  return {
    formFields: filledFields,
    metadata: {
      title: template.metadata.title,
      applicant: userProfile.organization_name,
      date: new Date().toLocaleDateString(),
      templateUsed: true,
      originalTemplate: "Missouri-Common-Grant-Application-Version-2.0_0.pdf"
    }
  }
}

// Test the generation
console.log('🎯 Testing Missouri Common Grant Application Form Generation')
console.log('='.repeat(60))

const filledForm = generateMissouriForm(
  missouriFormTemplate,
  mockProjectData,
  mockOpportunityData,
  mockUserProfile
)

console.log('\n📝 FILLED MISSOURI COMMON GRANT APPLICATION:')
console.log('='.repeat(60))

// Group by sections
const fieldsBySection = {}
filledForm.formFields.forEach(field => {
  if (!fieldsBySection[field.section]) {
    fieldsBySection[field.section] = []
  }
  fieldsBySection[field.section].push(field)
})

// Display organized results
Object.keys(fieldsBySection).forEach(section => {
  console.log(`\n\n${section}`)
  console.log('-'.repeat(section.length))
  
  fieldsBySection[section].forEach(field => {
    console.log(`\n${field.label}:`)
    if (field.type === 'textarea') {
      // Format multi-line text
      const lines = field.value.split('\n')
      lines.forEach(line => console.log(`  ${line}`))
    } else {
      console.log(`  ${field.value}`)
    }
  })
})

console.log('\n\n' + '='.repeat(60))
console.log('📋 METADATA:')
console.log('='.repeat(60))
console.log(`Title: ${filledForm.metadata.title}`)
console.log(`Applicant: ${filledForm.metadata.applicant}`)
console.log(`Date: ${filledForm.metadata.date}`)
console.log(`Template Used: ${filledForm.metadata.templateUsed}`)
console.log(`Original Template: ${filledForm.metadata.originalTemplate}`)

console.log('\n\n' + '='.repeat(60))
console.log('✅ THIS IS WHAT YOUR GENERATED DOCUMENT SHOULD LOOK LIKE!')
console.log('💡 The output should match the exact Missouri Common Grant Application form')
console.log('   with your project data filled into the specific form fields.')
console.log('='.repeat(60))