// Project step components for EnhancedCreateProjectModal
import { 
  Building, 
  Users, 
  DollarSign, 
  CheckCircle, 
  Target,
  Award,
  Lightbulb,
  HelpCircle,
  AlertCircle
} from 'lucide-react'

import { 
  PROJECT_CATEGORIES, 
  PROJECT_DURATIONS, 
  PROJECT_STATUS, 
  FUNDING_TYPES, 
  URGENCY_LEVELS, 
  EVALUATION_PLANS, 
  PROJECT_ROLES 
} from './EnhancedCreateProjectModal'

// Step 1: Project Basics
export function ProjectBasics({ formData, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <Building className="w-5 h-5 mr-2 text-emerald-600" />
          Project Basics
        </h3>
        <p className="text-gray-600">Define your project's core identity and purpose</p>
      </div>
      
      {/* Project Title */}
      <div>
        <label className="form-label">Project Title *</label>
        <input
          type="text"
          name="name"
          className="form-input"
          value={formData.name}
          onChange={onChange}
          placeholder="Enter a clear, descriptive project title"
          required
        />
        <p className="text-sm text-gray-500 mt-1">Keep it concise but descriptive - this will appear in funding applications</p>
      </div>

      {/* Project Description */}
      <div>
        <label className="form-label">Project Description *</label>
        <textarea
          name="description"
          className="form-input h-32"
          value={formData.description}
          onChange={onChange}
          placeholder="Provide a detailed description of your project goals, activities, and expected outcomes (2-3 paragraphs)"
          rows="6"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Include: What you'll do, who you'll serve, and what changes you expect to achieve
        </p>
      </div>

      {/* Project Category */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Project Category * (Select all that apply)</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {PROJECT_CATEGORIES.map((category) => (
            <label key={category.value} className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
              <input
                type="checkbox"
                name="project_categories"
                value={category.value}
                checked={formData.project_categories?.includes(category.value) || false}
                onChange={(e) => {
                  const currentCategories = formData.project_categories || []
                  let updatedCategories
                  
                  if (e.target.checked) {
                    // Add category if checked
                    updatedCategories = [...currentCategories, category.value]
                  } else {
                    // Remove category if unchecked
                    updatedCategories = currentCategories.filter(cat => cat !== category.value)
                  }
                  
                  // Create synthetic event for the parent onChange handler
                  const syntheticEvent = {
                    target: {
                      name: 'project_categories',
                      value: updatedCategories
                    }
                  }
                  onChange(syntheticEvent)
                }}
                className="mr-3"
              />
              <span className="text-sm font-medium">{category.label}</span>
            </label>
          ))}
        </div>
        
        {formData.project_categories?.includes('other') && (
          <div className="mt-4">
            <label className="form-label">Please specify:</label>
            <input
              type="text"
              name="project_category_other"
              className="form-input"
              value={formData.project_category_other}
              onChange={onChange}
              placeholder="Describe your project category"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Step 2: Scope & Impact
export function ScopeImpact({ formData, onChange }) {
  // Helper function to format numbers with commas
  const formatNumber = (value) => {
    if (!value || isNaN(value)) return ''
    const num = parseInt(value)
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Handler for number input changes
  const handleNumberChange = (e) => {
    const { name, value } = e.target
    // Remove any non-numeric characters
    const cleanValue = value.replace(/[^\d]/g, '')
    onChange({
      target: {
        name,
        value: cleanValue
      }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <Target className="w-5 h-5 mr-2 text-emerald-600" />
          Scope & Impact
        </h3>
        <p className="text-gray-600">Define who you'll serve and your project timeline</p>
      </div>
      
      {/* Population Served */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Specific Population This Project Serves</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">Target Population Description *</label>
            <textarea
              name="target_population_description"
              className="form-input h-24"
              value={formData.target_population_description}
              onChange={onChange}
              placeholder="Describe the specific demographics, characteristics, and needs of the people this project will serve"
              rows="3"
              required
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Estimated Number of People Served *</label>
              <input
                type="text"
                name="estimated_people_served"
                className="form-input"
                value={formData.estimated_people_served ? formatNumber(formData.estimated_people_served) : ''}
                onChange={handleNumberChange}
                placeholder="Number of direct beneficiaries"
                required
              />
              {formData.estimated_people_served && (
                <p className="text-xs text-emerald-600 mt-1">
                  {formatNumber(formData.estimated_people_served)} people
                </p>
              )}
            </div>
            
            <div>
              <label className="form-label">Geographic Area for This Project *</label>
              <input
                type="text"
                name="project_location"
                className="form-input"
                value={formData.project_location}
                onChange={onChange}
                placeholder="City, county, region, or service area"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Project Timeline */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Project Timeline</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Proposed Start Date</label>
            <input
              type="date"
              name="proposed_start_date"
              className="form-input"
              value={formData.proposed_start_date}
              onChange={onChange}
            />
          </div>
          
          <div>
            <label className="form-label">Project Duration *</label>
            <select
              name="project_duration"
              className="form-input"
              value={formData.project_duration}
              onChange={onChange}
              required
            >
              <option value="">Select duration</option>
              {PROJECT_DURATIONS.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="form-label">Key Milestones/Phases</label>
          <textarea
            name="key_milestones"
            className="form-input h-20"
            value={formData.key_milestones}
            onChange={onChange}
            placeholder="List major project milestones, phases, or deliverables with approximate timing"
            rows="3"
          />
        </div>
      </div>
    </div>
  )
}

// Step 3: Funding Requirements
export function FundingRequirements({ formData, onChange }) {
  const calculatePercentages = () => {
    const total = [
      formData.personnel_percentage,
      formData.equipment_percentage,
      formData.travel_percentage,
      formData.indirect_percentage,
      formData.other_percentage
    ].reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    
    return total
  }

  // Helper function to format currency values
  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return '$0'
    const num = parseFloat(value)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  // Helper function to format numbers with commas
  const formatNumber = (value) => {
    if (!value || isNaN(value)) return '0'
    const num = parseFloat(value)
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Handler for currency input changes
  const handleCurrencyChange = (e) => {
    const { name, value } = e.target
    // Remove any non-numeric characters except decimal points
    const cleanValue = value.replace(/[^\d.]/g, '')
    onChange({
      target: {
        name,
        value: cleanValue
      }
    })
  }

  const percentageTotal = calculatePercentages()

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
          Funding Requirements
        </h3>
        <p className="text-gray-600">Define your project budget and funding needs</p>
      </div>
      
      {/* Total Budget */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Total Project Budget *</h4>
        <div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">$</span>
            <input
              type="text"
              name="total_project_budget"
              className="form-input text-lg font-medium pl-8"
              value={formData.total_project_budget ? formatNumber(formData.total_project_budget) : ''}
              onChange={handleCurrencyChange}
              placeholder="0"
              required
            />
          </div>
          {formData.total_project_budget && (
            <p className="text-sm text-emerald-600 mt-1 font-medium">
              Total Budget: {formatCurrency(formData.total_project_budget)}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">Include all costs: personnel, equipment, supplies, indirect costs, etc.</p>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Budget Breakdown (Percentages)</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Personnel (salaries/benefits) %</label>
            <input
              type="number"
              name="personnel_percentage"
              className="form-input"
              value={formData.personnel_percentage}
              onChange={onChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="form-label">Equipment/Supplies %</label>
            <input
              type="number"
              name="equipment_percentage"
              className="form-input"
              value={formData.equipment_percentage}
              onChange={onChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="form-label">Travel %</label>
            <input
              type="number"
              name="travel_percentage"
              className="form-input"
              value={formData.travel_percentage}
              onChange={onChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="form-label">Indirect/Administrative %</label>
            <input
              type="number"
              name="indirect_percentage"
              className="form-input"
              value={formData.indirect_percentage}
              onChange={onChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="form-label">Other %</label>
            <input
              type="number"
              name="other_percentage"
              className="form-input"
              value={formData.other_percentage}
              onChange={onChange}
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white rounded border">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Percentage:</span>
            <span className={`font-bold text-lg ${
              percentageTotal === 100 ? 'text-emerald-600' : 
              percentageTotal > 100 ? 'text-red-600' : 'text-amber-600'
            }`}>
              {percentageTotal.toFixed(1)}%
            </span>
          </div>
          {percentageTotal !== 100 && (
            <p className={`text-sm mt-1 ${
              percentageTotal > 100 ? 'text-red-600' : 'text-amber-600'
            }`}>
              {percentageTotal > 100 ? 'Total exceeds 100%' : 'Total should equal 100%'}
            </p>
          )}
        </div>
      </div>

      {/* Funding Request and Match */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Funding Request Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">$</span>
            <input
              type="text"
              name="funding_request_amount"
              className="form-input pl-8"
              value={formData.funding_request_amount ? formatNumber(formData.funding_request_amount) : ''}
              onChange={handleCurrencyChange}
              placeholder="0"
              required
            />
          </div>
          {formData.funding_request_amount && (
            <p className="text-xs text-emerald-600 mt-1">
              {formatCurrency(formData.funding_request_amount)}
            </p>
          )}
        </div>
        
        <div>
          <label className="form-label">Cash Match Available</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">$</span>
            <input
              type="text"
              name="cash_match_available"
              className="form-input pl-8"
              value={formData.cash_match_available ? formatNumber(formData.cash_match_available) : ''}
              onChange={handleCurrencyChange}
              placeholder="0"
            />
          </div>
          {formData.cash_match_available && (
            <p className="text-xs text-emerald-600 mt-1">
              {formatCurrency(formData.cash_match_available)}
            </p>
          )}
        </div>
        
        <div>
          <label className="form-label">In-Kind Match Available</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">$</span>
            <input
              type="text"
              name="in_kind_match_available"
              className="form-input pl-8"
              value={formData.in_kind_match_available ? formatNumber(formData.in_kind_match_available) : ''}
              onChange={handleCurrencyChange}
              placeholder="0"
            />
          </div>
          {formData.in_kind_match_available && (
            <p className="text-xs text-emerald-600 mt-1">
              {formatCurrency(formData.in_kind_match_available)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Step 4: Project Readiness
export function ProjectReadiness({ formData, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-emerald-600" />
          Project Readiness
        </h3>
        <p className="text-gray-600">Assess your organization's readiness to implement this project</p>
      </div>
      
      {/* Current Status */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Current Project Status *</h4>
        <div className="space-y-3">
          {PROJECT_STATUS.map((status) => (
            <label key={status.value} className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
              <input
                type="radio"
                name="current_status"
                value={status.value}
                checked={formData.current_status === status.value}
                onChange={onChange}
                className="mr-3"
                required
              />
              <span className="text-sm">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Key Personnel */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Key Personnel Identified</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Project Director Status</label>
            <select
              name="project_director_status"
              className="form-input"
              value={formData.project_director_status}
              onChange={onChange}
            >
              <option value="">Select status</option>
              <option value="hired">Hired and ready</option>
              <option value="identified">Identified but not hired</option>
              <option value="need_recruit">Need to recruit</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">Key Staff Status</label>
            <select
              name="key_staff_status"
              className="form-input"
              value={formData.key_staff_status}
              onChange={onChange}
            >
              <option value="">Select status</option>
              <option value="in_place">Staff in place</option>
              <option value="partially_staffed">Partially staffed</option>
              <option value="need_hire">Need to hire</option>
            </select>
          </div>
        </div>
      </div>

      {/* Partnership Requirements */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Partnership Requirements</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">Collaborating Organizations</label>
            <textarea
              name="collaborating_organizations"
              className="form-input h-20"
              value={formData.collaborating_organizations}
              onChange={onChange}
              placeholder="List partner organizations and their roles in this project"
              rows="3"
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Partnership MOUs Status</label>
              <select
                name="partnership_mous"
                className="form-input"
                value={formData.partnership_mous}
                onChange={onChange}
              >
                <option value="">Select status</option>
                <option value="in_place">MOUs in place</option>
                <option value="in_progress">In progress</option>
                <option value="needed">Needed</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Your Role in Partnerships</label>
              <select
                name="partnership_role"
                className="form-input"
                value={formData.partnership_role}
                onChange={onChange}
              >
                <option value="">Select role</option>
                {PROJECT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 5: Outcomes & Evaluation
export function OutcomesEvaluation({ formData, onChange, onArrayChange, onGoalsChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <Target className="w-5 h-5 mr-2 text-emerald-600" />
          Outcomes & Evaluation
        </h3>
        <p className="text-gray-600">Define your project goals and measurement strategy</p>
      </div>
      
      {/* Primary Goals */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Primary Goals (3-5 specific objectives)</h4>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="mb-3">
            <label className="form-label">Goal {index + 1} {index < 3 ? '*' : ''}</label>
            <input
              type="text"
              className="form-input"
              value={formData.primary_goals?.[index] || ''}
              onChange={(e) => onGoalsChange(index, e.target.value)}
              placeholder={`Enter specific, measurable goal ${index + 1}`}
              required={index < 3}
            />
          </div>
        ))}
      </div>

      {/* Measurable Outcomes */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Measurable Outcomes</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">Output Measures *</label>
            <textarea
              name="output_measures"
              className="form-input h-20"
              value={formData.output_measures}
              onChange={onChange}
              placeholder="What you'll produce: events held, services delivered, materials created, etc."
              rows="3"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Outputs are activities and products directly produced by your project</p>
          </div>
          
          <div>
            <label className="form-label">Outcome Measures *</label>
            <textarea
              name="outcome_measures"
              className="form-input h-20"
              value={formData.outcome_measures}
              onChange={onChange}
              placeholder="Changes in participants: knowledge gained, skills developed, behaviors changed, etc."
              rows="3"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Outcomes are changes in people served by your project</p>
          </div>
          
          <div>
            <label className="form-label">Impact Measures</label>
            <textarea
              name="impact_measures"
              className="form-input h-20"
              value={formData.impact_measures}
              onChange={onChange}
              placeholder="Long-term community or population changes: reduced poverty, improved health outcomes, etc."
              rows="3"
            />
            <p className="text-sm text-gray-500 mt-1">Impacts are broader, long-term changes in the community</p>
          </div>
        </div>
      </div>

      {/* Evaluation Plan */}
      <div>
        <label className="form-label">Evaluation Plan</label>
        <select
          name="evaluation_plan"
          className="form-input"
          value={formData.evaluation_plan}
          onChange={onChange}
        >
          <option value="">Select evaluation approach</option>
          {EVALUATION_PLANS.map((plan) => (
            <option key={plan.value} value={plan.value}>
              {plan.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// Step 6: Funding Strategy
export function FundingStrategy({ formData, onChange, onFundingTypesChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <Award className="w-5 h-5 mr-2 text-emerald-600" />
          Funding Strategy
        </h3>
        <p className="text-gray-600">Define your funding preferences and timeline</p>
      </div>
      
      {/* Funding Type Preferences */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Funding Type Preferences for This Project</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {FUNDING_TYPES.map((type) => (
            <label key={type} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
              <input
                type="checkbox"
                checked={formData.preferred_funding_types?.includes(type) || false}
                onChange={() => onFundingTypesChange(type)}
                className="mr-3"
              />
              <span className="text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Funding Timeline */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Funding Timeline</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">When do you need funding decisions? *</label>
            <input
              type="date"
              name="funding_decision_needed"
              className="form-input"
              value={formData.funding_decision_needed}
              onChange={onChange}
              required
            />
          </div>
          
          <div>
            <label className="form-label">Latest start date that would still be useful</label>
            <input
              type="date"
              name="latest_useful_start"
              className="form-input"
              value={formData.latest_useful_start}
              onChange={onChange}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="form-label">Urgency Level</label>
          <select
            name="urgency_level"
            className="form-input"
            value={formData.urgency_level}
            onChange={onChange}
          >
            <option value="">Select urgency level</option>
            {URGENCY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sustainability Plan */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Sustainability Plan</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">How will this project continue after grant ends? *</label>
            <textarea
              name="sustainability_plan"
              className="form-input h-20"
              value={formData.sustainability_plan}
              onChange={onChange}
              placeholder="Describe your plan for sustaining the project beyond the initial funding period"
              rows="3"
              required
            />
          </div>
          
          <div>
            <label className="form-label">Other funding sources being pursued</label>
            <textarea
              name="other_funding_sources"
              className="form-input h-20"
              value={formData.other_funding_sources}
              onChange={onChange}
              placeholder="List other grants, donors, or revenue sources you're pursuing for this project"
              rows="3"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 7: Innovation & Review
export function InnovationReview({ formData, onChange }) {
  // Helper function to format currency values consistently
  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return 'Not specified'
    const num = parseFloat(value)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  // Helper function to format people served with commas
  const formatNumber = (value) => {
    if (!value || isNaN(value)) return 'Not specified'
    const num = parseInt(value)
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-emerald-600" />
          Innovation & Differentiation
        </h3>
        <p className="text-gray-600">Highlight what makes your project unique and strategic</p>
      </div>
      
      {/* Innovation */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Project Uniqueness</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">What makes this project unique/innovative? *</label>
            <textarea
              name="unique_innovation"
              className="form-input h-24"
              value={formData.unique_innovation}
              onChange={onChange}
              placeholder="Describe what sets this project apart from similar initiatives"
              rows="4"
              required
            />
          </div>
          
          <div>
            <label className="form-label">Evidence base supporting this approach</label>
            <textarea
              name="evidence_base"
              className="form-input h-20"
              value={formData.evidence_base}
              onChange={onChange}
              placeholder="Research, best practices, or pilot results that support your project approach"
              rows="3"
            />
          </div>
          
          <div>
            <label className="form-label">How this project fits with your organization's strategic plan</label>
            <textarea
              name="strategic_fit"
              className="form-input h-20"
              value={formData.strategic_fit}
              onChange={onChange}
              placeholder="Explain how this project advances your organization's mission and strategic goals"
              rows="3"
            />
          </div>
        </div>
      </div>

      {/* Project Summary for Review */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
        <h4 className="font-semibold text-emerald-800 mb-4">Project Summary</h4>
        <div className="space-y-2 text-sm text-emerald-700">
          <div className="flex justify-between">
            <span className="font-medium">Project Name:</span>
            <span className="text-right max-w-[250px] truncate">{formData.name || 'Not specified'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Categories:</span>
            <span className="text-right max-w-[250px]">
              {formData.project_categories?.length > 0 
                ? formData.project_categories.map(cat => 
                    PROJECT_CATEGORIES.find(c => c.value === cat)?.label || cat
                  ).join(', ')
                : 'Not specified'
              }
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">People Served:</span>
            <span>{formatNumber(formData.estimated_people_served)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Total Budget:</span>
            <span className="font-semibold">
              {formatCurrency(formData.total_project_budget)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Funding Request:</span>
            <span className="font-semibold">
              {formatCurrency(formData.funding_request_amount)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Duration:</span>
            <span>{formData.project_duration?.replace('_', ' ') || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Ready to Launch */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-lg p-6 text-white text-center">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-200" />
        <h4 className="font-semibold text-lg mb-2">Ready to Create Your Project!</h4>
        <p className="text-emerald-100 mb-4">
          Your comprehensive project profile will help identify the best funding opportunities.
        </p>
        <div className="text-sm text-emerald-100">
          Click "Create Project" to save and start matching with funding opportunities.
        </div>
      </div>
    </div>
  )
}