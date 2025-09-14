'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Target, AlertTriangle, Lightbulb, CheckCircle, FileText, Clock, Copy, RotateCcw, Sparkles, TrendingUp } from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resolveApiUrl } from '../lib/apiUrlUtils'
import toast from 'react-hot-toast'

// Helper function to normalize analysis results and handle different data structures
function normalizeAnalysisResult(result) {
  console.log('Normalizing analysis result:', result)
  
  // If the result has a 'data' property, use that (from enhanced-scoring API)
  const analysis = result.data || result
  
  // Ensure all required properties exist with safe defaults
  const normalized = {
    fitScore: typeof analysis.fitScore === 'number' ? analysis.fitScore : 
              typeof analysis.overallScore === 'number' ? analysis.overallScore : 
              typeof analysis.score === 'number' ? analysis.score : 0,
    
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : 
               Array.isArray(analysis.keyStrengths) ? analysis.keyStrengths : 
               ['Analysis completed'],
    
    challenges: Array.isArray(analysis.challenges) ? analysis.challenges : 
                Array.isArray(analysis.weaknesses) ? analysis.weaknesses : 
                Array.isArray(analysis.concerns) ? analysis.concerns : 
                ['No specific challenges identified'],
    
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : 
                     Array.isArray(analysis.actionItems) ? analysis.actionItems : 
                     ['Continue with application process'],
    
    nextSteps: Array.isArray(analysis.nextSteps) ? analysis.nextSteps : 
               Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : 
               ['Review opportunity details', 'Prepare application materials', 'Submit application'],
    
    confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.7,
    reasoning: typeof analysis.reasoning === 'string' ? analysis.reasoning : 'Analysis completed'
  }
  
  console.log('Normalized analysis:', normalized)
  return normalized
}

// Analysis Content Component
function AnalysisContent({ analysis, quickMatchScore }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-800 bg-emerald-100 border-emerald-200'
    if (score >= 60) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  try {
    return (
      <div className="space-y-8">
        {/* Fit Score */}
        <div className="text-center">
          <div className={`inline-flex items-center px-8 py-4 rounded-xl text-4xl font-bold border-2 ${getScoreColor(analysis.fitScore || 0)}`}>
            <TrendingUp className="w-8 h-8 mr-3" />
            {analysis.fitScore || 0}% Strategic Match
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
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              Key Strengths
            </h3>
            <div className="space-y-4">
              {analysis.strengths.map((strength, index) => (
                <div key={index} className="flex items-start p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700 leading-relaxed">{typeof strength === 'string' ? strength : JSON.stringify(strength)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Challenges */}
        {analysis.challenges && analysis.challenges.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
              <div className="p-2 bg-amber-50 rounded-lg mr-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              Potential Challenges
            </h3>
            <div className="space-y-4">
              {analysis.challenges.map((challenge, index) => (
                <div key={index} className="flex items-start p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700 leading-relaxed">{typeof challenge === 'string' ? challenge : JSON.stringify(challenge)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
              <div className="p-2 bg-slate-50 rounded-lg mr-3">
                <Lightbulb className="w-6 h-6 text-slate-600" />
              </div>
              AI Recommendations
            </h3>
            <div className="space-y-4">
              {analysis.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <Lightbulb className="w-5 h-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700 leading-relaxed">{typeof recommendation === 'string' ? recommendation : JSON.stringify(recommendation)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {analysis.nextSteps && analysis.nextSteps.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                <Clock className="w-6 h-6 text-emerald-600" />
              </div>
              Recommended Next Steps
            </h3>
            <div className="space-y-4">
              {analysis.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-slate-700 leading-relaxed pt-1">{typeof step === 'string' ? step : JSON.stringify(step)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error rendering analysis content:', error)
    return (
      <div className="text-center py-16">
        <div className="p-4 bg-red-50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Analysis Display Error</h3>
        <p className="text-slate-600 mb-6">There was an error displaying the analysis results.</p>
        <div className="text-left text-sm text-slate-500 bg-slate-50 p-4 rounded-lg">
          <pre>{JSON.stringify(analysis, null, 2)}</pre>
        </div>
      </div>
    )
  }
}

// Application Content Component
function ApplicationContent({ 
  generating, 
  applicationDraft, 
  handleCopyToClipboard, 
  setApplicationDraft, 
  handleGenerateApplication 
}) {
  return (
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
  )
}

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
      const response = await fetch(resolveApiUrl('/api/ai/analyze-opportunity'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          project,
          opportunity
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI Analysis API error:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: errorText }
        }
        throw new Error(errorData.message || errorData.error || 'Analysis failed')
      }
      
      const analysisResult = await response.json()
      console.log('Raw analysis result:', analysisResult)
      
      // Validate and normalize the analysis result
      const normalizedAnalysis = normalizeAnalysisResult(analysisResult)
      console.log('Setting normalized analysis:', normalizedAnalysis)
      setAnalysis(normalizedAnalysis)

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

      const response = await fetch(resolveApiUrl('/api/ai/generate-application'), {
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

  const handleGenerateDocument = async () => {
    try {
      setGenerating(true)
      
      // Create application data combining analysis with project/opportunity info
      const applicationData = {
        opportunity,
        project,
        userProfile,
        analysis,
        applicationDraft,
        createdAt: new Date().toISOString()
      }

      // Generate filled document using AI
      const response = await fetch(resolveApiUrl('/api/ai/generate-document'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationData,
          documentType: 'grant-application'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate document')
      }

      const result = await response.json()
      
      // Save to applications
      const submittedAmount = opportunity.amount_max || opportunity.amount_min || project.budget || 25000
      
      await directUserServices.applications.createApplication(user.id, {
        project_id: project.id,
        opportunity_id: opportunity.id,
        status: 'draft',
        submitted_amount: submittedAmount,
        application_data: applicationData,
        generated_document: result.document,
        ai_analysis: analysis
      })

      // Create and download the document
      const blob = new Blob([result.document], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${project.name}_${opportunity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_application.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('Application document generated and saved!')
      
    } catch (error) {
      console.error('Document generation error:', error)
      toast.error('Failed to generate document: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGrantWriterReview = async () => {
    try {
      // Save current state to database for grant writer review
      const reviewData = {
        project_id: project.id,
        opportunity_id: opportunity.id,
        ai_analysis: analysis,
        application_draft: applicationDraft,
        status: 'pending_review',
        requested_at: new Date().toISOString()
      }

      await directUserServices.createGrantWriterReview(user.id, reviewData)
      
      toast.success('Review request submitted! A grant writer will contact you within 24 hours.')
      
      // Navigate to grant writer review page (placeholder for now)
      // window.location.href = '/grant-writer-review'
      
    } catch (error) {
      console.error('Grant writer review error:', error)
      toast.error('Failed to request review: ' + error.message)
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
        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-6 text-white">
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
                <AnalysisContent analysis={analysis} quickMatchScore={quickMatchScore} />
              )}

              {activeTab === 'application' && (
                <ApplicationContent 
                  generating={generating}
                  applicationDraft={applicationDraft}
                  handleCopyToClipboard={handleCopyToClipboard}
                  setApplicationDraft={setApplicationDraft}
                  handleGenerateApplication={handleGenerateApplication}
                />
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
              {analysis && (
                <>
                  <button
                    onClick={handleGenerateDocument}
                    disabled={generating}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {generating ? 'Generating...' : 'Generate Application'}
                  </button>
                  
                  <button
                    onClick={handleGrantWriterReview}
                    className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Review with Grant Writer
                  </button>
                </>
              )}
              
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