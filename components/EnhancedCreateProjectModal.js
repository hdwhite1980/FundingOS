// Enhanced CreateProjectModal with comprehensive project setup questions
'use client'
import { useState, useEffect, useRef } from 'react'
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
  Lightbulb,
  Upload
} from 'lucide-react'
import { directUserServices, projectService } from '../lib/supabase'
import toast from 'react-hot-toast'
import EnhancedDocumentUploadModal from './EnhancedDocumentUploadModal'
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
  { id: 7, title: 'Innovation & Review', icon: Lightbulb, description: 'Uniqueness and final review' },
  { id: 8, title: 'Application Forms', icon: Upload, description: 'Upload form templates (optional)' }
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
  const contentRef = useRef(null)
  
  const [formData, setFormData] = useState({
    // Project Basics
    name: editProject?.name || '',
    description: editProject?.description || '',
    project_categories: editProject?.project_categories || (editProject?.project_category ? [editProject.project_category] : []),
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
    strategic_fit: editProject?.strategic_fit || '',
    
    // Document Upload
    uploaded_documents: editProject?.uploaded_documents || [],
    dynamic_form_structure: editProject?.dynamic_form_structure || null
  })

  // Document upload state
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState(editProject?.uploaded_documents || [])
  const [extractedFormStructure, setExtractedFormStructure] = useState(editProject?.dynamic_form_structure || null)

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

  const handleDocumentUpload = async (submissionId, uploadData) => {
    try {
      console.log('📁 Processing uploaded documents:', uploadData.files?.length || 0, 'files')
      
      // Store uploaded documents
      setUploadedDocuments(uploadData.files || [])
      
      // Check if any documents have dynamic form structures extracted
      const dynamicFormStructures = uploadData.dynamicFormStructures || []
      
      if (dynamicFormStructures.length > 0) {
        // Use the first document with a form structure
        const formStructure = dynamicFormStructures[0].formStructure
        setExtractedFormStructure(formStructure)
        
        // Update form data to include the extracted structure
        setFormData(prev => ({
          ...prev,
          uploaded_documents: uploadData.files || [],
          dynamic_form_structure: formStructure
        }))
        
        toast.success(`🎯 Form structure extracted from ${dynamicFormStructures[0].fileName}! This will be used for future applications.`)
        console.log('📝 Extracted form structure with', Object.keys(formStructure.formFields || {}).length, 'fields')
      } else {
        // Still store the documents even if no form structure extracted
        setFormData(prev => ({
          ...prev,
          uploaded_documents: uploadData.files || []
        }))
        
        toast.success(`📁 ${uploadData.files?.length || 0} document(s) uploaded successfully!`)
      }
      
      setShowDocumentUpload(false)
    } catch (error) {
      console.error('Document upload error:', error)
      toast.error('Failed to process uploaded documents: ' + error.message)
    }
  }

  const handleNext = () => {
    console.log('handleNext called, currentStep:', currentStep)
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1
      console.log('Setting currentStep to:', nextStep)
      setCurrentStep(nextStep)
    }
  }

  const handlePrevious = () => {
    console.log('handlePrevious called, currentStep:', currentStep)
    if (currentStep > 1) {
      const prevStep = currentStep - 1
      console.log('Setting currentStep to:', prevStep)
      setCurrentStep(prevStep)
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
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const projectData = {
        ...formData,
        // Map form fields to database fields
        location: formData.project_location || 'Unspecified',
        // Handle both old and new project category fields for backward compatibility
        project_category: formData.project_categories?.length > 0 ? formData.project_categories[0] : null,
        project_categories: formData.project_categories || [],
        // Ensure project_type is set from project_categories for database compatibility
        project_type: formData.project_categories?.length > 0 ? formData.project_categories[0] : 'other',
        total_project_budget: formData.total_project_budget ? parseFloat(formData.total_project_budget.toString().replace(/[^\d.]/g, '')) : null,
        funding_request_amount: formData.funding_request_amount ? parseFloat(formData.funding_request_amount.toString().replace(/[^\d.]/g, '')) : null,
        cash_match_available: formData.cash_match_available ? parseFloat(formData.cash_match_available.toString().replace(/[^\d.]/g, '')) : null,
        in_kind_match_available: formData.in_kind_match_available ? parseFloat(formData.in_kind_match_available.toString().replace(/[^\d.]/g, '')) : null,
        estimated_people_served: formData.estimated_people_served ? parseInt(formData.estimated_people_served.toString().replace(/[^\d]/g, '')) : null,
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
        console.log('Creating project with processed data:', projectData)
        // Use session-based service for proper RLS authentication
        result = await projectService.createProject(projectData)
        
        if (!result) {
          throw new Error('Project creation failed - no data returned from server')
        }
        
        console.log('Project creation successful:', result)
        toast.success('Project created successfully!')
        onProjectCreated?.(result)
      }

      onClose()
    } catch (error) {
      console.error('Error saving project:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save project'
      if (error.message) {
        errorMessage = error.message
      } else if (error.details) {
        errorMessage = error.details
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    console.log('Rendering step content for currentStep:', currentStep)
    
    switch (currentStep) {
      case 1:
        return <ProjectBasics key="step-1" formData={formData} onChange={handleInputChange} />
      case 2:
        return <ScopeImpact key="step-2" formData={formData} onChange={handleInputChange} />
      case 3:
        return <FundingRequirements key="step-3" formData={formData} onChange={handleInputChange} />
      case 4:
        return <ProjectReadiness key="step-4" formData={formData} onChange={handleInputChange} />
      case 5:
        return <OutcomesEvaluation key="step-5" formData={formData} onChange={handleInputChange} onArrayChange={handleArrayChange} onGoalsChange={handleGoalsChange} />
      case 6:
        return <FundingStrategy key="step-6" formData={formData} onChange={handleInputChange} onFundingTypesChange={handleFundingTypesChange} />
      case 7:
        return <InnovationReview key="step-7" formData={formData} onChange={handleInputChange} />
      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Application Forms</h3>
              <p className="text-gray-600 mb-6">
                Upload grant application forms or templates to enable dynamic form generation. 
                This step is optional but will help create more accurate applications.
              </p>
            </div>
            
            {uploadedDocuments.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Uploaded Documents:</h4>
                <ul className="text-sm text-green-700">
                  {uploadedDocuments.map((doc, index) => (
                    <li key={index} className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {doc.name || `Document ${index + 1}`}
                    </li>
                  ))}
                </ul>
                {extractedFormStructure && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ Form structure extracted with {Object.keys(extractedFormStructure.formFields || {}).length} fields
                  </p>
                )}
              </div>
            )}
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowDocumentUpload(true)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Upload className="w-5 h-5 mr-2" />
                {uploadedDocuments.length > 0 ? 'Upload More Documents' : 'Upload Application Forms'}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 text-center">
              Supported formats: PDF, Word, Excel, Text. Max file size: 10MB each.
            </p>
          </div>
        )
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
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${currentStep}`}
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
              {isEditMode ? 'Update Project' : 'Create Project'}
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
      </motion.div>
      
      {/* Document Upload Modal */}
      {showDocumentUpload && (
        <EnhancedDocumentUploadModal
          submission={{ id: 'temp-project-creation' }}
          onClose={() => setShowDocumentUpload(false)}
          onUpload={handleDocumentUpload}
          userProfile={userProfile}
          projectData={formData}
          enableAIAnalysis={true}
        />
      )}
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