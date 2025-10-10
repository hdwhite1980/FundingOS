'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  DollarSign, 
  Building, 
  ExternalLink, 
  MapPin, 
  Award, 
  AlertTriangle, 
  Clock, 
  FileText,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  Bookmark,
  Share2
} from 'lucide-react'
import { format } from 'date-fns'
import { directUserServices } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function OpportunityDetailModal({ 
  opportunity, 
  isOpen, 
  onClose, 
  selectedProject,
  fitScore,
  userProfile
}) {
  const [isSaving, setIsSaving] = useState(false)
  
  if (!isOpen || !opportunity) return null

  const isResource = opportunity?.ai_analysis?.isNonMonetaryResource === true || opportunity?.ai_analysis?.isNonMonetaryResource === 'true'
  const resourceTypes = Array.isArray(opportunity?.ai_analysis?.resourceTypes)
    ? opportunity.ai_analysis.resourceTypes
    : Array.isArray(opportunity?.ai_categories)
      ? opportunity.ai_categories
      : []
  const normalizedTypes = Array.from(new Set((resourceTypes || []).map(t => String(t || '').toLowerCase())))
  const labelMap = {
    software_grant: 'Software Grant',
    cloud_credits: 'Cloud Credits',
    data_credits: 'Data Credits',
    ad_credits: 'Ad Credits',
    in_kind: 'In‑Kind',
    services: 'Services',
    mentorship: 'Mentorship',
    training: 'Training',
    equipment: 'Equipment',
    facility_access: 'Facility Access',
    incubator: 'Incubator',
    accelerator: 'Accelerator',
    resources: null,
    non_monetary: null
  }
  const colorMap = {
    mentorship: 'bg-indigo-100 text-indigo-800',
    training: 'bg-amber-100 text-amber-800',
    facility_access: 'bg-teal-100 text-teal-800',
    cloud_credits: 'bg-blue-100 text-blue-800',
    software_grant: 'bg-purple-100 text-purple-800',
    in_kind: 'bg-emerald-100 text-emerald-800',
    services: 'bg-slate-100 text-slate-800',
    equipment: 'bg-orange-100 text-orange-800',
    incubator: 'bg-pink-100 text-pink-800',
    accelerator: 'bg-fuchsia-100 text-fuchsia-800',
    data_credits: 'bg-cyan-100 text-cyan-800',
    ad_credits: 'bg-lime-100 text-lime-800'
  }
  const resourceBadges = normalizedTypes
    .map(t => ({ key: t, label: labelMap[t] || (t.charAt(0).toUpperCase() + t.slice(1).replace('_',' ')), color: colorMap[t] || 'bg-gray-100 text-gray-700' }))
    .filter(b => b.label)

  const handleSaveForLater = async () => {
    if (!selectedProject || !userProfile) {
      toast.error('Please select a project first')
      return
    }

    setIsSaving(true)
    try {
      const result = await directUserServices.projectOpportunities.addProjectOpportunity(
        userProfile.id,
        selectedProject.id,
        opportunity.id,
        {
          fit_score: fitScore || 0,
          status: 'saved'
        }
      )

      if (result) {
        toast.success('Opportunity saved to project!')
      } else {
        toast.error('Failed to save opportunity')
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
      toast.error('Failed to save opportunity')
    } finally {
      setIsSaving(false)
    }
  }

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount varies'
    if (!min) return `Up to $${max.toLocaleString()}`
    if (!max) return `From $${min.toLocaleString()}`
    if (min === max) return `$${min.toLocaleString()}`
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  const getDeadlineStatus = () => {
    if (!opportunity.deadline_date) return { status: 'rolling', color: 'text-blue-600 bg-blue-50' }
    
    const now = new Date()
    const deadline = new Date(opportunity.deadline_date)
    const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return { status: 'expired', color: 'text-gray-500 bg-gray-50', text: 'Expired' }
    if (daysLeft <= 7) return { status: 'urgent', color: 'text-red-600 bg-red-50', text: `${daysLeft} days left` }
    if (daysLeft <= 30) return { status: 'soon', color: 'text-yellow-600 bg-yellow-50', text: `${daysLeft} days left` }
    return { status: 'active', color: 'text-green-600 bg-green-50', text: `${daysLeft} days left` }
  }

  const deadlineStatus = getDeadlineStatus()

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-emerald-600 px-6 py-4 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2 pr-8">
                    {opportunity.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-1" />
                      <span className="text-sm">{opportunity.sponsor}</span>
                    </div>
                    {fitScore && (
                      <div className="flex items-center">
                        <Target className="w-4 h-4 mr-1" />
                        <span className="text-sm">{fitScore}% match</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Key Information Bar */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {!isResource && (
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <div className="text-sm text-gray-600">Funding Amount</div>
                        <div className="font-semibold">{formatAmount(opportunity.amount_min, opportunity.amount_max)}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <div className="text-sm text-gray-600">Deadline</div>
                      <div className={`font-semibold px-2 py-1 rounded-full text-xs ${deadlineStatus.color}`}>
                        {opportunity.deadline_date ? format(new Date(opportunity.deadline_date), 'MMM d, yyyy') : 'Rolling'}
                        {deadlineStatus.text && ` (${deadlineStatus.text})`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Award className="w-5 h-5 text-purple-600 mr-2" />
                    <div>
                      <div className="text-sm text-gray-600">Program Type</div>
                      <div className="font-semibold flex flex-wrap gap-1 items-center">
                        {isResource ? 'Resource' : (opportunity.opportunity_type || 'Grant')}
                        {isResource && resourceBadges.length > 0 && (
                          <div className="ml-2 flex flex-wrap gap-1">
                            {resourceBadges.slice(0, 4).map(b => (
                              <span key={b.key} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${b.color}`}>
                                {b.label}
                              </span>
                            ))}
                            {resourceBadges.length > 4 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                                +{resourceBadges.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Description
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed">
                      {opportunity.description || 'No description available for this opportunity.'}
                    </p>
                  </div>
                </div>

                {isResource && resourceBadges.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-purple-600" />
                      Resource Types
                    </h3>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex flex-wrap gap-2">
                        {resourceBadges.map(b => (
                          <span key={`modal-${b.key}`} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${b.color}`}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Match Analysis */}
                {selectedProject && fitScore && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-green-600" />
                      Project Match Analysis
                    </h3>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">Match Score for "{selectedProject.name}"</span>
                        <span className="text-2xl font-bold text-green-600">{fitScore}%</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${fitScore}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {fitScore >= 80 ? "Excellent match! This opportunity aligns very well with your project." :
                         fitScore >= 60 ? "Good match. Consider applying with some modifications." :
                         fitScore >= 40 ? "Moderate match. May require significant adaptation." :
                         "Lower match. Consider if this opportunity fits your project goals."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Eligibility Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Eligibility Requirements
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      // Check multiple possible eligibility fields
                      const eligibilityRequirements = opportunity.eligibility_requirements || 
                                                     opportunity.eligibility_criteria ||
                                                     opportunity.requirements ||
                                                     opportunity.eligibility?.requirements

                      // If we have eligibility analysis from the eligibility service
                      if (opportunity.eligibility?.requirements && opportunity.eligibility.requirements.length > 0) {
                        return (
                          <ul className="space-y-2">
                            {opportunity.eligibility.requirements.map((req, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{req}</span>
                              </li>
                            ))}
                            {opportunity.eligibility.warnings && opportunity.eligibility.warnings.length > 0 && (
                              <>
                                <li className="pt-2 border-t border-gray-200">
                                  <span className="text-xs font-medium text-orange-700 uppercase">Warnings:</span>
                                </li>
                                {opportunity.eligibility.warnings.map((warning, index) => (
                                  <li key={`warning-${index}`} className="flex items-start">
                                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-orange-700">{warning}</span>
                                  </li>
                                ))}
                              </>
                            )}
                          </ul>
                        )
                      }

                      // Check raw text eligibility requirements
                      if (eligibilityRequirements && typeof eligibilityRequirements === 'string') {
                        return (
                          <ul className="space-y-2">
                            {eligibilityRequirements.split('\n').filter(req => req.trim()).map((req, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{req.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }

                      // Check if eligibility requirements are an array
                      if (Array.isArray(eligibilityRequirements)) {
                        return (
                          <ul className="space-y-2">
                            {eligibilityRequirements.map((req, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{typeof req === 'string' ? req : JSON.stringify(req)}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }

                      // Fallback based on organization types and other opportunity data
                      const inferredRequirements = []
                      if (opportunity.organization_types) {
                        inferredRequirements.push(`Must be one of: ${opportunity.organization_types.join(', ')}`)
                      }
                      if (opportunity.small_business_only) {
                        inferredRequirements.push('Must be a small business')
                      }
                      if (opportunity.minority_business) {
                        inferredRequirements.push('Minority-owned businesses eligible')
                      }
                      if (opportunity.woman_owned_business) {
                        inferredRequirements.push('Women-owned businesses eligible')
                      }
                      if (opportunity.veteran_owned_business) {
                        inferredRequirements.push('Veteran-owned businesses eligible')
                      }
                      if (opportunity.geography && opportunity.geography.length > 0) {
                        inferredRequirements.push(`Geographic eligibility: ${opportunity.geography.join(', ')}`)
                      }
                      if (opportunity.source === 'grants_gov' || opportunity.cfda_number) {
                        inferredRequirements.push('SAM.gov registration required')
                        inferredRequirements.push('DUNS/UEI number required')
                      }

                      if (inferredRequirements.length > 0) {
                        return (
                          <ul className="space-y-2">
                            {inferredRequirements.map((req, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{req}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }

                      return (
                        <div className="text-gray-500 text-sm">
                          <p>No specific eligibility requirements found in the opportunity data.</p>
                          <p className="mt-2 text-xs">Run AI Analysis to get detailed eligibility requirements based on opportunity type and source.</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Location & Focus Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {opportunity.geographic_focus && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-red-600" />
                        Geographic Focus
                      </h3>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <p className="text-gray-700">{opportunity.geographic_focus}</p>
                      </div>
                    </div>
                  )}

                  {opportunity.focus_areas && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-purple-600" />
                        Focus Areas
                      </h3>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-gray-700">{opportunity.focus_areas}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Application Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-blue-600" />
                    Application Information
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Application Process:</label>
                        <p className="text-sm text-gray-700 mt-1">
                          {opportunity.application_process || 'Standard application process applies'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contact Information:</label>
                        <p className="text-sm text-gray-700 mt-1">
                          {opportunity.contact_info || 'See opportunity website for contact details'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-50 px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Last updated: {opportunity.last_updated ? format(new Date(opportunity.last_updated), 'MMM d, yyyy') : 'Unknown'}
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={handleSaveForLater}
                      disabled={isSaving}
                      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Bookmark className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save for Later'}
                    </button>
                    {opportunity.source_url && (
                      <a
                        href={opportunity.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Full Details
                      </a>
                    )}
                    <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                      Start Application
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}