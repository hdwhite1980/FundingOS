'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Target, AlertTriangle, Lightbulb, CheckCircle, Clock, Sparkles, TrendingUp } from 'lucide-react'
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

export default function AIAnalysisModal({ opportunity, project, userProfile, quickMatchScore, onClose }) {
  const { user, loading: authLoading, initializing } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState(null)
  const [projectOpportunity, setProjectOpportunity] = useState(null)

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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-800 bg-emerald-100 border-emerald-200'
    if (score >= 60) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Opportunity Analysis</h2>
                <p className="text-emerald-100 mt-1">
                  Strategic fit analysis for {opportunity.title}
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

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
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
          ) : analysis ? (
            <AnalysisContent analysis={analysis} quickMatchScore={quickMatchScore} />
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Strategic analysis powered by AI • Results are recommendations only
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