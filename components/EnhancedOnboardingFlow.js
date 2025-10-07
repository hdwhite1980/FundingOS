// Enhanced OnboardingFlow with comprehensive organization setup questions
'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  MapPin, 
  DollarSign, 
  Users, 
  FileText, 
  CheckCircle,
  Shield,
  Globe,
  Target,
  Award,
  HelpCircle
} from 'lucide-react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import toast from 'react-hot-toast'
import {
  OrganizationalCapacity,
  MissionFocus,
  FinancialSystems,
  Certifications,
  CompleteSetup,
  SERVICE_AREAS,
  TARGET_DEMOGRAPHICS,
  ORGANIZATION_TYPES
} from './OnboardingSteps'

const steps = [
  { id: 1, title: 'Legal Foundation', icon: Building2, description: 'Organization type and compliance' },
  { id: 2, title: 'Location & Contact', icon: MapPin, description: 'Address and contact information' },
  { id: 3, title: 'Organizational Capacity', icon: Users, description: 'Budget, staff, and experience' },
  { id: 4, title: 'Mission & Focus', icon: Target, description: 'Services and populations served' },
  { id: 5, title: 'Financial Systems', icon: DollarSign, description: 'Audit status and management systems' },
  { id: 6, title: 'Certifications', icon: Award, description: 'Special qualifications and set-asides' },
  { id: 7, title: 'Complete Setup', icon: CheckCircle, description: 'Review and finish' }
]

export default function OnboardingFlow({ user, existingProfile, onComplete }) {
  const supabase = useSupabaseClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const contentRef = useRef(null)
  const [formData, setFormData] = useState({
    // Basic Info
    full_name: existingProfile?.full_name || user.user_metadata?.full_name || '',
    organization_name: existingProfile?.organization_name || user.user_metadata?.organization_name || '',
    organization_type: existingProfile?.organization_type || '',
    organization_types: existingProfile?.organization_types || (existingProfile?.organization_type ? [existingProfile.organization_type] : []),
    organization_type_other: existingProfile?.organization_type_other || '',
    
    // Legal Foundation
    tax_id: existingProfile?.tax_id || '',
    date_incorporated: existingProfile?.date_incorporated || '',
    state_incorporated: existingProfile?.state_incorporated || '',
    sam_gov_status: existingProfile?.sam_gov_status || '',
    grants_gov_status: existingProfile?.grants_gov_status || '',
    duns_uei_number: existingProfile?.duns_uei_number || '',
    compliance_history: existingProfile?.compliance_history || '',
    
    // Location & Contact
    address_line1: existingProfile?.address_line1 || '',
    address_line2: existingProfile?.address_line2 || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    zip_code: existingProfile?.zip_code || '',
    phone: existingProfile?.phone || '',
    website: existingProfile?.website || '',
    service_radius: existingProfile?.service_radius || '',
    additional_service_areas: existingProfile?.additional_service_areas || [],
    
    // Organizational Capacity
    annual_budget: existingProfile?.annual_budget || '',
    full_time_staff: existingProfile?.full_time_staff || '',
    board_size: existingProfile?.board_size || '',
    years_in_operation: existingProfile?.years_in_operation || '',
    grant_experience: existingProfile?.grant_experience || '',
    largest_grant: existingProfile?.largest_grant || '',
    grant_writing_capacity: existingProfile?.grant_writing_capacity || '',
    data_collection_capacity: existingProfile?.data_collection_capacity || '',
    partnership_approach: existingProfile?.partnership_approach || '',
    
    // Mission & Focus
    mission_statement: existingProfile?.mission_statement || '',
    primary_service_areas: existingProfile?.primary_service_areas || [],
    target_demographics: existingProfile?.target_demographics || [],
    unique_differentiators: existingProfile?.unique_differentiators || ['', '', ''],
    key_outcomes: existingProfile?.key_outcomes || '',
    
    // Financial Systems
    audit_status: existingProfile?.audit_status || '',
    financial_systems: existingProfile?.financial_systems || '',
    indirect_cost_rate: existingProfile?.indirect_cost_rate || '',
    
    // Certifications & Set-Asides
    minority_owned: existingProfile?.minority_owned || false,
    woman_owned: existingProfile?.woman_owned || false,
    veteran_owned: existingProfile?.veteran_owned || false,
    small_business: existingProfile?.small_business || false,
    hubzone_certified: existingProfile?.hubzone_certified || false,
    eight_a_certified: existingProfile?.eight_a_certified || false,
    disadvantaged_business: existingProfile?.disadvantaged_business || false
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleArrayChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  useEffect(() => {
    if (contentRef.current) {
      try {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      } catch {
        contentRef.current.scrollTop = 0
      }
    }
  }, [currentStep])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Sanitize numeric fields before sending to database
      const sanitizeNumericField = (value) => {
        if (value === '' || value === null || value === undefined) return null
        const num = typeof value === 'string' ? Number(value) : Number(value)
        return Number.isFinite(num) ? num : null
      }

      const profileData = {
        ...formData,
        user_id: user.id,  // Fixed: was 'id', should be 'user_id'
        email: user.email,
        setup_completed: true,
        // Sanitize all known numeric fields in profiles table
        annual_budget: sanitizeNumericField(formData.annual_budget),
        years_in_operation: sanitizeNumericField(formData.years_in_operation),
        full_time_staff: sanitizeNumericField(formData.full_time_staff),
        board_size: sanitizeNumericField(formData.board_size),
        largest_grant: sanitizeNumericField(formData.largest_grant),
        service_radius: sanitizeNumericField(formData.service_radius),
        // Additional numeric fields from database schema
        incorporation_year: sanitizeNumericField(formData.incorporation_year),
        years_operating: sanitizeNumericField(formData.years_operating),
        part_time_staff: sanitizeNumericField(formData.part_time_staff),
        volunteers: sanitizeNumericField(formData.volunteers),
        board_members: sanitizeNumericField(formData.board_members),
        indirect_cost_rate: sanitizeNumericField(formData.indirect_cost_rate)
      }

      // Clean up any remaining empty strings in the entire object
      const cleanedProfileData = {}
      for (const [key, value] of Object.entries(profileData)) {
        cleanedProfileData[key] = value === '' ? null : value
      }

      console.log('Profile data being saved:', cleanedProfileData) // Debug log
      console.log('setup_completed value:', cleanedProfileData.setup_completed) // Debug log

      // Use direct supabase call with proper sanitization
      const { data: profile, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(cleanedProfileData, { onConflict: 'user_id' })  // Changed from 'id' to 'user_id'
        .select()
        .single()

      if (upsertError) throw upsertError

      console.log('Profile saved successfully:', profile) // Debug log
      console.log('Saved profile setup_completed:', profile.setup_completed) // Debug log

      toast.success('Profile setup completed!')
      
      // Small delay to ensure database transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      onComplete(profile)
    } catch (error) {
      console.error('Profile save error:', error) // Debug log
      toast.error('Failed to save profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <LegalFoundation formData={formData} onChange={handleInputChange} onArrayChange={handleArrayChange} />
      case 2:
        return <LocationContact formData={formData} onChange={handleInputChange} onArrayChange={handleArrayChange} />
      case 3:
        return <OrganizationalCapacity formData={formData} onChange={handleInputChange} />
      case 4:
        return <MissionFocus formData={formData} onChange={handleInputChange} onArrayChange={handleArrayChange} />
      case 5:
        return <FinancialSystems formData={formData} onChange={handleInputChange} />
      case 6:
        return <Certifications formData={formData} onChange={handleInputChange} />
      case 7:
        return <CompleteSetup formData={formData} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Enhanced Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              const isNext = currentStep + 1 === step.id
              
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative
                    ${isCompleted 
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-105' 
                      : isActive 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-110 ring-4 ring-emerald-200'
                        : isNext
                          ? 'bg-white border-emerald-300 text-emerald-600 shadow-md'
                          : 'bg-white border-slate-300 text-slate-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <span className={`text-xs font-medium block ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {step.title}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 hidden sm:block">
                      {step.description}
                    </span>
                  </div>
                  
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className={`absolute top-6 left-1/2 w-full h-0.5 -translate-y-0.5 -z-10 hidden lg:block
                      ${currentStep > step.id ? 'bg-emerald-600' : 'bg-slate-300'}`}
                      style={{ transform: 'translateY(-50%) translateX(50%)', width: 'calc(100% - 3rem)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Mobile Progress Bar */}
          <div className="relative mt-6 lg:hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-200 rounded-full"></div>
            <div 
              className="absolute top-0 left-0 h-2 bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          <div className="card-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="card-footer flex justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
            
            {currentStep === steps.length ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : null}
                Complete Setup
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 1: Legal Foundation & Compliance
function LegalFoundation({ formData, onChange, onArrayChange }) {
  const toggleOrgType = (value) => {
    const current = formData.organization_types || []
    let updated
    if (current.includes(value)) {
      updated = current.filter(v => v !== value)
    } else {
      updated = [...current, value]
    }
    onArrayChange('organization_types', updated)
    const primary = updated[0] || ''
    if (primary !== formData.organization_type) {
      onChange({ target: { name: 'organization_type', value: primary, type: 'text' } })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-emerald-600" />
          Legal Foundation & Compliance
        </h3>
        <p className="text-gray-600">Foundation information that applies to ALL funding opportunities</p>
      </div>
      
      {/* Basic Organization Info */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Basic Information</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">Contact Person Name *</label>
            <input
              type="text"
              name="full_name"
              className="form-input"
              value={formData.full_name}
              onChange={onChange}
              placeholder="Your full name"
              required
            />
          </div>
          
          <div>
            <label className="form-label">Organization Name *</label>
            <input
              type="text"
              name="organization_name"
              className="form-input"
              value={formData.organization_name}
              onChange={onChange}
              placeholder="Your organization's legal name"
              required
            />
          </div>
        </div>
      </div>

      {/* Organization Type */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-2">Organization Type (Select all that apply) *</h4>
        <p className="text-sm text-gray-600 mb-4">Your primary type will be set as the first selection.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {ORGANIZATION_TYPES.map((type) => (
            <label key={type.value} className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
              <input
                type="checkbox"
                name="organization_types"
                value={type.value}
                checked={formData.organization_types?.includes(type.value) || false}
                onChange={() => toggleOrgType(type.value)}
                className="mr-3"
              />
              <span className="text-sm font-medium">{type.label}</span>
            </label>
          ))}
        </div>

        {formData.organization_types?.includes('other') && (
          <div className="mt-4">
            <label className="form-label">Please specify:</label>
            <input
              type="text"
              name="organization_type_other"
              className="form-input"
              value={formData.organization_type_other}
              onChange={onChange}
              placeholder="Describe your organization type"
            />
          </div>
        )}
      </div>

      {/* Legal Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Tax ID/EIN Number *</label>
          <input
            type="text"
            name="tax_id"
            className="form-input"
            value={formData.tax_id}
            onChange={onChange}
            placeholder="XX-XXXXXXX"
            required
          />
        </div>
        
        <div>
          <label className="form-label">Date of Incorporation</label>
          <input
            type="date"
            name="date_incorporated"
            className="form-input"
            value={formData.date_incorporated}
            onChange={onChange}
          />
        </div>
        
        <div>
          <label className="form-label">State of Incorporation</label>
          <input
            type="text"
            name="state_incorporated"
            className="form-input"
            value={formData.state_incorporated}
            onChange={onChange}
            placeholder="Delaware, California, etc."
          />
        </div>
        
        <div>
          <label className="form-label">DUNS/UEI Number</label>
          <input
            type="text"
            name="duns_uei_number"
            className="form-input"
            value={formData.duns_uei_number}
            onChange={onChange}
            placeholder="Unique Entity Identifier"
          />
          <p className="text-sm text-gray-500 mt-1">Required for federal grants</p>
        </div>
      </div>

      {/* Registration Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">SAM.gov Registration Status</label>
          <select
            name="sam_gov_status"
            className="form-input"
            value={formData.sam_gov_status}
            onChange={onChange}
          >
            <option value="">Select status</option>
            <option value="active">Active and current</option>
            <option value="needs_renewal">Needs renewal</option>
            <option value="not_registered">Not registered</option>
            <option value="dont_know">Don't know</option>
          </select>
        </div>
        
        <div>
          <label className="form-label">Grants.gov Registration Status</label>
          <select
            name="grants_gov_status"
            className="form-input"
            value={formData.grants_gov_status}
            onChange={onChange}
          >
            <option value="">Select status</option>
            <option value="active">Active and current</option>
            <option value="needs_setup">Needs setup</option>
            <option value="not_registered">Not registered</option>
            <option value="dont_know">Don't know</option>
          </select>
        </div>
      </div>

      {/* Compliance History */}
      <div>
        <label className="form-label">Federal Compliance History</label>
        <select
          name="compliance_history"
          className="form-input"
          value={formData.compliance_history}
          onChange={onChange}
        >
          <option value="">Select compliance status</option>
          <option value="clean">Clean record - no compliance issues</option>
          <option value="minor_resolved">Minor issues resolved</option>
          <option value="addressing_issues">Currently addressing compliance issues</option>
          <option value="major_violations">Major compliance violations</option>
        </select>
      </div>
    </div>
  )
}

// Step 2: Location & Contact (Enhanced)
function LocationContact({ formData, onChange, onArrayChange }) {
  const handleServiceAreasChange = (area) => {
    const current = formData.additional_service_areas || []
    if (current.includes(area)) {
      onArrayChange('additional_service_areas', current.filter(a => a !== area))
    } else {
      onArrayChange('additional_service_areas', [...current, area])
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-emerald-600" />
          Location & Service Areas
        </h3>
        <p className="text-gray-600">Your location helps us find geographically relevant funding opportunities</p>
      </div>
      
      {/* Primary Address */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Primary Address</h4>
        <div className="space-y-4">
          <div>
            <label className="form-label">Address Line 1 *</label>
            <input
              type="text"
              name="address_line1"
              className="form-input"
              value={formData.address_line1}
              onChange={onChange}
              placeholder="Street address"
              required
            />
          </div>
          
          <div>
            <label className="form-label">Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              className="form-input"
              value={formData.address_line2}
              onChange={onChange}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">City *</label>
              <input
                type="text"
                name="city"
                className="form-input"
                value={formData.city}
                onChange={onChange}
                placeholder="City"
                required
              />
            </div>
            
            <div>
              <label className="form-label">State *</label>
              <input
                type="text"
                name="state"
                className="form-input"
                value={formData.state}
                onChange={onChange}
                placeholder="State"
                required
              />
            </div>
            
            <div>
              <label className="form-label">ZIP Code *</label>
              <input
                type="text"
                name="zip_code"
                className="form-input"
                value={formData.zip_code}
                onChange={onChange}
                placeholder="ZIP"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Phone Number *</label>
          <input
            type="tel"
            name="phone"
            className="form-input"
            value={formData.phone}
            onChange={onChange}
            placeholder="(555) 123-4567"
            required
          />
        </div>
        
        <div>
          <label className="form-label">Website</label>
          <input
            type="url"
            name="website"
            className="form-input"
            value={formData.website}
            onChange={onChange}
            placeholder="https://example.com"
          />
        </div>
      </div>

      {/* Service Geography */}
      <div>
        <label className="form-label">Primary Service Radius</label>
        <select
          name="service_radius"
          className="form-input"
          value={formData.service_radius}
          onChange={onChange}
        >
          <option value="">Select service area</option>
          <option value="neighborhood">Neighborhood/Community</option>
          <option value="city">City/Municipality</option>
          <option value="county">County</option>
          <option value="multi_county">Multi-county region</option>
          <option value="state">State</option>
          <option value="multi_state">Multi-state region</option>
          <option value="national">National</option>
          <option value="international">International</option>
        </select>
      </div>
    </div>
  )
}

// Continuing with the remaining steps...
// (I'll continue with the other step components in the next part due to length)

// Export the enhanced onboarding flow