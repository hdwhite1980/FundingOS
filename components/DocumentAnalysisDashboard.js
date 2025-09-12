/**
 * Document Analysis Dashboard
 * 
 * A comprehensive dashboard that displays AI analysis results, extracted requirements,
 * completion recommendations, and provides intelligent insights for grant applications.
 */

'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Target,
  Lightbulb,
  Calendar,
  DollarSign,
  Users,
  Building,
  Zap,
  Eye,
  Download,
  Share2,
  Filter,
  Search,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Info,
  Star,
  Award,
  BookOpen
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import documentAnalysisService from '../lib/documentAnalysisService'
import smartFormCompletionService from '../lib/smartFormCompletionService'

export default function DocumentAnalysissDashboard({ 
  documentAnalyses = [],
  userProfile,
  projectData,
  onStartApplication,
  onViewDetails,
  onExportAnalysis
}) {
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [consolidatedInsights, setConsolidatedInsights] = useState(null)
  const [completionPlan, setCompletionPlan] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid', 'list', 'timeline'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (documentAnalyses.length > 0) {
      generateConsolidatedInsights()
    }
  }, [documentAnalyses])

  const generateConsolidatedInsights = async () => {
    setLoading(true)
    try {
      const insights = await documentAnalysisService.generateBatchSummary(documentAnalyses)
      setConsolidatedInsights(insights)
      
      // Generate completion plan if we have form data
      if (insights.formRequirements) {
        const plan = await smartFormCompletionService.createCompletionPlan(
          insights,
          { userProfile, projectData }
        )
        setCompletionPlan(plan)
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDocumentTypeIcon = (type) => {
    const icons = {
      'application': FileText,
      'rfp': Award,
      'guidelines': BookOpen,
      'proposal': Target,
      'budget': DollarSign,
      'narrative': BookOpen,
      'correspondence': Users,
      'award_letter': Award,
      'report': TrendingUp,
      'other': FileText
    }
    return icons[type] || FileText
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  const getUrgencyLevel = (deadline) => {
    if (!deadline) return { level: 'none', color: 'gray', text: 'No deadline' }
    
    const days = differenceInDays(new Date(deadline), new Date())
    if (days < 7) return { level: 'urgent', color: 'red', text: `${days} days left` }
    if (days < 30) return { level: 'soon', color: 'amber', text: `${days} days left` }
    return { level: 'ok', color: 'green', text: format(new Date(deadline), 'MMM d, yyyy') }
  }

  const filteredAnalyses = documentAnalyses.filter(analysis => {
    const matchesType = filterType === 'all' || analysis.metadata?.documentType === filterType
    const matchesSearch = searchTerm === '' || 
      analysis.keyInformation?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.keyInformation?.sponsor?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesType && matchesSearch
  })

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 bg-${color}-50 rounded-lg`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  )

  const AnalysisCard = ({ analysis }) => {
    const Icon = getDocumentTypeIcon(analysis.metadata?.documentType)
    const confidence = analysis.metadata?.confidence || 0
    const urgency = getUrgencyLevel(analysis.keyInformation?.deadline)

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => setSelectedAnalysis(analysis)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 line-clamp-2">
                {analysis.keyInformation?.title || analysis.documentName || 'Untitled Document'}
              </h3>
              <p className="text-sm text-slate-600">
                {analysis.keyInformation?.sponsor || 'Unknown Sponsor'}
              </p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs ${getConfidenceColor(confidence)}`}>
            {Math.round(confidence * 100)}% confidence
          </div>
        </div>

        <div className="space-y-3">
          {analysis.keyInformation?.fundingAmount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Funding Amount</span>
              <span className="font-medium text-slate-900">
                {analysis.keyInformation.fundingAmount}
              </span>
            </div>
          )}

          {analysis.keyInformation?.deadline && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Deadline</span>
              <span className={`font-medium text-${urgency.color}-600`}>
                {urgency.text}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="text-center">
              <p className="font-medium text-slate-900">
                {analysis.requirements?.eligibility?.length || 0}
              </p>
              <p>Requirements</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-900">
                {analysis.requirements?.documents?.length || 0}
              </p>
              <p>Documents</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-900">
                {analysis.strategicInsights?.recommendations?.length || 0}
              </p>
              <p>Insights</p>
            </div>
          </div>
        </div>

        {analysis.strategicInsights?.keyStrengths && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-xs text-green-700">
              <Star className="w-3 h-3" />
              <span>Match: {analysis.strategicInsights.keyStrengths[0]}</span>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const InsightsPanel = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
      <div className="flex items-center space-x-3 mb-4">
        <Sparkles className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">AI Insights Summary</h3>
      </div>

      {loading ? (
        <div className="flex items-center space-x-2 text-blue-600">
          <Brain className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Generating insights...</span>
        </div>
      ) : consolidatedInsights ? (
        <div className="space-y-4">
          {consolidatedInsights.overview && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Overview</h4>
              <p className="text-sm text-blue-800">{consolidatedInsights.overview}</p>
            </div>
          )}

          {consolidatedInsights.keyInsights && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
              <ul className="space-y-1">
                {consolidatedInsights.keyInsights.slice(0, 4).map((insight, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm text-blue-800">
                    <Lightbulb className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {consolidatedInsights.recommendations && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {consolidatedInsights.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="flex items-start space-x-2 text-sm text-blue-800">
                    <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <button 
              onClick={() => onStartApplication && onStartApplication(consolidatedInsights)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Start Application</span>
            </button>
            <button 
              onClick={() => onExportAnalysis && onExportAnalysis(consolidatedInsights)}
              className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-blue-600">Upload documents to see AI insights</p>
      )}
    </div>
  )

  const CompletionPlanPanel = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Target className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-slate-900">Completion Plan</h3>
      </div>

      {completionPlan ? (
        <div className="space-y-4">
          {completionPlan.phases && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Application Phases</h4>
              <div className="space-y-2">
                {completionPlan.phases.slice(0, 4).map((phase, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{phase.title}</p>
                      <p className="text-sm text-slate-600">{phase.description}</p>
                      {phase.estimatedTime && (
                        <p className="text-xs text-slate-500 mt-1">
                          Est. {phase.estimatedTime}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
            <ArrowRight className="w-4 h-4" />
            <span>Start Completion Plan</span>
          </button>
        </div>
      ) : (
        <p className="text-slate-600">Complete document analysis to see completion plan</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Document Analysis</h2>
          <p className="text-slate-600">AI-powered insights from your funding documents</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={FileText}
          title="Documents Analyzed"
          value={documentAnalyses.length}
          subtitle="Total documents processed"
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          title="Requirements Found"
          value={documentAnalyses.reduce((acc, doc) => 
            acc + (doc.requirements?.eligibility?.length || 0), 0
          )}
          subtitle="Eligibility criteria identified"
          color="green"
        />
        <StatCard
          icon={DollarSign}
          title="Funding Opportunities"
          value={documentAnalyses.filter(doc => doc.keyInformation?.fundingAmount).length}
          subtitle="With funding amounts"
          color="amber"
        />
        <StatCard
          icon={Brain}
          title="AI Insights"
          value={documentAnalyses.reduce((acc, doc) => 
            acc + (doc.strategicInsights?.recommendations?.length || 0), 0
          )}
          subtitle="Strategic recommendations"
          color="purple"
        />
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="application">Application Forms</option>
          <option value="rfp">RFPs & Announcements</option>
          <option value="guidelines">Guidelines</option>
          <option value="proposal">Proposals</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Documents Grid */}
          {filteredAnalyses.length > 0 ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 gap-6' : 'grid-cols-1 gap-4'}`}>
              {filteredAnalyses.map((analysis, index) => (
                <AnalysisCard key={index} analysis={analysis} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No documents found
              </h3>
              <p className="text-slate-600">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Upload documents to see AI-powered analysis'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <InsightsPanel />
          <CompletionPlanPanel />
        </div>
      </div>

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <AnalysisDetailModal
          analysis={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
          onStartApplication={() => {
            onStartApplication && onStartApplication(selectedAnalysis)
            setSelectedAnalysis(null)
          }}
        />
      )}
    </div>
  )
}

// Analysis Detail Modal Component
function AnalysisDetailModal({ analysis, onClose, onStartApplication }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">
              {analysis.keyInformation?.title || 'Document Analysis'}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Information */}
            <div>
              <h4 className="font-medium text-slate-900 mb-4">Key Information</h4>
              <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                {analysis.keyInformation && Object.entries(analysis.keyInformation).map(([key, value]) => (
                  value && (
                    <div key={key}>
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-slate-900">{value}</p>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="font-medium text-slate-900 mb-4">Requirements</h4>
              <div className="space-y-3">
                {analysis.requirements?.eligibility && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-2">Eligibility</p>
                    <ul className="text-sm text-green-800 space-y-1">
                      {analysis.requirements.eligibility.map((req, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.requirements?.documents && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Required Documents</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {analysis.requirements.documents.map((doc, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <FileText className="w-3 h-3 mt-1 flex-shrink-0" />
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Strategic Insights */}
          {analysis.strategicInsights && (
            <div className="mt-6">
              <h4 className="font-medium text-slate-900 mb-4">Strategic Insights</h4>
              <div className="bg-amber-50 p-4 rounded-lg">
                {analysis.strategicInsights.recommendations && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-amber-900 mb-2">Recommendations</p>
                    <ul className="text-sm text-amber-800 space-y-2">
                      {analysis.strategicInsights.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              onClick={onStartApplication}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Start Application</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}