'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Building, MapPin, DollarSign, Calendar, FileText, Users, Leaf } from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'

const PROJECT_TYPES = [
  { value: 'commercial_development', label: 'Commercial Development' },
  { value: 'residential_development', label: 'Residential Development' },
  { value: 'community_development', label: 'Community Development' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'nonprofit_program', label: 'Nonprofit Program' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'research', label: 'Research & Development' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'technology', label: 'Technology' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'environmental', label: 'Environmental' }
]

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 
  'Construction', 'Agriculture', 'Energy', 'Transportation', 'Finance',
  'Tourism', 'Arts & Culture', 'Environmental', 'Social Services', 'Other'
]

export default function CreateProjectModal({ 
  user,
  userProfile, 
  onClose, 
  onProjectCreated, 
  onProjectUpdated,
  editProject = null // Pass project data when editing
}) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditMode] = useState(!!editProject)
  
  const [formData, setFormData] = useState({
    name: editProject?.name || '',
    description: editProject?.description || '',
    location: editProject?.location || (userProfile?.city && userProfile?.state ? `${userProfile.city}, ${userProfile.state}` : ''),
    project_type: editProject?.project_type || '',
    funding_needed: editProject?.funding_needed?.toString() || '',
    timeline: editProject?.timeline || '',
    industry: editProject?.industry || '',
    target_population: editProject?.target_population || '',
    expected_jobs_created: editProject?.expected_jobs_created?.toString() || '',
    environmental_impact: editProject?.environmental_impact || '',
    community_benefit: editProject?.community_benefit || '',
    matching_funds_available: editProject?.matching_funds_available?.toString() || '',
    matching_funds_source: editProject?.matching_funds_source || '',
    previous_funding: editProject?.previous_funding || ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if user is properly authenticated
      if (!user?.id) {
        toast.error('Please log in to create projects')
        setLoading(false)
        return
      }

      const projectData = {
        ...formData,
        user_id: user.id,
        funding_needed: parseFloat(formData.funding_needed),
        expected_jobs_created: formData.expected_jobs_created ? parseInt(formData.expected_jobs_created) : null,
        matching_funds_available: formData.matching_funds_available ? parseFloat(formData.matching_funds_available) : 0
      }

      if (isEditMode) {
        // Update existing project
        const updatedProject = await directUserServices.projects.updateProject(user.id, editProject.id, projectData)
        onProjectUpdated(updatedProject)
        toast.success('Project updated successfully!')
      } else {
        // Create new project
        const newProject = await directUserServices.projects.createProject(user.id, projectData)
        onProjectCreated(newProject)
        toast.success('Project created successfully!')
      }
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} project: ` + error.message)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.name && formData.location && formData.project_type && formData.funding_needed
    }
    return true
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isEditMode ? 'Edit Project Details' : 'Project Basics'}
        </h3>
        <p className="text-gray-600">
          {isEditMode 
            ? 'Update your project information to help us find better funding opportunities.'
            : 'Tell us about your project to help us find the best funding opportunities.'
          }
        </p>
      </div>

      <div>
        <label className="form-label flex items-center">
          <Building className="w-4 h-4 mr-2" />
          Project Name *
        </label>
        <input
          type="text"
          name="name"
          className="form-input"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter your project name"
          required
        />
      </div>

      <div>
        <label className="form-label flex items-center">
          <MapPin className="w-4 h-4 mr-2" />
          Location *
        </label>
        <input
          type="text"
          name="location"
          className="form-input"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="City, State"
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Project Type *</label>
          <select
            name="project_type"
            className="form-input"
            value={formData.project_type}
            onChange={handleInputChange}
            required
          >
            <option value="">Select project type</option>
            {PROJECT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Industry</label>
          <select
            name="industry"
            className="form-input"
            value={formData.industry}
            onChange={handleInputChange}
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map(industry => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Funding Needed *
          </label>
          <input
            type="number"
            name="funding_needed"
            className="form-input"
            value={formData.funding_needed}
            onChange={handleInputChange}
            placeholder="500000"
            min="0"
            required
          />
        </div>

        <div>
          <label className="form-label flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Timeline
          </label>
          <input
            type="text"
            name="timeline"
            className="form-input"
            value={formData.timeline}
            onChange={handleInputChange}
            placeholder="12-18 months"
          />
        </div>
      </div>

      <div>
        <label className="form-label flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Project Description
        </label>
        <textarea
          name="description"
          className="form-input"
          rows="4"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Provide a detailed description of your project, its goals, and expected outcomes..."
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Impact</h3>
        <p className="text-gray-600">Help us understand the broader impact of your project.</p>
      </div>
      
      <div>
        <label className="form-label flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Target Population
        </label>
        <input
          type="text"
          name="target_population"
          className="form-input"
          value={formData.target_population}
          onChange={handleInputChange}
          placeholder="Who will benefit from this project?"
        />
      </div>

      <div>
        <label className="form-label flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Expected Jobs Created
        </label>
        <input
          type="number"
          name="expected_jobs_created"
          className="form-input"
          value={formData.expected_jobs_created}
          onChange={handleInputChange}
          placeholder="10"
          min="0"
        />
      </div>

      <div>
        <label className="form-label flex items-center">
          <Leaf className="w-4 h-4 mr-2" />
          Environmental Impact
        </label>
        <textarea
          name="environmental_impact"
          className="form-input"
          rows="3"
          value={formData.environmental_impact}
          onChange={handleInputChange}
          placeholder="Describe any environmental benefits or considerations..."
        />
      </div>

      <div>
        <label className="form-label">Community Benefit</label>
        <textarea
          name="community_benefit"
          className="form-input"
          rows="3"
          value={formData.community_benefit}
          onChange={handleInputChange}
          placeholder="How will this project benefit the community?"
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Funding Details</h3>
        <p className="text-gray-600">Information about existing or available matching funds.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Matching Funds Available</label>
          <input
            type="number"
            name="matching_funds_available"
            className="form-input"
            value={formData.matching_funds_available}
            onChange={handleInputChange}
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="form-label">Matching Funds Source</label>
          <input
            type="text"
            name="matching_funds_source"
            className="form-input"
            value={formData.matching_funds_source}
            onChange={handleInputChange}
            placeholder="e.g., organizational reserves, private donations"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Previous Funding History</label>
        <textarea
          name="previous_funding"
          className="form-input"
          rows="3"
          value={formData.previous_funding}
          onChange={handleInputChange}
          placeholder="List any previous grants or funding received for similar projects..."
        />
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="font-medium text-emerald-800 mb-2">
          {isEditMode ? 'Update complete!' : 'Ready to find opportunities!'}
        </h4>
        <p className="text-sm text-emerald-700">
          {isEditMode 
            ? 'Your project updates will help our AI find even better funding opportunities that match your specific needs.'
            : 'Once created, our AI will analyze your project and match it with the most relevant funding opportunities. You\'ll get personalized recommendations with fit scores and application assistance.'
          }
        </p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? 'Edit Project' : 'Create New Project'}
            </h2>
            <p className="text-slate-600 mt-1">Step {currentStep} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 sm:px-8 py-4 bg-white">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className={`font-semibold ${currentStep >= 1 ? 'text-emerald-700' : 'text-slate-500'}`}>
              Basics
            </span>
            <span className={`font-semibold ${currentStep >= 2 ? 'text-emerald-700' : 'text-slate-500'}`}>
              Impact
            </span>
            <span className={`font-semibold ${currentStep >= 3 ? 'text-emerald-700' : 'text-slate-500'}`}>
              Funding
            </span>
          </div>
          <div className="bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 sm:p-8 border-t border-neutral-100 bg-neutral-25">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-2.5 bg-white text-neutral-700 font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    isEditMode ? 'Update Project' : 'Create Project'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}