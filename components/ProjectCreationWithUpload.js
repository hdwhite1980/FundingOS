// Integrated Project Creation with Dynamic Form Upload
// This component combines project creation with document upload and form analysis

import { useState, useEffect } from 'react'
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import EnhancedDocumentUploadModal from './EnhancedDocumentUploadModal'
import { useAuth } from '../contexts/AuthContext'
import { directUserServices, projectService } from '../lib/supabase'

export default function ProjectCreationWithUpload({ 
  isOpen, 
  onClose, 
  onSuccess,
  editProject = null,
  userProfile 
}) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [extractedFormStructure, setExtractedFormStructure] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: editProject?.name || '',
    description: editProject?.description || '',
    project_type: editProject?.project_type || 'community_development',
    funding_goal: editProject?.funding_goal || '',
    project_location: editProject?.project_location || (userProfile?.city && userProfile?.state ? `${userProfile.city}, ${userProfile.state}` : ''),
    target_beneficiaries: editProject?.target_beneficiaries || '',
    project_timeline: editProject?.project_timeline || 12,
    organization_type: editProject?.organization_type || userProfile?.organization_type || 'nonprofit',
    // Dynamic form data will be stored here
    uploaded_documents: editProject?.uploaded_documents || [],
    dynamic_form_structure: editProject?.dynamic_form_structure || null
  })

  const handleDocumentUpload = async (uploadData) => {
    try {
      setIsLoading(true)
      console.log('📁 Processing uploaded documents:', uploadData.length, 'files')
      
      // Store uploaded documents
      setUploadedDocuments(uploadData)
      
      // Check if any documents have dynamic form structures extracted
      const documentsWithForms = uploadData.filter(doc => doc.dynamicFormStructure)
      
      if (documentsWithForms.length > 0) {
        // Use the first document with a form structure
        const formDoc = documentsWithForms[0]
        setExtractedFormStructure(formDoc.dynamicFormStructure)
        
        // Update form data to include the extracted structure
        setFormData(prev => ({
          ...prev,
          uploaded_documents: uploadData,
          dynamic_form_structure: formDoc.dynamicFormStructure
        }))
        
        toast.success(`🎯 Form structure extracted from ${formDoc.fileName}! This will be used for future applications.`)
        console.log('📝 Extracted form structure with', Object.keys(formDoc.dynamicFormStructure.formFields || {}).length, 'fields')
      } else {
        // Still store the documents even if no form structure extracted
        setFormData(prev => ({
          ...prev,
          uploaded_documents: uploadData
        }))
        
        toast.success(`📁 ${uploadData.length} document(s) uploaded successfully!`)
      }
      
      setShowDocumentUpload(false)
    } catch (error) {
      console.error('Document upload error:', error)
      toast.error('Failed to process uploaded documents: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Project description is required')
      return
    }

    try {
      setIsLoading(true)

      const projectData = {
        ...formData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('💾 Saving project with data:', projectData)

      let result
      if (editProject) {
        result = await directUserServices.projects.updateProject(user.id, editProject.id, projectData)
      } else {
        // Use session-based service for proper RLS authentication
        result = await projectService.createProject(projectData)
      }

      if (result) {
        toast.success(editProject ? '✅ Project updated successfully!' : '🎉 Project created successfully!')
        
        if (extractedFormStructure) {
          console.log('📋 Project saved with dynamic form structure containing', Object.keys(extractedFormStructure.formFields || {}).length, 'fields')
        }
        
        onSuccess(result)
        onClose()
      } else {
        throw new Error('Failed to save project')
      }
    } catch (error) {
      console.error('Project save error:', error)
      toast.error('Failed to save project: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {editProject ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type
                </label>
                <select
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="community_development">Community Development</option>
                  <option value="education">Education</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="environment">Environment</option>
                  <option value="arts_culture">Arts & Culture</option>
                  <option value="technology">Technology</option>
                  <option value="social_services">Social Services</option>
                  <option value="housing">Housing</option>
                  <option value="economic_development">Economic Development</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your project, its goals, and expected impact..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Goal ($)
                </label>
                <input
                  type="number"
                  name="funding_goal"
                  value={formData.funding_goal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Location
                </label>
                <input
                  type="text"
                  name="project_location"
                  value={formData.project_location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State"
                />
              </div>
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Application Forms & Documents</h3>
            <p className="text-sm text-gray-600">
              Upload application forms to automatically extract field structures for future applications.
            </p>
            
            {/* Upload Status */}
            {uploadedDocuments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span className="text-blue-700 font-medium">
                    {uploadedDocuments.length} document(s) uploaded
                  </span>
                </div>
                
                {extractedFormStructure && (
                  <div className="mt-2 text-sm text-blue-600">
                    ✨ Form structure extracted with {Object.keys(extractedFormStructure.formFields || {}).length} fields - 
                    ready for automatic application generation!
                  </div>
                )}
                
                <div className="mt-2 space-y-1">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="text-sm text-blue-600 flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>{doc.fileName}</span>
                      {doc.dynamicFormStructure && (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                          Form Structure Extracted
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDocumentUpload(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Application Forms</span>
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editProject ? 'Update Project' : 'Create Project'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Document Upload Modal */}
        {showDocumentUpload && (
          <EnhancedDocumentUploadModal
            isOpen={showDocumentUpload}
            onClose={() => setShowDocumentUpload(false)}
            onUpload={handleDocumentUpload}
            submission={{
              id: 'project-creation',
              project_name: formData.name || 'New Project'
            }}
            allowedTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']}
            maxFileSize={10 * 1024 * 1024} // 10MB
            title="Upload Application Forms"
            description="Upload application forms or templates that you want to use for this project. We'll analyze them to extract field structures automatically."
          />
        )}
      </div>
    </div>
  )
}