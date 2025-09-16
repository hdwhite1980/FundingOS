// Remaining step components for EnhancedOnboardingFlow.js
import { Users, Target } from 'lucide-react'

// Step 3: Organizational Capacity
function OrganizationalCapacity({ formData, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Users className="w-6 h-6 mr-2 text-emerald-600" />
          Organizational Capacity
        </h3>
        <p className="text-gray-600">Understanding your organization's capacity helps match appropriate funding levels</p>
      </div>
      
      {/* Budget and Size */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Organization Size</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">Annual Operating Budget</label>
            <select
              name="annual_budget"
              className="form-input"
              value={formData.annual_budget}
              onChange={onChange}
            >
              <option value="">Select budget range</option>
              <option value="50000">Under $50K</option>
              <option value="150000">$50K - $250K</option>
              <option value="625000">$250K - $1M</option>
              <option value="3000000">$1M - $5M</option>
              <option value="5000000">$5M+</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">Full-Time Staff Count</label>
            <input
              type="number"
              name="full_time_staff"
              className="form-input"
              value={formData.full_time_staff}
              onChange={onChange}
              placeholder="Number of full-time employees"
              min="0"
            />
          </div>
          
          <div>
            <label className="form-label">Board of Directors Size</label>
            <input
              type="number"
              name="board_size"
              className="form-input"
              value={formData.board_size}
              onChange={onChange}
              placeholder="Number of board members"
              min="0"
            />
          </div>
          
          <div>
            <label className="form-label">Years in Operation</label>
            <input
              type="number"
              name="years_in_operation"
              className="form-input"
              value={formData.years_in_operation}
              onChange={onChange}
              placeholder="Years since founding"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Grant Experience */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Grant Management Experience</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">Grant Experience Level</label>
            <select
              name="grant_experience"
              className="form-input"
              value={formData.grant_experience}
              onChange={onChange}
            >
              <option value="">Select experience level</option>
              <option value="first_time">First-time grant seeker</option>
              <option value="1_3_grants">1-3 successful grants</option>
              <option value="4_10_grants">4-10 successful grants</option>
              <option value="10_plus_grants">10+ successful grants managed</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">Largest Grant Previously Awarded</label>
            <input
              type="number"
              name="largest_grant"
              className="form-input"
              value={formData.largest_grant}
              onChange={onChange}
              placeholder="Dollar amount"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Capacity Areas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Grant Writing Capacity</label>
          <select
            name="grant_writing_capacity"
            className="form-input"
            value={formData.grant_writing_capacity}
            onChange={onChange}
          >
            <option value="">Select capacity level</option>
            <option value="dedicated_staff">Dedicated grant writer on staff</option>
            <option value="part_time">Part-time grant writing support</option>
            <option value="executive_director">Executive Director writes grants</option>
            <option value="volunteer">Volunteer grant writer</option>
            <option value="no_capacity">No current grant writing capacity</option>
          </select>
        </div>
        
        <div>
          <label className="form-label">Data Collection & Evaluation Capacity</label>
          <select
            name="data_collection_capacity"
            className="form-input"
            value={formData.data_collection_capacity}
            onChange={onChange}
          >
            <option value="">Select capacity level</option>
            <option value="robust_systems">Robust data systems with regular reporting</option>
            <option value="basic_procedures">Basic data collection procedures</option>
            <option value="informal_tracking">Informal tracking methods</option>
            <option value="no_systematic">No systematic data collection</option>
          </select>
        </div>
      </div>

      {/* Partnership Approach */}
      <div>
        <label className="form-label">Partnership Approach</label>
        <select
          name="partnership_approach"
          className="form-input"
          value={formData.partnership_approach}
          onChange={onChange}
        >
          <option value="">Select partnership style</option>
          <option value="lead_collaboratives">Lead collaborative initiatives</option>
          <option value="equal_partner">Equal partner in collaborations</option>
          <option value="subcontractor">Subcontractor/junior partner</option>
          <option value="work_independently">Prefer to work independently</option>
        </select>
      </div>
    </div>
  )
}

// Step 4: Mission & Focus
function MissionFocus({ formData, onChange, onArrayChange }) {
  const handleServiceAreasChange = (area) => {
    const current = formData.primary_service_areas || []
    if (current.includes(area)) {
      onArrayChange('primary_service_areas', current.filter(a => a !== area))
    } else {
      onArrayChange('primary_service_areas', [...current, area])
    }
  }

  const handleDemographicsChange = (demographic) => {
    const current = formData.target_demographics || []
    if (current.includes(demographic)) {
      onArrayChange('target_demographics', current.filter(d => d !== demographic))
    } else {
      onArrayChange('target_demographics', [...current, demographic])
    }
  }

  const handleDifferentiatorsChange = (index, value) => {
    const current = [...formData.unique_differentiators]
    current[index] = value
    onArrayChange('unique_differentiators', current)
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Target className="w-6 h-6 mr-2 text-emerald-600" />
          Mission & Core Identity
        </h3>
        <p className="text-gray-600">Define your organization's purpose and focus areas</p>
      </div>
      
      {/* Mission Statement */}
      <div>
        <label className="form-label">Mission Statement</label>
        <textarea
          name="mission_statement"
          className="form-input h-24"
          value={formData.mission_statement}
          onChange={onChange}
          placeholder="Provide a brief mission statement (2-3 sentences)"
          rows="3"
        />
        <p className="text-sm text-gray-500 mt-1">Keep it concise - this will be used to match funding opportunities</p>
      </div>

      {/* Primary Service Areas */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Primary Service Areas (Check all that apply)</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {SERVICE_AREAS.map((area) => (
            <label key={area} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
              <input
                type="checkbox"
                checked={formData.primary_service_areas?.includes(area) || false}
                onChange={() => handleServiceAreasChange(area)}
                className="mr-3"
              />
              <span className="text-sm">{area}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Target Demographics */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Target Demographics (General populations served)</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {TARGET_DEMOGRAPHICS.map((demographic) => (
            <label key={demographic} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
              <input
                type="checkbox"
                checked={formData.target_demographics?.includes(demographic) || false}
                onChange={() => handleDemographicsChange(demographic)}
                className="mr-3"
              />
              <span className="text-sm">{demographic}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Unique Differentiators */}
      <div>
        <label className="form-label">What makes your organization unique? (3 key differentiators)</label>
        {[0, 1, 2].map((index) => (
          <div key={index} className="mt-3">
            <input
              type="text"
              className="form-input"
              value={formData.unique_differentiators?.[index] || ''}
              onChange={(e) => handleDifferentiatorsChange(index, e.target.value)}
              placeholder={`Differentiator ${index + 1}`}
            />
          </div>
        ))}
      </div>

      {/* Key Outcomes */}
      <div>
        <label className="form-label">Key organizational outcomes/metrics you track</label>
        <textarea
          name="key_outcomes"
          className="form-input h-20"
          value={formData.key_outcomes}
          onChange={onChange}
          placeholder="List the main metrics or outcomes your organization measures (e.g., people served, programs completed, etc.)"
          rows="3"
        />
      </div>
    </div>
  )
}

// Step 5: Financial Systems
function FinancialSystems({ formData, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-emerald-600" />
          Financial Systems & Audit Status
        </h3>
        <p className="text-gray-600">Financial management capabilities affect grant eligibility</p>
      </div>
      
      {/* Audit Status */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Current Audit Status</h4>
        <div className="space-y-3">
          {[
            { value: 'independent_audit', label: 'Current independent audit (required for $750K+ federal grants)' },
            { value: 'financial_review', label: 'Financial review completed' },
            { value: 'compiled_statements', label: 'Compiled financial statements' },
            { value: 'no_formal_statements', label: 'No formal financial statements' }
          ].map((option) => (
            <label key={option.value} className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
              <input
                type="radio"
                name="audit_status"
                value={option.value}
                checked={formData.audit_status === option.value}
                onChange={onChange}
                className="mr-3"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
        
        {formData.audit_status === 'no_formal_statements' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex">
              <HelpCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
              <div>
                <h5 className="font-medium text-amber-800">Audit Requirements</h5>
                <p className="text-sm text-amber-700 mt-1">
                  Most federal grants over $750K require independent audits. Consider upgrading your financial reporting to access larger funding opportunities.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Management Systems */}
      <div>
        <label className="form-label">Financial Management Systems</label>
        <select
          name="financial_systems"
          className="form-input"
          value={formData.financial_systems}
          onChange={onChange}
        >
          <option value="">Select system type</option>
          <option value="advanced_software">Advanced accounting software with grant tracking</option>
          <option value="basic_software">Basic accounting software</option>
          <option value="manual_tracking">Manual/spreadsheet tracking</option>
          <option value="need_upgrade">Need to upgrade systems</option>
        </select>
      </div>

      {/* Indirect Cost Rate */}
      <div>
        <label className="form-label">Indirect Cost Rate (for federal grants)</label>
        <input
          type="text"
          name="indirect_cost_rate"
          className="form-input"
          value={formData.indirect_cost_rate}
          onChange={onChange}
          placeholder="e.g., 10% de minimis rate, or negotiated rate"
        />
        <p className="text-sm text-gray-500 mt-1">
          Federal grants allow a 10% de minimis rate, or you can negotiate a higher rate with documentation
        </p>
      </div>
    </div>
  )
}

// Step 6: Certifications (Enhanced)
function Certifications({ formData, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Award className="w-6 h-6 mr-2 text-emerald-600" />
          Certifications & Set-Asides
        </h3>
        <p className="text-gray-600">These certifications can unlock additional funding opportunities with set-asides</p>
      </div>
      
      {/* Standard Certifications */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Standard Business Certifications</h4>
        <div className="space-y-4">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="minority_owned"
              name="minority_owned"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.minority_owned}
              onChange={onChange}
            />
            <label htmlFor="minority_owned" className="ml-3">
              <span className="text-sm font-medium text-gray-700">Minority-Owned Business Enterprise (MBE)</span>
              <p className="text-xs text-gray-500">51%+ owned by minority individuals</p>
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="woman_owned"
              name="woman_owned"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.woman_owned}
              onChange={onChange}
            />
            <label htmlFor="woman_owned" className="ml-3">
              <span className="text-sm font-medium text-gray-700">Woman-Owned Business Enterprise (WBE)</span>
              <p className="text-xs text-gray-500">51%+ owned by women</p>
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="veteran_owned"
              name="veteran_owned"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.veteran_owned}
              onChange={onChange}
            />
            <label htmlFor="veteran_owned" className="ml-3">
              <span className="text-sm font-medium text-gray-700">Veteran-Owned Small Business (VOSB)</span>
              <p className="text-xs text-gray-500">51%+ owned by veterans</p>
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="small_business"
              name="small_business"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.small_business}
              onChange={onChange}
            />
            <label htmlFor="small_business" className="ml-3">
              <span className="text-sm font-medium text-gray-700">Small Business Administration (SBA) Certified</span>
              <p className="text-xs text-gray-500">Meets SBA size standards for your industry</p>
            </label>
          </div>
        </div>
      </div>

      {/* Specialized Certifications */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Specialized SBA Certifications</h4>
        <div className="space-y-4">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="eight_a_certified"
              name="eight_a_certified"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.eight_a_certified}
              onChange={onChange}
            />
            <label htmlFor="eight_a_certified" className="ml-3">
              <span className="text-sm font-medium text-gray-700">8(a) Business Development Program</span>
              <p className="text-xs text-gray-500">Socially and economically disadvantaged small business</p>
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="hubzone_certified"
              name="hubzone_certified"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.hubzone_certified}
              onChange={onChange}
            />
            <label htmlFor="hubzone_certified" className="ml-3">
              <span className="text-sm font-medium text-gray-700">HUBZone Certified</span>
              <p className="text-xs text-gray-500">Located in Historically Underutilized Business Zone</p>
            </label>
          </div>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="disadvantaged_business"
              name="disadvantaged_business"
              className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
              checked={formData.disadvantaged_business}
              onChange={onChange}
            />
            <label htmlFor="disadvantaged_business" className="ml-3">
              <span className="text-sm font-medium text-gray-700">Economically Disadvantaged Business</span>
              <p className="text-xs text-gray-500">Meets economically disadvantaged criteria</p>
            </label>
          </div>
        </div>
      </div>
      
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Award className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-emerald-800">Why certifications matter</h4>
            <p className="text-sm text-emerald-700 mt-1">
              Many funding programs reserve a percentage of funds specifically for certified businesses. Having these certifications can significantly increase your chances of securing funding and may provide access to exclusive opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 7: Complete Setup (Enhanced)
function CompleteSetup({ formData }) {
  const getOrganizationTypeLabel = (value) => {
    const type = ORGANIZATION_TYPES.find(t => t.value === value)
    return type ? type.label : value
  }

  return (
    <div className="space-y-8 text-center">
      <div>
        <CheckCircle className="h-20 w-20 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-3xl font-bold text-gray-900 mb-2">Profile Complete!</h3>
        <p className="text-lg text-gray-600">Your comprehensive profile is ready for funding opportunities</p>
      </div>
      
      {/* Enhanced Profile Summary */}
      <div className="bg-slate-50 rounded-lg p-6 text-left">
        <h4 className="font-semibold text-gray-900 mb-6 text-center">Organization Profile Summary</h4>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-800 border-b pb-1">Basic Information</h5>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Organization:</span>
                <span className="font-medium text-right max-w-[200px] truncate">{formData.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-medium text-right max-w-[200px]">{getOrganizationTypeLabel(formData.organization_type)}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-medium">{formData.city}, {formData.state}</span>
              </div>
              {formData.years_in_operation && (
                <div className="flex justify-between">
                  <span>Operating Years:</span>
                  <span className="font-medium">{formData.years_in_operation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Capacity Information */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-800 border-b pb-1">Capacity</h5>
            <div className="space-y-2 text-sm text-gray-600">
              {formData.annual_budget && (
                <div className="flex justify-between">
                  <span>Annual Budget:</span>
                  <span className="font-medium">${parseFloat(formData.annual_budget).toLocaleString()}</span>
                </div>
              )}
              {formData.full_time_staff && (
                <div className="flex justify-between">
                  <span>Full-time Staff:</span>
                  <span className="font-medium">{formData.full_time_staff}</span>
                </div>
              )}
              {formData.grant_experience && (
                <div className="flex justify-between">
                  <span>Grant Experience:</span>
                  <span className="font-medium">{formData.grant_experience.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Service Areas */}
        {formData.primary_service_areas?.length > 0 && (
          <div className="mt-6">
            <h5 className="font-medium text-gray-800 border-b pb-1 mb-2">Primary Service Areas</h5>
            <div className="flex flex-wrap gap-2">
              {formData.primary_service_areas.slice(0, 4).map((area, index) => (
                <span key={index} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                  {area}
                </span>
              ))}
              {formData.primary_service_areas.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{formData.primary_service_areas.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Certifications */}
        {(formData.minority_owned || formData.woman_owned || formData.veteran_owned || formData.small_business) && (
          <div className="mt-6">
            <h5 className="font-medium text-gray-800 border-b pb-1 mb-2">Certifications</h5>
            <div className="flex flex-wrap gap-2">
              {formData.minority_owned && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">MBE</span>}
              {formData.woman_owned && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">WBE</span>}
              {formData.veteran_owned && <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">VOSB</span>}
              {formData.small_business && <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">SBA</span>}
            </div>
          </div>
        )}
      </div>
      
      {/* What happens next */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
        <h4 className="font-medium text-emerald-800 mb-3 text-lg">🚀 What happens next?</h4>
        <div className="grid md:grid-cols-2 gap-4 text-left">
          <ul className="text-sm text-emerald-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">✨</span>
              <span>AI analyzes your profile for funding opportunities</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🎯</span>
              <span>Get personalized matches with eligibility scores</span>
            </li>
          </ul>
          <ul className="text-sm text-emerald-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">🤖</span>
              <span>AI-powered application assistance</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📊</span>
              <span>Track progress and deadlines</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Next Step Call to Action */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-lg p-6 text-white">
        <h4 className="font-semibold text-lg mb-2">Ready to create your first project?</h4>
        <p className="text-emerald-100 mb-4">
          Create project profiles to get specific funding recommendations tailored to your initiatives.
        </p>
        <div className="text-sm text-emerald-100">
          You can always update your organization profile later as your capacity grows.
        </div>
      </div>
    </div>
  )
}

// Constants used by the onboarding steps
const ORGANIZATION_TYPES = [
  { value: 'nonprofit_501c3', label: '501(c)(3) Nonprofit' },
  { value: 'nonprofit_501c4', label: '501(c)(4) Social Welfare Organization' },
  { value: 'government_federal', label: 'Government Entity (Federal)' },
  { value: 'government_state', label: 'Government Entity (State)' },
  { value: 'government_local', label: 'Government Entity (Local)' },
  { value: 'educational_public', label: 'Educational Institution (Public)' },
  { value: 'educational_private', label: 'Educational Institution (Private)' },
  { value: 'faith_based', label: 'Faith-Based Organization' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'minority_owned', label: 'Minority-Owned Business' },
  { value: 'women_owned', label: 'Women-Owned Business' },
  { value: 'veteran_owned', label: 'Veteran-Owned Business' },
  { value: 'b_corporation', label: 'B-Corporation' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'tribal_organization', label: 'Tribal Organization' },
  { value: 'other', label: 'Other' }
]

const SERVICE_AREAS = [
  'Education & Workforce Development',
  'Healthcare & Public Health',
  'Housing & Community Development',
  'Arts & Culture',
  'Environment & Conservation',
  'Social Services & Human Services',
  'Economic Development',
  'Technology & Innovation',
  'Research & Development',
  'Agriculture & Food Security',
  'Criminal Justice & Public Safety',
  'Disaster Relief & Emergency Services',
  'International Development'
]

const TARGET_DEMOGRAPHICS = [
  'Children & Youth (0-17)',
  'Young Adults (18-24)',
  'Adults (25-64)',
  'Seniors (65+)',
  'Low-income individuals/families',
  'Minority populations',
  'Individuals with disabilities',
  'Veterans',
  'Homeless populations',
  'Rural communities',
  'Urban communities',
  'Tribal populations',
  'LGBTQ+ individuals'
]

// Export all components
export {
  OrganizationalCapacity,
  MissionFocus,
  FinancialSystems,
  Certifications,
  CompleteSetup,
  SERVICE_AREAS,
  TARGET_DEMOGRAPHICS,
  ORGANIZATION_TYPES
}