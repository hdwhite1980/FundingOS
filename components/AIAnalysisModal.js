'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Target, AlertTriangle, Lightbulb, CheckCircle, FileText, Clock, Copy, RotateCcw, Sparkles, TrendingUp } from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AIAnalysisModal({ opportunity, project, userProfile, quickMatchScore, onClose }) {
  const { user, loading: authLoading, initializing } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [projectOpportunity, setProjectOpportunity] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [applicationDraft, setApplicationDraft] = useState(null)

  useEffect(() => {
    console.log('AIAnalysisModal useEffect - Auth State:', {
      user: user ? { id: user.id, email: user.email } : null,
      authLoading,
      initializing,
      sessionExists: !!user,
      timestamp: new Date().toISOString()
    })

    if (!authLoading && !initializing && user?.id) {
      console.log('AIAnalysisModal: Starting performAnalysis - user authenticated')
      performAnalysis()
    } else if (!authLoading && !initializing && !user) {
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
    if (score >= 80) return 'text-emerald-800 bg-emerald-100 border-emerald-200'
    if (score >= 60) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  const tabs = [
    { id: 'analysis', label: 'AI Analysis', icon: Zap },
    { id: 'application', label: 'Application Draft', icon: FileText }
  ]

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Opportunity Analysis</h2>
                <p className="text-emerald-100 mt-1">
                  {opportunity.title} • {project.name}
                </p>
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

        {/* Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 p-1 m-6 rounded-lg">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center rounded-md transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {(loading || authLoading || initializing) ? (
            <div className="text-center py-16">
              <div className="p-4 bg-emerald-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-emerald-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {authLoading || initializing ? 'Verifying Authentication' : 'AI Analysis in Progress'}
              </h3>
              <p className="text-slate-600">
                {authLoading || initializing 
                  ? 'Please wait while we verify your session...' 
                  : 'Our AI is analyzing the opportunity fit for your project...'}
              </p>
              <div className="mt-4 w-48 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          ) : !user ? (
            <div className="text-center py-16">
              <div className="p-4 bg-red-50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h3>
              <p className="text-slate-600 mb-6">Please log in to access AI analysis features</p>
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'analysis' && analysis && (
                <div className="space-y-8">
                  {/* Fit Score */}
                  <div className="text-center">
                    <div className={`inline-flex items-center px-8 py-4 rounded-xl text-4xl font-bold border-2 ${getScoreColor(analysis.fitScore)}`}>
                      <TrendingUp className="w-8 h-8 mr-3" />
                      {analysis.fitScore}% Strategic Match
                    </div>
                    <p className="text-slate-600 mt-4 text-lg">
                      Comprehensive AI strategic assessment including competition analysis, resource requirements, success probability, and market timing
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Strategic vs Quick Match:</strong> This detailed analysis considers factors like competition level, organizational readiness, and success probability that the Quick Match score ({quickMatchScore || 'N/A'}%) doesn't evaluate.
                      </p>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
                      <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                        <Target className="w-6 h-6 text-emerald-600" />
                      </div>
                      Key Strengths
                    </h3>
                    <div className="space-y-4">
                      {analysis.strengths?.map((strength, index) => (
                        <div key={index} className="flex items-start p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-slate-700 leading-relaxed">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Challenges */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
                      <div className="p-2 bg-amber-50 rounded-lg mr-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                      Potential Challenges
                    </h3>
                    <div className="space-y-4">
                      {analysis.challenges?.map((challenge, index) => (
                        <div key={index} className="flex items-start p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-slate-700 leading-relaxed">{challenge}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
                      <div className="p-2 bg-slate-50 rounded-lg mr-3">
                        <Lightbulb className="w-6 h-6 text-slate-600" />
                      </div>
                      AI Recommendations
                    </h3>
                    <div className="space-y-4">
                      {analysis.recommendations?.map((recommendation, index) => (
                        <div key={index} className="flex items-start p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <Lightbulb className="w-5 h-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" />
                          <p className="text-slate-700 leading-relaxed">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
                      <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                        <Clock className="w-6 h-6 text-emerald-600" />
                      </div>
                      Recommended Next Steps
                    </h3>
                    <div className="space-y-4">
                      {analysis.nextSteps?.map((step, index) => (
                        <div key={index} className="flex items-start">
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-slate-700 leading-relaxed pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'application' && (
                <div className="space-y-6">
                  {generating ? (
                    <div className="text-center py-16">
                      <div className="p-4 bg-emerald-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-emerald-600 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Generating Application Draft</h3>
                      <p className="text-slate-600">AI is creating a customized application based on the analysis...</p>
                      <div className="mt-4 w-48 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  ) : applicationDraft ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Application Draft</h3>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleCopyToClipboard}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors duration-200 flex items-center"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to Clipboard
                          </button>
                          <button
                            onClick={() => setApplicationDraft(null)}
                            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors duration-200 flex items-center"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Generate New
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-xl p-6 max-h-96 overflow-y-auto border border-slate-200">
                        <div className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed">
                          {applicationDraft}
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-amber-900 mb-1">Important Notice</h4>
                            <p className="text-sm text-amber-800">
                              This is an AI-generated draft. Please review and customize it according to the specific requirements 
                              of the funding opportunity. Always verify all information and add your organization's specific details.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="p-4 bg-slate-50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Application Draft Generator</h3>
                      <p className="text-slate-600 mb-6">
                        Generate a customized application draft based on the AI analysis and opportunity requirements
                      </p>
                      <button
                        onClick={handleGenerateApplication}
                        className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center mx-auto"
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        Generate Application Draft
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Analysis powered by AI • Results are recommendations only
            </div>
            
            <div className="flex space-x-3">
              {!projectOpportunity && analysis && (
                <button
                  onClick={handleAddToProject}
                  className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add to Project
                </button>
              )}
              
              <button 
                onClick={onClose} 
                className="px-6 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}