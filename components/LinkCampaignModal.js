'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, Info, AlertTriangle, Link, Target, DollarSign, Globe, Check, Loader2 } from 'lucide-react'

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
      instructions: 'Copy the full URL from your GoFundMe campaign page',
      icon: '🎯',
      color: 'emerald'
    },
    kickstarter: {
      name: 'Kickstarter', 
      urlExample: 'https://www.kickstarter.com/projects/username/project-name',
      instructions: 'Copy the URL from your Kickstarter project page',
      icon: '🚀',
      color: 'emerald'
    },
    indiegogo: {
      name: 'Indiegogo',
      urlExample: 'https://www.indiegogo.com/projects/your-project-name',
      instructions: 'Copy the URL from your Indiegogo campaign page',
      icon: '💡',
      color: 'emerald'
    },
    other: {
      name: 'Other Platform',
      urlExample: 'https://example.com/your-campaign',
      instructions: 'Enter the URL of your crowdfunding campaign',
      icon: '🌐',
      color: 'slate'
    }
  }

  const extractCampaignId = (url, platform) => {
    try {
      switch (platform) {
        case 'gofundme':
          const gofundmeMatch = url.match(/gofundme\.com\/f\/([^\/\?]+)/)
          return gofundmeMatch ? gofundmeMatch[1] : ''
        
        case 'kickstarter':
          const kickstarterMatch = url.match(/kickstarter\.com\/projects\/[^\/]+\/([^\/\?]+)/)
          return kickstarterMatch ? kickstarterMatch[1] : ''
        
        case 'indiegogo':
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
      
      return ''
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-4">
                <Link className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Link Crowdfunding Campaign</h3>
                <p className="text-emerald-100 mt-1">Connect your external campaign to track progress</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-8">
            {/* Project Selection */}
            <div>
              <label className="text-lg font-semibold text-slate-900 mb-3 block flex items-center">
                <Target className="w-5 h-5 mr-2 text-emerald-600" />
                Select Project
              </label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                required
              >
                <option value="">Choose a project to link this campaign to</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-lg font-semibold text-slate-900 mb-4 block flex items-center">
                <Globe className="w-5 h-5 mr-2 text-emerald-600" />
                Crowdfunding Platform
              </label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(platformInfo).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePlatformChange(key)}
                    className={`p-4 border-2 rounded-xl text-left transition-all duration-200 hover:shadow-md ${
                      formData.platform === key
                        ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100'
                        : 'border-slate-200 hover:border-emerald-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{info.icon}</span>
                      <div>
                        <div className="font-semibold text-slate-900">{info.name}</div>
                        {formData.platform === key && (
                          <div className="flex items-center text-emerald-600 text-sm mt-1">
                            <Check className="w-3 h-3 mr-1" />
                            Selected
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign URL */}
            <div>
              <label className="text-lg font-semibold text-slate-900 mb-3 block flex items-center">
                <Link className="w-5 h-5 mr-2 text-emerald-600" />
                Campaign URL
              </label>
              <input
                type="url"
                className={`w-full bg-white border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
                  urlError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-emerald-500'
                }`}
                value={formData.campaign_url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={currentPlatform.urlExample}
                required
              />
              {urlError && (
                <div className="mt-2 flex items-center text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {urlError}
                </div>
              )}
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900 mb-1">{currentPlatform.instructions}</p>
                    <p className="text-sm text-emerald-700">Example: {currentPlatform.urlExample}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Campaign Title</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter your campaign title"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Goal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    value={formData.goal_amount}
                    onChange={(e) => setFormData({...formData, goal_amount: e.target.value})}
                    placeholder="10000"
                    min="0"
                    step="1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Campaign Description</label>
              <textarea
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of your campaign and its goals..."
              />
            </div>

            {/* Auto-sync Option */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Enable Auto-sync</h4>
                  <p className="text-sm text-slate-600">Automatically update campaign progress and metrics daily</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_sync_enabled}
                    onChange={(e) => setFormData({...formData, auto_sync_enabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            {/* Preview Campaign Link */}
            {formData.campaign_url && !urlError && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900 mb-1">Campaign Preview</p>
                    <p className="text-sm text-emerald-700 truncate">{formData.campaign_url}</p>
                  </div>
                  <a
                    href={formData.campaign_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Campaign
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6">
          <div className="flex justify-end space-x-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              onClick={handleSubmit}
              className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !!urlError || !formData.project_id || !formData.campaign_url || !formData.title}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking Campaign...
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 mr-2" />
                  Link Campaign
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}