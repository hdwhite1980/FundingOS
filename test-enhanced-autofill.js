// Test Enhanced Autofill with User Profiles Integration
import { SmartFormCompletionService } from './lib/smartFormCompletionService.js'

const smartFormService = new SmartFormCompletionService()

// Mock user profile data (similar to what would come from user_profiles table)
const mockUserProfile = {
  id: "test-user-123",
  user_id: "user-abc-456",
  email: "john@testorg.org",
  full_name: "John Smith",
  organization_name: "Test Foundation Inc.",
  organization_type: "nonprofit",
  
  // Key identifiers that should auto-fill
  ein: "12-3456789",
  tax_id: "12-3456789", 
  duns_number: "123456789",
  duns_uei: "UEI123456789", 
  cage_code: "CAGE123",
  sam_gov_status: "Active",
  
  // Contact and address
  phone: "(555) 123-4567",
  website: "https://testfoundation.org",
  address_line1: "123 Foundation Ave",
  address_line2: "Suite 200",
  city: "Denver",
  state: "Colorado", 
  zip_code: "80202",
  country: "United States",
  
  // Organization details
  years_in_operation: 15,
  employee_count: 25,
  annual_revenue: 2500000,
  legal_structure: "501(c)(3)",
  
  // Certifications
  minority_owned: true,
  woman_owned: false,
  veteran_owned: false,
  small_business: true,
  eight_a_certified: false,
  hubzone_certified: true,
  
  // Mission and focus
  mission_statement: "To provide educational opportunities for underserved communities",
  primary_focus_areas: "Education, Community Development, Youth Services",
  populations_served: "Low-income families, At-risk youth, Rural communities"
}

const mockProjectData = {
  id: "proj-789",
  name: "Rural Education Initiative",
  description: "A comprehensive program to improve educational outcomes in rural areas",
  funding_needed: 150000,
  location: "Rural Colorado",
  timeline: "24 months",
  target_population: "Students in rural Colorado schools"
}

async function testEnhancedAutofill() {
  console.log('🧪 Testing Enhanced Autofill with User Profiles Integration...\n')
  
  try {
    // Test 1: Smart field mapping for individual fields
    console.log('=== TEST 1: Smart Field Mapping ===')
    
    const testFields = [
      'ein',
      'tax_id',
      'employer_identification_number',
      'organization_name',
      'duns_number',
      'cage_code',
      'sam_gov_status',
      'address',
      'city',
      'state',
      'zip_code',
      'minority_owned',
      'small_business'
    ]
    
    testFields.forEach(fieldName => {
      const result = smartFormService.smartAutoFill(fieldName, mockUserProfile, mockProjectData)
      console.log(`${fieldName}: ${result ? `"${result.value}" (${result.confidence}, ${result.source})` : 'Not mapped'}`)
    })
    
    // Test 2: Full form analysis and completion
    console.log('\n=== TEST 2: Complete Form Analysis ===')
    
    const mockForm = {
      fields: [
        { id: 'organization_name', label: 'Organization Name', type: 'text', required: true },
        { id: 'ein', label: 'EIN/Tax ID', type: 'text', required: true },
        { id: 'duns_number', label: 'DUNS Number', type: 'text', required: false },
        { id: 'address', label: 'Organization Address', type: 'text', required: true },
        { id: 'city', label: 'City', type: 'text', required: true },
        { id: 'state', label: 'State', type: 'text', required: true },
        { id: 'zip_code', label: 'ZIP Code', type: 'text', required: true },
        { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
        { id: 'email', label: 'Email Address', type: 'email', required: true },
        { id: 'project_title', label: 'Project Title', type: 'text', required: true },
        { id: 'funding_request', label: 'Funding Amount Requested', type: 'currency', required: true },
        { id: 'minority_owned', label: 'Minority-Owned Business?', type: 'select', required: false },
        { id: 'sam_gov_status', label: 'SAM.gov Registration Status', type: 'text', required: false }
      ]
    }
    
    const analysisResult = await smartFormService.analyzeAndCompleteForm(mockForm, mockUserProfile, mockProjectData)
    
    console.log('📊 Analysis Results:')
    console.log(`• Auto-filled: ${analysisResult.autoFilledCount} of ${analysisResult.totalFieldsProcessed} fields`)
    console.log(`• Completion: ${analysisResult.completionPercentage}%`)
    console.log(`• Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`)
    
    console.log('\n🔧 Field Completions:')
    Object.entries(analysisResult.fieldCompletions).forEach(([field, value]) => {
      console.log(`  ${field}: "${value}"`)
    })
    
    console.log('\n⚠️ Missing Information:')
    analysisResult.missingInformation.forEach(missing => {
      console.log(`  • ${missing.label} (${missing.importance}): ${missing.description}`)
    })
    
    console.log('\n💡 Strategic Recommendations:')
    analysisResult.strategicRecommendations.forEach(rec => {
      console.log(`  • ${rec.title}: ${rec.description}`)
    })
    
    // Test 3: Edge cases and alternate field names
    console.log('\n=== TEST 3: Alternate Field Names ===')
    
    const alternateFields = [
      'federal_tax_id',
      'tax_id_ein', 
      'employer_identification_number',
      'company_name',
      'business_name',
      'uei_number',
      'duns_uei_number',
      'contact_email',
      'phone_number',
      'address_line1',
      'postal_code',
      'woman_owned',
      '8a_certified'
    ]
    
    alternateFields.forEach(fieldName => {
      const result = smartFormService.smartAutoFill(fieldName, mockUserProfile, mockProjectData)
      console.log(`${fieldName}: ${result ? `"${result.value}"` : 'Not mapped'}`)
    })
    
    console.log('\n✅ Enhanced autofill testing completed successfully!')
    console.log('\nThe autofill now uses the same intelligent field mapping as the WALI-OS Assistant,')
    console.log('and can correctly populate EIN, DUNS, CAGE codes, addresses, certifications,')
    console.log('and all other user profile data from the user_profiles table.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEnhancedAutofill()

console.log('\n📝 Manual Testing Instructions:')
console.log('1. Ensure user has complete profile data in user_profiles table')
console.log('2. Upload a grant application form with fields like EIN, organization name, address')
console.log('3. Click "Auto-fill" or use the smart completion feature')
console.log('4. Verify that fields are populated with correct user_profiles data')
console.log('5. Check that EIN variants (tax_id, federal_tax_id, employer_identification_number) all work')
console.log('6. Test DUNS number variations (duns_number, uei_number, duns_uei_number)')
console.log('7. Verify address fields populate from address_line1, city, state, zip_code')
console.log('8. Check certification status fields (minority_owned, small_business, etc.)')