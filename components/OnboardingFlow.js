'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, MapPin, DollarSign, Users, FileText, CheckCircle } from 'lucide-react'
import { userProfileService } from '../lib/supabase'
import toast from 'react-hot-toast'

const steps = [
  { id: 1, title: 'Organization Details', icon: Building2 },
  { id: 2, title: 'Location & Contact', icon: MapPin },
  { id: 3, title: 'Business Information', icon: DollarSign },
  { id: 4, title: 'Certifications', icon: FileText },
  { id: 5, title: 'Complete Setup', icon: CheckCircle }
]

export default function OnboardingFlow({ user, existingProfile, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: existingProfile?.full_name || user.user_metadata?.full_name || '',
    organization_name: existingProfile?.organization_name || user.user_metadata?.organization_name || '',
    organization_type: existingProfile?.organization_type || '',
    tax_id: existingProfile?.tax_id || '',
    address_line1: existingProfile?.address_line1 || '',
    address_line2: existingProfile?.address_line2 || '',
    city: existingProfile?.city || '',
    state: existingProfile?.state || '',
    zip_code: existingProfile?.zip_code || '',
    phone: existingProfile?.phone || '',
    website: existingProfile?.website || '',
    years_in_operation: existingProfile?.years_in_operation || '',
    annual_revenue: existingProfile?.annual_revenue || '',
    employee_count: existingProfile?.employee_count || '',
    duns_number: existingProfile?.duns_number || '',
    cage_code: existingProfile?.cage_code || '',
    minority_owned: existingProfile?.minority_owned || false,
    woman_owned: existingProfile?.woman_owned || false,
    veteran_owned: existingProfile?.veteran_owned || false,
    small_business: existingProfile?.small_business || false
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const profileData = {
        ...formData,
        id: user.id,
        email: user.email,
        setup_completed: true,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
        years_in_operation: formData.years_in_operation ? parseInt(formData.years_in_operation) : null,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null
      }

      let profile
      if (existingProfile) {
        profile = await userProfileService.updateProfile(user.id, profileData)
      } else {
        profile = await userProfileService.createProfile(profileData)
      }

      toast.success('Profile setup completed!')
      onComplete(profile)
    } catch (error) {
      toast.error('Failed to save profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <OrganizationDetails formData={formData} onChange={handleInputChange} />
      case 2:
        return <LocationContact formData={formData} onChange={handleInputChange} />
      case 3:
        return <BusinessInfo formData={formData} onChange={handleInputChange} />
      case 4:
        return <Certifications formData={formData} onChange={handleInputChange} />
      case 5:
        return <CompleteSetup formData={formData} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isCompleted 
                      ? 'bg-accent-600 border-accent-600 text-white' 
                      : isActive 
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="relative mt-4">
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-full"></div>
            <div 
              className="absolute top-0 left-0 h-2 bg-blue-600 rounded-full transition-all duration-300"
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
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>
            
            {currentStep === steps.length ? (
              <button
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

function OrganizationDetails({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Organization Details</h3>
        <p className="text-gray-600">Tell us about your organization to help us find the best funding opportunities.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Full Name *</label>
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
            placeholder="Your organization's name"
            required
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Organization Type *</label>
          <select
            name="organization_type"
            className="form-input"
            value={formData.organization_type}
            onChange={onChange}
            required
          >
            <option value="">Select type</option>
            <option value="nonprofit">Nonprofit</option>
            <option value="for_profit">For-Profit Business</option>
            <option value="government">Government Entity</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        
        <div>
          <label className="form-label">Tax ID (EIN/SSN)</label>
          <input
            type="text"
            name="tax_id"
            className="form-input"
            value={formData.tax_id}
            onChange={onChange}
            placeholder="XX-XXXXXXX"
          />
        </div>
      </div>
    </div>
  )
}

function LocationContact({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Location & Contact</h3>
        <p className="text-gray-600">Your location helps us find geographically relevant funding opportunities.</p>
      </div>
      
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

      <div className="grid md:grid-cols-3 gap-6">
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

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Phone Number</label>
          <input
            type="tel"
            name="phone"
            className="form-input"
            value={formData.phone}
            onChange={onChange}
            placeholder="(555) 123-4567"
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
    </div>
  )
}

function BusinessInfo({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h3>
        <p className="text-gray-600">This information helps us match you with size-appropriate funding opportunities.</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <label className="form-label">Years in Operation</label>
          <input
            type="number"
            name="years_in_operation"
            className="form-input"
            value={formData.years_in_operation}
            onChange={onChange}
            placeholder="5"
            min="0"
          />
        </div>
        
        <div>
          <label className="form-label">Annual Revenue</label>
          <input
            type="number"
            name="annual_revenue"
            className="form-input"
            value={formData.annual_revenue}
            onChange={onChange}
            placeholder="500000"
            min="0"
          />
        </div>
        
        <div>
          <label className="form-label">Employee Count</label>
          <input
            type="number"
            name="employee_count"
            className="form-input"
            value={formData.employee_count}
            onChange={onChange}
            placeholder="10"
            min="0"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">DUNS Number</label>
          <input
            type="text"
            name="duns_number"
            className="form-input"
            value={formData.duns_number}
            onChange={onChange}
            placeholder="123456789"
          />
          <p className="text-sm text-gray-500 mt-1">Required for many federal grants</p>
        </div>
        
        <div>
          <label className="form-label">CAGE Code</label>
          <input
            type="text"
            name="cage_code"
            className="form-input"
            value={formData.cage_code}
            onChange={onChange}
            placeholder="12345"
          />
          <p className="text-sm text-gray-500 mt-1">Required for government contracting</p>
        </div>
      </div>
    </div>
  )
}

function Certifications({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Certifications</h3>
        <p className="text-gray-600">These certifications can unlock additional funding opportunities with set-asides.</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="minority_owned"
            name="minority_owned"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.minority_owned}
            onChange={onChange}
          />
          <label htmlFor="minority_owned" className="ml-3 text-sm font-medium text-gray-700">
            Minority-Owned Business Enterprise (MBE)
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="woman_owned"
            name="woman_owned"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.woman_owned}
            onChange={onChange}
          />
          <label htmlFor="woman_owned" className="ml-3 text-sm font-medium text-gray-700">
            Woman-Owned Business Enterprise (WBE)
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="veteran_owned"
            name="veteran_owned"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.veteran_owned}
            onChange={onChange}
          />
          <label htmlFor="veteran_owned" className="ml-3 text-sm font-medium text-gray-700">
            Veteran-Owned Small Business (VOSB)
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="small_business"
            name="small_business"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.small_business}
            onChange={onChange}
          />
          <label htmlFor="small_business" className="ml-3 text-sm font-medium text-gray-700">
            Small Business Administration (SBA) Certified
          </label>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Why certifications matter</h4>
            <p className="text-sm text-blue-700 mt-1">
              Many funding programs reserve a percentage of funds specifically for certified businesses. Having these certifications can significantly increase your chances of securing funding.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompleteSetup({ formData }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <CheckCircle className="h-16 w-16 text-accent-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Launch!</h3>
        <p className="text-gray-600">Your profile is complete. Let's find you some funding opportunities.</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Profile Summary</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Organization:</span>
            <span className="font-medium">{formData.organization_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-medium capitalize">{formData.organization_type?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span>Location:</span>
            <span className="font-medium">{formData.city}, {formData.state}</span>
          </div>
          {formData.annual_revenue && (
            <div className="flex justify-between">
              <span>Annual Revenue:</span>
              <span className="font-medium">${parseFloat(formData.annual_revenue).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
        <h4 className="font-medium text-accent-800 mb-2">What happens next?</h4>
        <ul className="text-sm text-accent-700 space-y-1 text-left">
          <li>• AI will analyze your profile for funding opportunities</li>
          <li>• You'll see personalized matches with fit scores</li>
          <li>• Get AI-powered application assistance</li>
          <li>• Track your progress and deadlines</li>
        </ul>
      </div>
    </div>
  )
}