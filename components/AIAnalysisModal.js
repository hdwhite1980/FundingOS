'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Target, AlertTriangle, Lightbulb, CheckCircle, FileText, Clock, Copy, RotateCcw } from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AIAnalysisModal({ opportunity, project, userProfile, onClose }) {
  const { user, loading: authLoading, initializing } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [projectOpportunity, setProjectOpportunity] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [applicationDraft, setApplicationDraft] = useState(null) // Fixed: Declared at the top

  useEffect(() => {
    // Add comprehensive debugging
    console.log('AIAnalysisModal useEffect - Auth State:', {
      user: user ? { id: user.id, email: user.email } : null,
      authLoading,
      initializing,
      sessionExists: !!user,
      timestamp: new Date().toISOString()
    })

    // Only perform analysis when auth is ready and user is available
    if (!authLoading && !initializing && user?.id) {
      console.log('AIAnalysisModal: Starting performAnalysis - user authenticated')
      performAnalysis()
    } else if (!authLoading && !initializing && !user) {
      // Auth is loaded but no user - show error
      console.log('AIAnalysisModal: Auth loaded but no user found')
      setLoading(false)
      toast.error('Please log in to use AI analysis')
    } else {
      console.log('AIAnalysisModal: Waiting for auth to complete', {
        authLoading,
        initializing,
        hasUser: !!user
      })
    }
  }, [authLoading, initializing, user])

  const performAnalysis = async (retryCount = 0) => {
    try {
      setLoading(true)
      
      // Validate required data
      if (!project?.id) {
        throw new Error('Project ID is required')
      }
      
      if (!opportunity?.id) {
        throw new Error('Opportunity ID is required')
      }
      
      if (!user?.id) {
        console.error('AI Analysis: No user ID available', { 
          user, 
          authLoading, 
          initializing,
          userKeys: user ? Object.keys(user) : 'no user object',
          retryCount
        })
        
        // In production, sometimes auth takes a moment longer
        if (retryCount < 2 && (authLoading || initializing)) {
          console.log('AI Analysis: Retrying authentication check...')
          setTimeout(() => performAnalysis(retryCount + 1), 1000)
          return
        }
        
        throw new Error('User authentication required - please ensure you are logged in')
      }
      
      console.log('AI Analysis: Starting analysis', {
        userId: user.id,
        projectId: project.id,
        opportunityId: opportunity.id,
        retryCount
      })
      
      // Call AI analysis API
      const response = await fetch('/api/ai/analyze-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          project,
          opportunity
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Analysis failed')
      }
      
      const analysisResult = await response.json()
      setAnalysis(analysisResult)

      // Check if this opportunity is already tracked for the project
      const existingOpportunities = await directUserServices.projectOpportunities.getProjectOpportunities(project.id, user.id)
      const existing = existingOpportunities.find(po => po.opportunity_id === opportunity.id)
      
      if (existing) {
        setProjectOpportunity(existing)
        // If there's already a draft, load it
        if (existing.application_draft) {
          setApplicationDraft(existing.application_draft)
        }
      }

    } catch (error) {
      console.error('AI Analysis error:', error)
      toast.error('Failed to analyze opportunity: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToProject = async () => {
    try {
      // Validate required data
      if (!project?.id) {
        throw new Error('Project ID is required')
      }
      
      if (!opportunity?.id) {
        throw new Error('Opportunity ID is required')
      }
      
      if (!user?.id) {
        console.error('Add to project: No user ID available', { 
          user, 
          authLoading, 
          initializing 
        })
        throw new Error('User authentication required - please ensure you are logged in')
      }
      
      console.log('Add to project: Starting', {
        userId: user.id,
        projectId: project.id,
        opportunityId: opportunity.id
      })
      
      // First, check if this combination already exists
      const existingOpportunities = await directUserServices.projectOpportunities.getProjectOpportunities(project.id, user.id)
      const existing = existingOpportunities.find(po => po.opportunity_id === opportunity.id)
      
      if (existing) {
        setProjectOpportunity(existing)
        toast.success('Opportunity is already in your project!')
        return existing
      }

      // If not existing, create new one
      const newProjectOpportunity = await directUserServices.projectOpportunities.createProjectOpportunity(user.id, {
        project_id: project.id,
        opportunity_id: opportunity.id,
        status: 'ai_analyzing',
        fit_score: analysis?.fitScore || 0,
        ai_analysis: analysis ? JSON.stringify(analysis) : null
      })
      
      setProjectOpportunity(newProjectOpportunity)
      toast.success('Opportunity added to your project!')
      return newProjectOpportunity
    } catch (error) {
      console.error('Add to project error:', error)
      
      // Handle the specific duplicate key error
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        toast.error('This opportunity is already in your project!')
      } else {
        toast.error('Failed to add opportunity: ' + error.message)
      }
      return null
    }
  }

  const handleGenerateApplication = async () => {
    setGenerating(true)
    setActiveTab('application')

    try {
      // Validate required data
      if (!project?.id) {
        throw new Error('Project ID is required')
      }
      
      if (!opportunity?.id) {
        throw new Error('Opportunity ID is required')
      }
      
      if (!user?.id) {
        console.error('Generate application: No user ID available', { 
          user, 
          authLoading, 
          initializing 
        })
        throw new Error('User authentication required - please ensure you are logged in')
      }
      
      console.log('Generate application: Starting', {
        userId: user.id,
        projectId: project.id,
        opportunityId: opportunity.id
      })
      
      // Ensure we have a project opportunity first
      let currentProjectOpportunity = projectOpportunity
      
      if (!currentProjectOpportunity) {
        console.log('Creating project opportunity first...')
        currentProjectOpportunity = await handleAddToProject()
        
        if (!currentProjectOpportunity) {
          throw new Error('Failed to create project opportunity')
        }
      }

      console.log('Generating application for project opportunity:', currentProjectOpportunity.id)

      const response = await fetch('/api/ai/generate-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          project,
          opportunity,
          analysis
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Application generation failed')
      }
      
      const applicationDraftResponse = await response.json()
      
      // Store the content locally for display
      setApplicationDraft(applicationDraftResponse.content)
      
      // Update project opportunity with draft
      await directUserServices.projectOpportunities.updateProjectOpportunity(
        user.id,
        currentProjectOpportunity.id,
        {
          status: 'draft_generated',
          application_draft: applicationDraftResponse.content
        }
      )

      toast.success('Application draft generated!')
    } catch (error) {
      console.error('Application generation error:', error)
      toast.error('Failed to generate application: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(applicationDraft)
      toast.success('Application draft copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-accent-700 bg-accent-100'
    if (score >= 60) return 'text-green-700 bg-green-100'
    if (score >= 40) return 'text-amber-700 bg-amber-100'
    return 'text-red-700 bg-red-100'
  }

  const tabs = [
    { id: 'analysis', label: 'AI Analysis', icon: Zap },
    { id: 'application', label: 'Application Draft', icon: FileText }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-green-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 flex items-center">
              <Zap className="w-6 h-6 mr-3 text-green-600" />
              AI Analysis
            </h2>
            <p className="text-neutral-600 mt-2">
              {opportunity.title} • {project.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-green-200 bg-white">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 text-sm font-semibold flex items-center justify-center transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-green-700 border-b-2 border-green-600 bg-green-50'
                    : 'text-neutral-600 hover:text-green-700 hover:bg-green-25'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
          {(loading || authLoading || initializing) ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-6"></div>
              <p className="text-neutral-700 text-lg font-medium">
                {authLoading || initializing ? 'Loading user session...' : 'AI is analyzing the opportunity fit...'}
              </p>
              {authLoading || initializing ? (
                <p className="text-neutral-500 mt-3">Please wait while we verify your authentication</p>
              ) : null}
            </div>
          ) : !user ? (
            <div className="text-center py-16">
              <div className="text-red-500 mb-6">
                <X className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-neutral-700 mb-4 text-lg font-medium">Authentication required</p>
              <p className="text-neutral-500 mb-6">Please log in to use AI analysis features</p>
              <button onClick={onClose} className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                Close
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'analysis' && analysis && (
                <div className="space-y-8">
                  {/* Fit Score */}
                  <div className="text-center">
                    <div className={`inline-flex items-center px-6 py-3 rounded-full text-3xl font-bold border-2 ${getScoreColor(analysis.fitScore)}`}>
                      {analysis.fitScore}% Match
                    </div>
                    <p className="text-neutral-600 mt-3 text-lg">Overall fit score for this opportunity</p>
                  </div>

                  {/* Strengths */}
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 flex items-center mb-6">
                      <Target className="w-6 h-6 mr-3 text-green-600" />
                      Key Strengths
                    </h3>
                    <div className="space-y-4">
                      {analysis.strengths.map((strength, index) => (
                        <div key={index} className="flex items-start p-4 bg-green-50 rounded-lg border border-green-100">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-neutral-700 leading-relaxed">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Challenges */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                      <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                      Potential Challenges
                    </h3>
                    <div className="space-y-2">
                      {analysis.challenges.map((challenge, index) => (
                        <div key={index} className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700">{challenge}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                      <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
                      Recommendations
                    </h3>
                    <div className="space-y-2">
                      {analysis.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start">
                          <Lightbulb className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                      <Clock className="w-5 h-5 mr-2 text-purple-600" />
                      Next Steps
                    </h3>
                    <div className="space-y-2">
                      {analysis.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start">
                          <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-gray-700">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'application' && (
                <div className="space-y-6">
                  {generating ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">AI is generating your application draft...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                    </div>
                  ) : applicationDraft ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Application Draft</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleCopyToClipboard}
                            className="btn-secondary btn-sm flex items-center"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to Clipboard
                          </button>
                          <button
                            onClick={() => setApplicationDraft(null)}
                            className="btn-secondary btn-sm flex items-center"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Generate New
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                            {applicationDraft}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 p-3 bg-green-50 rounded-lg">
                        <strong>Note:</strong> This is an AI-generated draft. Please review and customize it according to the specific requirements of the funding opportunity. Always verify all information and add your organization's specific details.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Application Draft</h3>
                      <p className="mt-1 text-gray-500">
                        Generate a customized application draft based on the AI analysis
                      </p>
                      <button
                        onClick={handleGenerateApplication}
                        className="btn-primary mt-4 flex items-center mx-auto"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Draft
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Analysis powered by AI • Results are recommendations only
          </div>
          
          <div className="flex space-x-3">
            {!projectOpportunity && analysis && (
              <button
                onClick={handleAddToProject}
                className="btn-success flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Add to Project
              </button>
            )}
            
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}