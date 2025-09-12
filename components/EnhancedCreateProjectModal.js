// Enhanced CreateProjectModal with comprehensive project setup questions
'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar, 
  FileText, 
  Users, 
  Target,
  TrendingUp,
  Award,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Lightbulb
} from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  ProjectBasics,
  ScopeImpact,
  FundingRequirements,
  ProjectReadiness,
  OutcomesEvaluation,
  FundingStrategy,
  InnovationReview
} from './ProjectSteps'

const PROJECT_CATEGORIES = [
  { value: 'program_expansion', label: 'Program Expansion/Enhancement' },
  { value: 'new_program', label: 'New Program Development' },
  { value: 'capacity_building', label: 'Capacity Building/Organizational Development' },
  { value: 'capital_projects', label: 'Capital Projects (Building, Equipment)' },
  { value: 'research_evaluation', label: 'Research & Evaluation' },
  { value: 'technology_implementation', label: 'Technology Implementation' },
  { value: 'staff_development', label: 'Staff Development/Training' },
  { value: 'community_engagement', label: 'Community Engagement/Outreach' },
  { value: 'partnership_development', label: 'Partnership/Collaboration Development' },
  { value: 'other', label: 'Other' }
]

const PROJECT_DURATIONS = [
  { value: '3_6_months', label: '3-6 months' },
  { value: '6_12_months', label: '6-12 months' },
  { value: '1_2_years', label: '1-2 years' },
  { value: '2_3_years', label: '2-3 years' },
  { value: '3_plus_years', label: '3+ years' }
]

const PROJECT_STATUS = [
  { value: 'conceptual', label: 'Conceptual stage - needs development' },
  { value: 'planning_complete', label: 'Planning complete - ready to implement' },
  { value: 'pilot_phase', label: 'Pilot phase - seeking expansion funding' },
  { value: 'ongoing_sustainability', label: 'Ongoing program - seeking sustainability funding' }
]

const FUNDING_TYPES = [
  'Federal Grants',
  'State Grants',
  'Foundation Grants (Private)',
  'Corporate Grants/Sponsorships',
  'Community Foundation Grants',
  'Emergency/Disaster Relief Grants',
  'Research Grants',
  'Low-Interest Loans',
  'Crowdfunding',
  'Corporate Partnerships'
]

const URGENCY_LEVELS = [
  { value: 'critical', label: 'Critical - Need funding ASAP' },
  { value: 'moderate', label: 'Moderate - Within 6 months' },
  { value: 'flexible', label: 'Flexible - No rush' }
]

const EVALUATION_PLANS = [
  { value: 'formal_external', label: 'Formal external evaluation' },
  { value: 'internal_data', label: 'Internal evaluation with data collection' },
  { value: 'basic_tracking', label: 'Basic progress tracking' },
  { value: 'need_support', label: 'Need evaluation design support' }
]

const PROJECT_ROLES = [
  { value: 'lead', label: 'Lead organization' },
  { value: 'equal_partner', label: 'Equal partner' },
  { value: 'subcontractor', label: 'Subcontractor' }
]

const steps = [
  { id: 1, title: 'Project Basics', icon: Building, description: 'Title, description, and category' },
  { id: 2, title: 'Scope & Impact', icon: Target, description: 'Population served and timeline' },
  { id: 3, title: 'Funding Requirements', icon: DollarSign, description: 'Budget and funding needs' },
  { id: 4, title: 'Project Readiness', icon: CheckCircle, description: 'Status and personnel' },
  { id: 5, title: 'Outcomes & Evaluation', icon: TrendingUp, description: 'Goals and measurement' },
  { id: 6, title: 'Funding Strategy', icon: Award, description: 'Preferences and timeline' },
  { id: 7, title: 'Innovation & Review', icon: Lightbulb, description: 'Uniqueness and final review' }
]

export default function CreateProjectModal({ 
  user,
  userProfile, 
  onClose, 
  onProjectCreated, 
  onProjectUpdated,
  editProject = null
}) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode] = useState(!!editProject)
  
  const [formData, setFormData] = useState({
    // Project Basics
    name: editProject?.name || '',
    description: editProject?.description || '',
    project_category: editProject?.project_category || '',
    project_category_other: editProject?.project_category_other || '',
    
    // Scope & Impact
    target_population_description: editProject?.target_population_description || '',
    estimated_people_served: editProject?.estimated_people_served || '',
    project_location: editProject?.project_location || (userProfile?.city && userProfile?.state ? `${userProfile.city}, ${userProfile.state}` : ''),
    project_duration: editProject?.project_duration || '',
    proposed_start_date: editProject?.proposed_start_date || '',
    key_milestones: editProject?.key_milestones || '',
    
    // Funding Requirements
    total_project_budget: editProject?.total_project_budget?.toString() || '',
    personnel_percentage: editProject?.personnel_percentage || '',
    equipment_percentage: editProject?.equipment_percentage || '',
    travel_percentage: editProject?.travel_percentage || '',
    indirect_percentage: editProject?.indirect_percentage || '',
    other_percentage: editProject?.other_percentage || '',
    funding_request_amount: editProject?.funding_request_amount?.toString() || '',
    cash_match_available: editProject?.cash_match_available?.toString() || '',
    in_kind_match_available: editProject?.in_kind_match_available?.toString() || '',
    
    // Project Readiness
    current_status: editProject?.current_status || '',
    project_director_status: editProject?.project_director_status || '',
    key_staff_status: editProject?.key_staff_status || '',
    collaborating_organizations: editProject?.collaborating_organizations || '',
    partnership_mous: editProject?.partnership_mous || '',
    partnership_role: editProject?.partnership_role || '',
    
    // Outcomes & Evaluation
    primary_goals: editProject?.primary_goals || ['', '', '', '', ''],
    output_measures: editProject?.output_measures || '',
    outcome_measures: editProject?.outcome_measures || '',
    impact_measures: editProject?.impact_measures || '',
    evaluation_plan: editProject?.evaluation_plan || '',
    
    // Funding Strategy
    preferred_funding_types: editProject?.preferred_funding_types || [],
    funding_decision_needed: editProject?.funding_decision_needed || '',
    latest_useful_start: editProject?.latest_useful_start || '',
    urgency_level: editProject?.urgency_level || '',
    sustainability_plan: editProject?.sustainability_plan || '',
    other_funding_sources: editProject?.other_funding_sources || '',
    
    // Innovation & Differentiation
    unique_innovation: editProject?.unique_innovation || '',
    evidence_base: editProject?.evidence_base || '',
    strategic_fit: editProject?.strategic_fit || ''
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

  const handleFundingTypesChange = (type) => {
    const current = formData.preferred_funding_types || []
    if (current.includes(type)) {
      handleArrayChange('preferred_funding_types', current.filter(t => t !== type))
    } else {
      handleArrayChange('preferred_funding_types', [...current, type])
    }
  }

  const handleGoalsChange = (index, value) => {
    const current = [...formData.primary_goals]
    current[index] = value
    handleArrayChange('primary_goals', current)
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
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const projectData = {
        ...formData,
        total_project_budget: formData.total_project_budget ? parseFloat(formData.total_project_budget) : null,
        funding_request_amount: formData.funding_request_amount ? parseFloat(formData.funding_request_amount) : null,
        cash_match_available: formData.cash_match_available ? parseFloat(formData.cash_match_available) : null,
        in_kind_match_available: formData.in_kind_match_available ? parseFloat(formData.in_kind_match_available) : null,
        estimated_people_served: formData.estimated_people_served ? parseInt(formData.estimated_people_served) : null,
        personnel_percentage: formData.personnel_percentage ? parseFloat(formData.personnel_percentage) : null,
        equipment_percentage: formData.equipment_percentage ? parseFloat(formData.equipment_percentage) : null,
        travel_percentage: formData.travel_percentage ? parseFloat(formData.travel_percentage) : null,
        indirect_percentage: formData.indirect_percentage ? parseFloat(formData.indirect_percentage) : null,
        other_percentage: formData.other_percentage ? parseFloat(formData.other_percentage) : null
      }

      let result
      if (isEditMode && editProject) {
        result = await directUserServices.projects.updateProject(user.id, editProject.id, projectData)
        toast.success('Project updated successfully!')
        onProjectUpdated?.(result)
      } else {
        result = await directUserServices.projects.createProject(user.id, projectData)
        toast.success('Project created successfully!')
        onProjectCreated?.(result)
      }

      onClose()
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(error.message || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ProjectBasics formData={formData} onChange={handleInputChange} />
      case 2:
        return <ScopeImpact formData={formData} onChange={handleInputChange} />
      case 3:
        return <FundingRequirements formData={formData} onChange={handleInputChange} />
      case 4:
        return <ProjectReadiness formData={formData} onChange={handleInputChange} />
      case 5:
        return <OutcomesEvaluation formData={formData} onChange={handleInputChange} onArrayChange={handleArrayChange} onGoalsChange={handleGoalsChange} />
      case 6:
        return <FundingStrategy formData={formData} onChange={handleInputChange} onFundingTypesChange={handleFundingTypesChange} />
      case 7:
        return <InnovationReview formData={formData} onChange={handleInputChange} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Project' : 'Create New Project'}
              </h2>
              <p className="text-gray-600 mt-1">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep === step.id
                const isCompleted = currentStep > step.id
                const isNext = currentStep + 1 === step.id
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative
                      ${isCompleted 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' 
                        : isActive 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg ring-4 ring-emerald-200'
                          : isNext
                            ? 'bg-white border-emerald-300 text-emerald-600 shadow-md'
                            : 'bg-white border-slate-300 text-slate-400'
                      }
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs mt-1 font-medium hidden sm:block ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {step.title}
                    </span>
                  </div>
                )
              })}
            </div>
            
            {/* Mobile Progress Bar */}
            <div className="relative mt-4 sm:hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-200 rounded-full"></div>
              <div 
                className="absolute top-0 left-0 h-2 bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
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
              {isEditMode ? 'Update Project' : 'Create Project'}
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
      </motion.div>
    </div>
  )
}

// Step Components will be in a separate file for better organization
export { 
  PROJECT_CATEGORIES, 
  PROJECT_DURATIONS, 
  PROJECT_STATUS, 
  FUNDING_TYPES, 
  URGENCY_LEVELS, 
  EVALUATION_PLANS, 
  PROJECT_ROLES 
}