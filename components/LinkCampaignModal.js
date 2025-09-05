// components/modals/LinkCampaignModal.js
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, Info, AlertCircle } from 'lucide-react'

export default function LinkCampaignModal({ projects, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    project_id: '',
    platform: 'gofundme',
    campaign_url: '',
    campaign_id: '',
    title: '',
    description: '',
    goal_amount: '',
    auto_sync_enabled: true
  })
  
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState('')

  const platformInfo = {
    gofundme: {
      name: 'GoFundMe',
      urlExample: 'https://www.gofundme.com/f/your-campaign-name',
      instructions: 'Copy the full URL from your GoFundMe campaign page'
    },
    kickstarter: {
      name: 'Kickstarter', 
      urlExample: 'https://www.kickstarter.com/projects/username/project-name',
      instructions: 'Copy the URL from your Kickstarter project page'
    },
    indiegogo: {
      name: 'Indiegogo',
      urlExample: 'https://www.indiegogo.com/projects/your-project-name',
      instructions: 'Copy the URL from your Indiegogo campaign page'
    },
    other: {
      name: 'Other Platform',
      urlExample: 'https://example.com/your-campaign',
      instructions: 'Enter the URL of your crowdfunding campaign'
    }
  }

  const extractCampaignId = (url, platform) => {
    try {
      switch (platform) {
        case 'gofundme':
          // Extract from URLs like: https://www.gofundme.com/f/campaign-name
          const gofundmeMatch = url.match(/gofundme\.com\/f\/([^\/\?]+)/)
          return gofundmeMatch ? gofundmeMatch[1] : ''
        
        case 'kickstarter':
          // Extract from URLs like: https://www.kickstarter.com/projects/username/project-name
          const kickstarterMatch = url.match(/kickstarter\.com\/projects\/[^\/]+\/([^\/\?]+)/)
          return kickstarterMatch ? kickstarterMatch[1] : ''
        
        case 'indiegogo':
          // Extract from URLs like: https://www.indiegogo.com/projects/project-name
          const indiegogoMatch = url.match(/indiegogo\.com\/projects\/([^\/\?]+)/)
          return indiegogoMatch ? indiegogoMatch[1] : ''
        
        default:
          return ''
      }
    } catch (error) {
      return ''
    }
  }

  const validateUrl = (url, platform) => {
    if (!url) return ''
    
    try {
      const urlObj = new URL(url)
      
      switch (platform) {
        case 'gofundme':
          if (!urlObj.hostname.includes('gofundme.com')) {
            return 'Please enter a valid GoFundMe URL'
          }
          if (!url.includes('/f/')) {
            return 'GoFundMe URL should include "/f/" in the path'
          }
          break
        
        case 'kickstarter':
          if (!urlObj.hostname.includes('kickstarter.com')) {
            return 'Please enter a valid Kickstarter URL'
          }
          if (!url.includes('/projects/')) {
            return 'Kickstarter URL should include "/projects/" in the path'
          }
          break
        
        case 'indiegogo':
          if (!urlObj.hostname.includes('indiegogo.com')) {
            return 'Please enter a valid Indiegogo URL'
          }
          if (!url.includes('/projects/')) {
            return 'Indiegogo URL should include "/projects/" in the path'
          }
          break
      }
      
      return '' // No error
    } catch (error) {
      return 'Please enter a valid URL'
    }
  }

  const handleUrlChange = (url) => {
    setFormData(prev => ({
      ...prev,
      campaign_url: url,
      campaign_id: extractCampaignId(url, prev.platform)
    }))
    
    setUrlError(validateUrl(url, formData.platform))
  }

  const handlePlatformChange = (platform) => {
    setFormData(prev => ({
      ...prev,
      platform,
      campaign_url: '',
      campaign_id: ''
    }))
    setUrlError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const urlValidationError = validateUrl(formData.campaign_url, formData.platform)
    if (urlValidationError) {
      setUrlError(urlValidationError)
      return
    }

    setLoading(true)
    
    try {
      const campaignData = {
        ...formData,
        goal_amount: formData.goal_amount ? parseFloat(formData.goal_amount) : null,
        campaign_id: extractCampaignId(formData.campaign_url, formData.platform)
      }
      
      await onSubmit(campaignData)
    } catch (error) {
      console.error('Campaign submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentPlatform = platformInfo[formData.platform]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Link Crowdfunding Campaign</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            <div>
              <label className="form-label">Project *</label>
              <select 
                className="form-input"
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                required
              >
                <option value="">Select project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="form-label">Crowdfunding Platform *</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(platformInfo).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePlatformChange(key)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      formData.platform === key
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{info.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign URL */}
            <div>
              <label className="form-label">Campaign URL *</label>
              <input
                type="url"
                className={`form-input ${urlError ? 'border-red-300' : ''}`}
                value={formData.campaign_url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={currentPlatform.urlExample}
                required
              />
              {urlError && (
                <div className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {urlError}
                </div>
              )}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">{currentPlatform.instructions}</p>
                    <p className="mt-1 text-blue-600">Example: {currentPlatform.urlExample}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div>
              <label className="form-label">Campaign Title *</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter your campaign title"
                required
              />
            </div>

            <div>
              <label className="form-label">Campaign Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of your campaign..."
              />
            </div>

            <div>
              <label className="form-label">Goal Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  className="form-input pl-8"
                  value={formData.goal_amount}
                  onChange={(e) => setFormData({...formData, goal_amount: e.target.value})}
                  placeholder="10000"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            {/* Auto-sync Option */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Enable Auto-sync</h4>
                <p className="text-sm text-gray-600">Automatically update campaign progress daily</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_sync_enabled}
                  onChange={(e) => setFormData({...formData, auto_sync_enabled: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Preview Campaign Link */}
            {formData.campaign_url && !urlError && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Campaign Preview</p>
                    <p className="text-sm text-gray-600 truncate">{formData.campaign_url}</p>
                  </div>
                  <a
                    href={formData.campaign_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </a>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary flex items-center"
                disabled={loading || !!urlError}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Linking...
                  </>
                ) : (
                  'Link Campaign'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}