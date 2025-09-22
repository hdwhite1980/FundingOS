'use client'

/**
 * Enhanced Application Tracker - Updated for improved PDF analysis API
 * Integrates with enhanced document analysis for better form field extraction
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  Zap, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  X,
  Plus,
  Sparkles,
  Scan,
  Edit,
  Save,
  ArrowRight,
  ArrowDown,
  Clock,
  HelpCircle,
  Lightbulb,
  Download,
  BookOpen,
  Target,
  Users,
  ChevronDown,
  Check,
  Loader,
  AlertTriangle,
  Star,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import smartFormCompletionService from '../lib/smartFormCompletionService'
import documentAnalysisService from '../lib/documentAnalysisService'
import documentGenerationService from '../lib/documentGenerationService'
import { useAIAssistant } from '../hooks/useAIAssistant'
import WaliOSAssistant from './WaliOSAssistant'
import MissingInfoCollector from './MissingInfoCollector'
import AIAnalysisModal from './AIAnalysisModal'
import AIDocumentAnalysisModal from './AIDocumentAnalysisModal'
import assistantManager from '../utils/assistantManager'

// Enhanced Field Context Helper Functions
// Helper function to create field-specific context
const createFieldSpecificContext = (fieldName, fieldType, project) => {
  const fieldLower = fieldName.toLowerCase()
  
  if (fieldLower.includes('ein') || fieldLower.includes('tax_id')) {
    return {
      purpose: "Your organization's Employer Identification Number (EIN) is required for tax purposes and grant eligibility verification",
      requirements: "Must be 9 digits in format XX-XXXXXXX",
      tips: "This should match your IRS documentation exactly",
      example: "12-3456789"
    }
  }
  
  if (fieldLower.includes('organization_name') || fieldLower.includes('legal_name')) {
    return {
      purpose: "The exact legal name of your organization as registered with state/federal agencies",
      requirements: "Must match incorporation documents and IRS records",
      tips: "Use the full legal name, including LLC, Inc, etc. if applicable",
      example: project?.organization_name || "Community Health Solutions, Inc."
    }
  }
  
  if (fieldLower.includes('project_description') || fieldLower.includes('narrative')) {
    return {
      purpose: "Detailed explanation of your project's goals, methodology, and expected outcomes",
      requirements: "Should clearly articulate the problem, solution, and impact",
      tips: "Include specific numbers, timelines, and measurable outcomes when possible",
      structure: ["Problem statement", "Proposed solution", "Implementation plan", "Expected outcomes"]
    }
  }
  
  if (fieldLower.includes('budget') || fieldLower.includes('funding')) {
    return {
      purpose: "Total amount of funding requested for this project",
      requirements: "Should align with project scope and be well-justified",
      tips: "Include breakdown of major expense categories if space allows",
      example: project?.funding_needed ? `$${Number(project.funding_needed).toLocaleString()}` : "$50,000"
    }
  }
  
  if (fieldLower.includes('timeline') || fieldLower.includes('duration')) {
    return {
      purpose: "Project timeline showing key milestones and completion dates",
      requirements: "Should be realistic and align with funding period",
      tips: "Break down into phases with specific deliverables",
      example: "Phase 1 (Months 1-3): Planning and setup, Phase 2 (Months 4-8): Implementation"
    }
  }

  // Default context for unknown fields
  return {
    purpose: `Information required for the ${fieldName.replace(/_/g, ' ')} field`,
    requirements: "Please provide accurate and complete information",
    tips: "Ensure this information aligns with your project goals and organization details"
  }
}

// Helper to find related fields that might inform this one
const findRelatedFields = (fieldName, formData) => {
  const related = []
  const fieldLower = fieldName.toLowerCase()
  
  Object.keys(formData).forEach(otherField => {
    if (otherField !== fieldName) {
      const otherLower = otherField.toLowerCase()
      
      // Find fields that might be related
      if ((fieldLower.includes('organization') && otherLower.includes('organization')) ||
          (fieldLower.includes('project') && otherLower.includes('project')) ||
          (fieldLower.includes('budget') && otherLower.includes('amount')) ||
          (fieldLower.includes('contact') && otherLower.includes('contact'))) {
        related.push({
          fieldName: otherField,
          value: formData[otherField],
          relationship: 'related'
        })
      }
    }
  })
  
  return related.slice(0, 3) // Limit to most relevant
}

// Generate specific completion suggestions
const generateCompletionSuggestions = (fieldName, fieldType, project, userProfile) => {
  const suggestions = []
  const fieldLower = fieldName.toLowerCase()
  
  if (fieldLower.includes('organization_name') && userProfile?.organization_name) {
    suggestions.push({
      type: 'auto_fill',
      value: userProfile.organization_name,
      confidence: 0.9,
      source: 'user_profile'
    })
  }
  
  if (fieldLower.includes('ein') && (userProfile?.ein || userProfile?.tax_id)) {
    suggestions.push({
      type: 'auto_fill',
      value: userProfile.ein || userProfile.tax_id,
      confidence: 0.95,
      source: 'user_profile'
    })
  }
  
  if (fieldLower.includes('project_title') && project?.name) {
    suggestions.push({
      type: 'auto_fill',
      value: project.name,
      confidence: 0.8,
      source: 'project_data'
    })
  }
  
  return suggestions
}

// Helper to infer field type from name if not specified
const inferFieldTypeFromName = (fieldName) => {
  const fieldLower = fieldName.toLowerCase()
  
  if (fieldLower.includes('email')) return 'email'
  if (fieldLower.includes('phone')) return 'tel'
  if (fieldLower.includes('date') || fieldLower.includes('deadline')) return 'date'
  if (fieldLower.includes('amount') || fieldLower.includes('budget') || fieldLower.includes('funding')) return 'number'
  if (fieldLower.includes('description') || fieldLower.includes('narrative') || fieldLower.includes('summary')) return 'textarea'
  if (fieldLower.includes('url') || fieldLower.includes('website')) return 'url'
  
  return 'text'
}

// Helper to generate a specific question based on context
const generateSpecificQuestion = (fieldName, context) => {
  const { fieldType, specificGuidance, projectContext, isRequired } = context
  
  let question = `I need help with the "${fieldName.replace(/_/g, ' ')}" field. `
  
  if (specificGuidance?.purpose) {
    question += `This field is for: ${specificGuidance.purpose}. `
  }
  
  if (isRequired) {
    question += `This is a required field. `
  }
  
  if (fieldType === 'textarea') {
    question += `Please help me write compelling content that covers the key requirements. `
  } else {
    question += `What specific information should I provide? `
  }
  
  if (projectContext?.name) {
    question += `My project is "${projectContext.name}" `
    if (projectContext.type) {
      question += `which is a ${projectContext.type} project. `
    }
  }
  
  question += `Please provide specific, actionable guidance for completing this field effectively.`
  
  return question
}

// Enhanced Features: Real-Time Validation, Auto-Save, and Smart Suggestions

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Smart Document Analysis & Structure Recognition
const enhanceDocumentAnalysis = async (file, context) => {
  const analysis = await analyzeDocument(file)
  
  // Add semantic understanding
  const enhancedAnalysis = {
    ...analysis,
    semanticStructure: {
      requiredSections: identifyRequiredSections(analysis.text),
      optionalSections: identifyOptionalSections(analysis.text),
      dependencies: findFieldDependencies(analysis.fields),
      completionOrder: suggestOptimalOrder(analysis.fields)
    },
    intelligentDefaults: generateSmartDefaults(analysis.fields, context),
    riskAssessment: assessApplicationRisk(analysis, context)
  }
  
  return enhancedAnalysis
}

// Identify section relationships and dependencies
const findFieldDependencies = (fields) => {
  const dependencies = {}
  
  fields.forEach(field => {
    if (field.name.includes('budget_narrative') && 
        fields.some(f => f.name.includes('total_budget'))) {
      dependencies[field.name] = ['total_budget']
    }
    
    if (field.name.includes('project_description') &&
        fields.some(f => f.name.includes('project_title'))) {
      dependencies[field.name] = ['project_title']
    }

    if (field.name.includes('evaluation_plan') &&
        fields.some(f => f.name.includes('project_activities'))) {
      dependencies[field.name] = ['project_activities']
    }

    if (field.name.includes('sustainability_plan') &&
        fields.some(f => f.name.includes('project_outcomes'))) {
      dependencies[field.name] = ['project_outcomes']
    }
  })
  
  return dependencies
}

const identifyRequiredSections = (text) => {
  const sections = []
  const indicators = {
    'project_narrative': ['project description', 'statement of need', 'project summary'],
    'budget_section': ['budget', 'financial plan', 'cost breakdown'],
    'evaluation_section': ['evaluation', 'assessment', 'measurement'],
    'organization_info': ['organization', 'applicant', 'entity information']
  }

  Object.entries(indicators).forEach(([section, keywords]) => {
    if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
      sections.push(section)
    }
  })

  return sections
}

const suggestOptimalOrder = (fields) => {
  const orderPriority = {
    'organization_name': 1,
    'project_title': 2,
    'project_description': 3,
    'statement_of_need': 4,
    'project_activities': 5,
    'budget_amount': 6,
    'budget_narrative': 7,
    'evaluation_plan': 8,
    'sustainability_plan': 9
  }

  return fields.sort((a, b) => {
    const aPriority = orderPriority[a.name] || 999
    const bPriority = orderPriority[b.name] || 999
    return aPriority - bPriority
  })
}

const generateSmartDefaults = (fields, context) => {
  const defaults = {}
  
  fields.forEach(field => {
    if (field.name.includes('contact_email') && context.userProfile?.email) {
      defaults[field.name] = context.userProfile.email
    }
    if (field.name.includes('organization_name') && context.userProfile?.organization_name) {
      defaults[field.name] = context.userProfile.organization_name
    }
    if (field.name.includes('ein') && context.userProfile?.ein) {
      defaults[field.name] = context.userProfile.ein
    }
  })

  return defaults
}

// Format time ago utility
const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return 'earlier today'
}

// Real-time field validation
const validateFieldInRealTime = (fieldName, value, context) => {
  const warnings = []
  const suggestions = []
  
  // Character limits with smart warnings
  if (context.wordLimit && value.length > context.wordLimit * 0.9) {
    warnings.push(`Approaching ${context.wordLimit} character limit`)
  }
  
  // Content quality checks
  if (fieldName.includes('narrative') && value.length > 100) {
    if (!value.match(/\d+/)) {
      suggestions.push("Consider adding specific numbers or metrics")
    }
    if (!value.includes('will') && !value.includes('plan')) {
      suggestions.push("Consider adding future-oriented language about your plans")
    }
  }
  
  // Required field completeness
  if (context.isRequired && !value.trim()) {
    warnings.push("This field is required for submission")
  }
  
  return { warnings, suggestions }
}

// Intelligent field suggestions based on other completed fields
const generateContextualSuggestions = (fieldName, allFormData, projectData, userProfile) => {
  const suggestions = []
  
  // Cross-reference existing data
  if (fieldName.includes('contact_person') && allFormData.organization_name && userProfile?.full_name) {
    suggestions.push({
      label: "Use your name as primary contact",
      value: userProfile.full_name,
      reason: "Most common for single-person organizations"
    })
  }
  
  // Smart budget calculations
  if (fieldName.includes('indirect_cost') && allFormData.direct_costs) {
    const directCosts = parseFloat(allFormData.direct_costs) || 0
    if (directCosts > 0) {
      suggestions.push({
        label: "Standard 10% indirect rate",
        value: (directCosts * 0.1).toFixed(0),
        reason: "Typical for small organizations"
      })
    }
  }
  
  // Project duration suggestions
  if (fieldName.includes('duration') && projectData?.funding_needed) {
    const funding = parseFloat(projectData.funding_needed) || 0
    if (funding < 25000) {
      suggestions.push({
        label: "6 months",
        value: "6",
        reason: "Typical for smaller grants"
      })
    } else if (funding < 100000) {
      suggestions.push({
        label: "12 months", 
        value: "12",
        reason: "Standard for medium grants"
      })
    }
  }
  
  return suggestions
}

// Detect potential errors before they become issues
const detectPotentialErrors = (fieldName, value, allFormData) => {
  const errors = []
  
  // Budget consistency checks
  if (fieldName.includes('budget') && allFormData.project_duration && value) {
    const monthlyBudget = parseFloat(value) / parseInt(allFormData.project_duration)
    if (monthlyBudget > 50000) {
      errors.push({
        message: "Monthly budget seems high for project duration",
        suggestion: "Review budget breakdown",
        severity: 'warning'
      })
    }
  }
  
  // Date logic checks
  if (fieldName.includes('start_date') && allFormData.end_date && value) {
    if (new Date(value) >= new Date(allFormData.end_date)) {
      errors.push({
        message: "Start date should be before end date",
        fix: () => suggestDateFix(value, allFormData.end_date),
        severity: 'error'
      })
    }
  }
  
  // EIN format check
  if ((fieldName.includes('ein') || fieldName.includes('tax_id')) && value) {
    if (!/^\d{2}-\d{7}$/.test(value)) {
      errors.push({
        message: "EIN should be in format XX-XXXXXXX",
        suggestion: "Use 9 digits with hyphen",
        severity: 'error'
      })
    }
  }
  
  return errors
}

// Progress gamification calculations
const calculateAchievements = (completionPercentage, fieldsCompleted) => {
  const achievements = []
  
  if (fieldsCompleted >= 1) {
    achievements.push({ id: 'first-field', name: 'Getting Started' })
  }
  if (completionPercentage >= 25) {
    achievements.push({ id: 'quarter', name: 'Quarter Way' })
  }
  if (completionPercentage >= 50) {
    achievements.push({ id: 'halfway', name: 'Halfway Hero' })
  }
  if (completionPercentage >= 75) {
    achievements.push({ id: 'almost-there', name: 'Almost There' })
  }
  if (completionPercentage >= 90) {
    achievements.push({ id: 'final-stretch', name: 'Final Stretch' })
  }
  
  return achievements
}

const getNextMilestone = (completionPercentage) => {
  if (completionPercentage < 25) return "Complete 25% to unlock 'Quarter Way' badge"
  if (completionPercentage < 50) return "Reach 50% to become a 'Halfway Hero'"
  if (completionPercentage < 75) return "Get to 75% for 'Almost There' status"
  if (completionPercentage < 90) return "Push to 90% for 'Final Stretch' achievement"
  return "You're almost done! Complete the application!"
}

// Visual save indicator component
const SaveIndicator = ({ status, lastSaved }) => (
  <div className="text-xs text-slate-500 flex items-center gap-1">
    {status === 'saving' && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
    {status === 'success' && <div className="w-3 h-3 bg-green-500 rounded-full" />}
    {status === 'error' && <div className="w-3 h-3 bg-red-500 rounded-full" />}
    {lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
  </div>
)

// Interactive Application Preview
const ApplicationPreview = ({ formData, formStructure }) => {
  const [previewMode, setPreviewMode] = useState('funder')
  
  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 p-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium">Preview: How Funders Will See This</h4>
        <div className="flex items-center gap-2">
          <select value={previewMode} onChange={(e) => setPreviewMode(e.target.value)} className="text-sm border rounded px-2 py-1">
            <option value="funder">Funder's View</option>
            <option value="print">Print Version</option>
          </select>
        </div>
      </div>
      <div className="bg-white rounded border max-h-64 overflow-y-auto p-3">
        {Object.entries(formData).map(([field, value]) => (
          <div key={field} className="mb-2 border-b pb-2">
            <div className="text-xs font-medium text-slate-600">
              {formStructure?.dataFields?.[field]?.label || field.replace(/_/g, ' ')}
            </div>
            <div className="text-sm">
              {value || <span className="text-red-400 italic">Missing</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Smart Deadline Management
const DeadlineContext = ({ deadline, completionPercentage }) => {
  if (!deadline) return null
  const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
  const estimatedTimeLeft = Math.ceil((100 - completionPercentage) * 0.5)
  if (daysLeft < 0) return null

  return (
    <div className={`p-3 rounded-lg mb-4 ${
      daysLeft <= 3 ? 'bg-red-50 border border-red-200' :
      daysLeft <= 7 ? 'bg-amber-50 border border-amber-200' :
      'bg-blue-50 border border-blue-200'
    }`}>
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium">{daysLeft} days until deadline</div>
          <div className="text-sm text-slate-600">Estimated {estimatedTimeLeft} hours remaining</div>
        </div>
        {daysLeft <= 7 && (
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            Schedule Work Time
          </button>
        )}
      </div>
    </div>
  )
}

// Intelligent Error Prevention
const ErrorPrevention = ({ fieldName, value, allFormData }) => {
  const errors = detectPotentialErrors(fieldName, value, allFormData)
  if (errors.length === 0) return null
  return (
    <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded">
      <div className="text-sm font-medium text-amber-800">Potential Issues:</div>
      {errors.map((error, idx) => (
        <div key={idx} className="text-xs text-amber-700 flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500 rounded-full" />
          {error.message}
          {error.suggestion && (
            <button 
              onClick={() => error.fix && error.fix()}
              className="text-blue-600 hover:text-blue-800 underline ml-1"
            >
              Fix this
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// Helper function to find relevant past content for current field
const findRelevantPastContent = (currentField, userApplicationHistory = []) => {
  if (!currentField || !userApplicationHistory || userApplicationHistory.length === 0) {
    return []
  }

  const fieldName = currentField.name?.toLowerCase() || currentField.toLowerCase()
  
  return userApplicationHistory
    .filter(app => app.fields && app.status !== 'rejected')
    .map(app => {
      // Find matching fields by name similarity
      const matchingFields = Object.entries(app.fields || {}).filter(([key, value]) => {
        const keyLower = key.toLowerCase()
        return keyLower.includes(fieldName) || 
               fieldName.includes(keyLower) ||
               // Common field mappings
               (fieldName.includes('description') && keyLower.includes('description')) ||
               (fieldName.includes('objective') && keyLower.includes('objective')) ||
               (fieldName.includes('goal') && keyLower.includes('goal')) ||
               (fieldName.includes('summary') && keyLower.includes('summary')) ||
               (fieldName.includes('statement') && keyLower.includes('statement'))
      })
      
      return matchingFields.map(([key, value]) => ({
        applicationName: app.name || app.opportunityTitle || 'Previous Application',
        successRate: app.status === 'awarded' ? 100 : app.status === 'submitted' ? 75 : 50,
        text: value && typeof value === 'string' ? value : String(value || ''),
        fieldName: key,
        applicationId: app.id
      }))
    })
    .flat()
    .filter(content => content.text && content.text.length > 20) // Filter out very short content
    .sort((a, b) => b.successRate - a.successRate) // Sort by success rate
    .slice(0, 5) // Limit to top 5 most relevant
}

// Content Library for reusing past application content
const ContentLibrary = ({ userApplicationHistory, currentField, onApplyContent }) => {
  const relevantContent = findRelevantPastContent(currentField, userApplicationHistory)
  
  if (relevantContent.length === 0) return null
  
  return (
    <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
      <div className="text-sm font-medium text-blue-900 mb-2">
        Similar content from past applications:
      </div>
      {relevantContent.map((content, idx) => (
        <div key={idx} className="mb-2 last:mb-0">
          <div className="text-xs text-blue-700 mb-1">
            From "{content.applicationName}" - {content.successRate}% success rate
          </div>
          <div className="text-sm bg-white p-2 rounded border cursor-pointer hover:bg-blue-50"
               onClick={() => onApplyContent && onApplyContent(content.text)}>
            {content.text.substring(0, 100)}...
          </div>
        </div>
      ))}
    </div>
  )
}

// Mobile-First Design Improvements
const MobileOptimizedField = ({ field, value, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="mb-4">
      <div 
        className="flex justify-between items-center p-3 bg-white border rounded-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="font-medium">{field.label}</div>
        <div className="flex items-center gap-2">
          {value && <div className="w-4 h-4 bg-green-500 rounded-full" />}
          <div className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg">
          {field.helpText && (
            <div className="text-sm text-slate-600 mb-2">{field.helpText}</div>
          )}
          <input
            type="text"
            value={value || ''}
            onChange={onChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder={field.placeholder}
          />
        </div>
      )}
    </div>
  )
}

// Collaborative Features (stub for future expansion)
const CollaborationPanel = ({ applicationId, currentUser }) => {
  const [collaborators, setCollaborators] = useState([])
  const [comments, setComments] = useState([])

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <h4 className="font-medium mb-3">Team Collaboration</h4>
      <div className="space-y-2">
        {comments.map(comment => (
          <div key={comment.id} className="bg-white rounded p-2 border-l-2 border-blue-500">
            <div className="text-xs text-slate-500">
              {comment.fieldName} - {comment.author} - {comment.timestamp}
            </div>
            <div className="text-sm">{comment.text}</div>
          </div>
        ))}
      </div>
      <button className="text-sm text-blue-600 hover:text-blue-800">
        + Invite team member to review
      </button>
    </div>
  )
}

export default function EnhancedApplicationTracker({ 
  projects, 
  userProfile, 
  opportunities = [],
  submissions = [],
  customerData = null,
  onClose, 
  onSubmit,
  initialState = null,
  onStateChange = null
}) {
  // Helper function to generate file hash for caching
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const [step, setStep] = useState(initialState?.step || 'upload') // upload, analyze, missing_info, complete, review
  const [uploadedFiles, setUploadedFiles] = useState(initialState?.uploadedFiles || [])
  const [documentAnalysis, setDocumentAnalysis] = useState(initialState?.documentAnalysis || null)
  const [formCompletion, setFormCompletion] = useState(initialState?.formCompletion || null)
  const [filledForm, setFilledForm] = useState(initialState?.filledForm || {})
  const [missingQuestions, setMissingQuestions] = useState(initialState?.missingQuestions || [])
  const [userAnswers, setUserAnswers] = useState(initialState?.userAnswers || {})
  const [selectedProject, setSelectedProject] = useState(initialState?.selectedProject || '')
  const [processing, setProcessing] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(initialState?.analysisComplete || false)
  const [showMissingInfo, setShowMissingInfo] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState(initialState?.aiAnalysisResult || null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false)
  const [showAIDocumentAnalysisModal, setShowAIDocumentAnalysisModal] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [enhancedFormStructure, setEnhancedFormStructure] = useState(initialState?.enhancedFormStructure || null) // Updated from dynamicFormStructure
  
  // AI Assistant state - using WaliOS Assistant instead
  const [showWaliOSAssistant, setShowWaliOSAssistant] = useState(false)
  const [currentFieldForAI, setCurrentFieldForAI] = useState(null)
  const [assistantContext, setAssistantContext] = useState(null)
  const [formCacheId, setFormCacheId] = useState(null)

  // Enhanced Features State
  const [fieldValidations, setFieldValidations] = useState({}) // Real-time validation results
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle', 'saving', 'success', 'error'
  const [lastSaved, setLastSaved] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewMode, setPreviewMode] = useState('funder') // 'funder' or 'print'
  const [contextualSuggestions, setContextualSuggestions] = useState({})
  const [applicationDeadline, setApplicationDeadline] = useState(null)
  const [completionPercentage, setCompletionPercentage] = useState(0)

  // Debug assistant state changes
  useEffect(() => {
    console.log('🔄 Assistant state changed:', {
      showWaliOSAssistant,
      currentFieldForAI,
      assistantContext: assistantContext ? { fieldName: assistantContext.fieldName } : null
    })
  }, [showWaliOSAssistant, currentFieldForAI, assistantContext])

  // Auto-trigger assistant when field is focused
  useEffect(() => {
    if (currentFieldForAI) {
      console.log('🎯 Field focused, auto-triggering assistant:', currentFieldForAI)
      
      // Create enhanced field context
      const fieldContext = createEnhancedFieldContext(currentFieldForAI, filledForm[currentFieldForAI])
      
      // Set field context in assistant manager
      assistantManager.setFieldContext({
        fieldName: currentFieldForAI,
        fieldValue: filledForm[currentFieldForAI],
        opportunityId: opportunity?.id,
        formData: filledForm,
        ...fieldContext
      })
      
      // Auto-show assistant with context after a brief delay to avoid jarring transitions
      setTimeout(() => {
        setAssistantContext({
          fieldName: currentFieldForAI,
          fieldValue: filledForm[currentFieldForAI],
          opportunity: opportunity,
          ...fieldContext
        })
        setShowWaliOSAssistant(true)
      }, 300) // 300ms delay for smooth UX
    } else {
      // Field unfocused - don't immediately hide assistant, let user decide
      console.log('🎯 Field unfocused, clearing field context but keeping assistant open')
      assistantManager.setFieldContext(null)
    }
  }, [currentFieldForAI, filledForm, opportunity])

  // Enhanced focus handler for automatic assistant triggering
  const handleFieldFocus = useCallback((fieldName) => {
    console.log('🔍 Field focused:', fieldName)
    setCurrentFieldForAI(fieldName)
  }, [])

  const handleFieldBlur = useCallback((fieldName) => {
    console.log('🔍 Field blurred:', fieldName)
    // Don't immediately clear - let the assistant stay open for user interaction
    setTimeout(() => {
      if (currentFieldForAI === fieldName) {
        setCurrentFieldForAI(null)
      }
    }, 1000) // 1 second delay before clearing
  }, [currentFieldForAI])

  // Save state when it changes
  useEffect(() => {
    if (onStateChange) {
      const currentState = {
        step,
        uploadedFiles,
        documentAnalysis,
        formCompletion,
        filledForm,
        missingQuestions,
        userAnswers,
        selectedProject,
        analysisComplete,
        aiAnalysisResult,
        enhancedFormStructure
      }
      onStateChange(currentState)
    }
  }, [step, uploadedFiles, documentAnalysis, formCompletion, filledForm, missingQuestions, userAnswers, selectedProject, analysisComplete, aiAnalysisResult, enhancedFormStructure, onStateChange])

  // Enhanced Field Context Creation Function
  const createEnhancedFieldContext = (fieldName, fieldValue) => {
    // Get field configuration from enhanced structure
    const dataFieldConfig = enhancedFormStructure?.dataFields?.[fieldName]
    const narrativeFieldConfig = enhancedFormStructure?.narrativeFields?.[fieldName]
    const fieldConfig = dataFieldConfig || narrativeFieldConfig

    // Get project context
    const currentProject = projects.find(p => p.id === selectedProject)
    
    // Determine field type and requirements
    const fieldType = fieldConfig?.type || inferFieldTypeFromName(fieldName)
    const isRequired = fieldConfig?.required || false
    const wordLimit = fieldConfig?.wordLimit
    const helpText = fieldConfig?.helpText
    const section = fieldConfig?.section

    // Create specific context based on field type and name
    const specificContext = createFieldSpecificContext(fieldName, fieldType, currentProject)

    return {
      fieldName,
      fieldValue,
      fieldType,
      isRequired,
      wordLimit,
      helpText,
      section,
      formType: enhancedFormStructure?.formMetadata?.detectedFormType,
      fieldConfiguration: fieldConfig,
      projectContext: {
        name: currentProject?.name,
        type: currentProject?.project_type,
        budget: currentProject?.funding_needed || currentProject?.total_project_budget,
        description: currentProject?.description,
        targetPopulation: currentProject?.target_population
      },
      organizationContext: {
        name: userProfile?.organization_name,
        type: userProfile?.organization_type,
        ein: userProfile?.ein || userProfile?.tax_id,
        certifications: {
          minorityOwned: userProfile?.minority_owned,
          womanOwned: userProfile?.woman_owned,
          veteranOwned: userProfile?.veteran_owned,
          smallBusiness: userProfile?.small_business
        }
      },
      specificGuidance: specificContext,
      relatedFields: findRelatedFields(fieldName, filledForm),
      completionSuggestions: generateCompletionSuggestions(fieldName, fieldType, currentProject, userProfile)
    }
  }

  // Smart Auto-Save Functionality
  const saveFormProgress = useCallback(async (formData) => {
    try {
      setSaveStatus('saving')
      // Here you would save to your backend/database
      // For now, we'll simulate the save operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('💾 Auto-saved form data:', Object.keys(formData).length, 'fields')
      setSaveStatus('success')
      setLastSaved(new Date())
      setUnsavedChanges(false)
      return true
    } catch (error) {
      console.error('Auto-save failed:', error)
      setSaveStatus('error')
      return false
    }
  }, [])

  const debouncedAutoSave = useCallback(
    debounce((formData) => {
      if (Object.keys(formData).length > 0) {
        saveFormProgress(formData)
      }
    }, 2000),
    [saveFormProgress]
  )

  // Calculate completion percentage
  const calculateCompletionPercentage = useCallback(() => {
    const totalFields = enhancedFormStructure ? 
      Object.keys(enhancedFormStructure.dataFields || {}).length + 
      Object.keys(enhancedFormStructure.narrativeFields || {}).length : 
      Object.keys(filledForm).length || 1
    
    const completedFields = Object.values(filledForm).filter(value => 
      value && value.toString().trim().length > 0
    ).length
    
    return Math.round((completedFields / Math.max(totalFields, 1)) * 100)
  }, [filledForm, enhancedFormStructure])

  // Update completion percentage when form changes
  useEffect(() => {
    const percentage = calculateCompletionPercentage()
    setCompletionPercentage(percentage)
  }, [filledForm, calculateCompletionPercentage])

  // Auto-save when form data changes
  useEffect(() => {
    if (Object.keys(filledForm).length > 0) {
      setUnsavedChanges(true)
      debouncedAutoSave(filledForm)
    }
  }, [filledForm, debouncedAutoSave])

  // Enhanced file upload and analysis with better error handling and structure parsing
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return

    setProcessing(true)
    setUploadProgress(0)
    const fileArray = Array.from(files)
    setUploadedFiles(fileArray)

    try {
      const analyses = []
      const totalFiles = fileArray.length
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setCurrentFileName(file.name)
        setUploadProgress(((i) / totalFiles) * 100)
        
        // Enhanced FormData with more context for better analysis
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'grant_application')
        formData.append('extractionMode', 'comprehensive')
        formData.append('context', JSON.stringify({
          fileName: file.name,
          userProfile,
          projectData: projects.find(p => p.id === selectedProject),
          analysisMode: 'enhanced_structure_extraction'
        }))

        try {
          console.log(`🔍 Checking cache for ${file.name}...`)
          
          // Check if we have this form cached first
          const cacheCheckResponse = await fetch('/api/form/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get_cache',
              fileName: file.name,
              fileSize: file.size,
              fileHash: await generateFileHash(file)
            })
          })
          
          let analysisResult = null
          let fromCache = false
          
          if (cacheCheckResponse.ok) {
            const cacheResult = await cacheCheckResponse.json()
            if (cacheResult.success && cacheResult.data) {
              console.log(`✅ Found cached analysis for ${file.name}`)
              analysisResult = cacheResult.data
              fromCache = true
              setFormCacheId(cacheResult.data.id)
            }
          }
          
          if (!analysisResult) {
            console.log(`🔍 Analyzing ${file.name} with AI...`)
          
            // Call the enhanced PDF analysis API
            const analysisResponse = await fetch('/api/pdf/analyze', {
              method: 'POST',
              body: formData
            })

            if (!analysisResponse.ok) {
              throw new Error(`Analysis failed: ${analysisResponse.statusText}`)
            }

            analysisResult = await analysisResponse.json()
            
            if (!analysisResult.success) {
              throw new Error(analysisResult.error || 'Analysis failed')
            }

            // Cache the analysis result for future use
            try {
              const cacheResponse = await fetch('/api/form/cache', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'store_cache',
                  fileName: file.name,
                  fileSize: file.size,
                  fileHash: await generateFileHash(file),
                  analysisResult: analysisResult,
                  userId: userProfile?.id || 'anonymous'
                })
              })
              
              if (cacheResponse.ok) {
                const cacheStoreResult = await cacheResponse.json()
                if (cacheStoreResult.success) {
                  setFormCacheId(cacheStoreResult.data.id)
                  console.log(`💾 Cached analysis for ${file.name}`)
                }
              }
            } catch (cacheError) {
              console.warn('Failed to cache analysis:', cacheError)
            }
          }

          // Map new API response to expected format
          const formAnalysis = analysisResult.data.formAnalysis
          const formStructure = analysisResult.data.formStructure
          const walkthrough = analysisResult.data.walkthrough

          // Convert new structure to legacy format for compatibility
          const legacyAnalysis = {
            documentType: formAnalysis.formType,
            detectedFormType: formAnalysis.formType,
            title: formAnalysis.formTitle,
            totalPages: formAnalysis.totalPages,
            confidence: formAnalysis.confidence,
            extractionConfidence: formAnalysis.confidence,
            // Convert fields to dataFields and narrativeFields
            dataFields: {},
            narrativeFields: {},
            documentSections: formStructure.sections?.map(section => ({
              title: section.title,
              description: section.description,
              type: section.type,
              order: section.order
            })) || [],
            requirements: formStructure.requirements || [],
            attachments: formStructure.attachments || []
          }

          // Categorize fields into data and narrative
          formStructure.fields?.forEach(field => {
            if (field.type === 'textarea' || field.type === 'narrative') {
              legacyAnalysis.narrativeFields[field.id] = {
                question: field.question || field.label,
                type: field.type,
                required: field.required,
                wordLimit: field.wordLimit,
                helpText: field.helpText,
                canAutoFill: field.canAutoFill,
                section: field.section
              }
            } else {
              legacyAnalysis.dataFields[field.id] = {
                label: field.label,
                type: field.type,
                required: field.required,
                placeholder: field.placeholder,
                validation: field.validation,
                options: field.options,
                canAutoFill: field.canAutoFill,
                section: field.section
              }
            }
          })

          // Create legacy formStructure
          const legacyFormStructure = {
            dataFields: legacyAnalysis.dataFields,
            narrativeFields: legacyAnalysis.narrativeFields,
            formMetadata: {
              detectedFormType: formAnalysis.formType,
              totalFields: formStructure.metadata?.totalFields || 0,
              sectionsFound: formStructure.metadata?.sectionsCount || 0,
              complexity: formStructure.metadata?.complexity || 'moderate'
            },
            enhancedAnalysis: {
              requirements: formStructure.requirements || [],
              attachments: formStructure.attachments || [],
              deadlines: formStructure.deadlines || []
            }
          }

          // Create legacy enhancedAnalysis
          const legacyEnhancedAnalysis = {
            walkthrough: walkthrough,
            keyInformation: {
              estimatedTime: walkthrough.estimatedTime,
              totalSteps: walkthrough.totalSteps,
              canAutoFill: walkthrough.canAutoFill
            }
          }

          // Create ocrStats
          const ocrStats = {
            documentComplexity: formStructure.metadata?.complexity || 'moderate',
            structureQuality: formAnalysis.confidence > 0.8 ? 'high' : 'medium',
            totalFields: formStructure.metadata?.totalFields || 0,
            sectionsFound: formStructure.metadata?.sectionsCount || 0
          }

          console.log('📊 Enhanced analysis result:', {
            documentType: legacyAnalysis.documentType,
            detectedFormType: legacyAnalysis.detectedFormType,
            dataFields: Object.keys(legacyAnalysis.dataFields || {}).length,
            narrativeFields: Object.keys(legacyAnalysis.narrativeFields || {}).length,
            sections: legacyAnalysis.documentSections?.length || 0,
            requirements: legacyAnalysis.requirements?.length || 0,
            attachments: legacyAnalysis.attachments?.length || 0
          })

          // Store enhanced form structure for better processing
          if (legacyFormStructure && (
            Object.keys(legacyFormStructure.dataFields || {}).length > 0 ||
            Object.keys(legacyFormStructure.narrativeFields || {}).length > 0
          )) {
            setEnhancedFormStructure({
              ...legacyFormStructure,
              enhancedAnalysis: legacyEnhancedAnalysis,
              ocrStats: ocrStats
            })
            console.log(`📝 Enhanced form structure extracted with ${
              Object.keys(legacyFormStructure.dataFields || {}).length + 
              Object.keys(legacyFormStructure.narrativeFields || {}).length
            } total fields`)
          }
          
          analyses.push({
            fileName: file.name,
            analysis: {
              ...legacyAnalysis,
              enhancedAnalysis: legacyEnhancedAnalysis
            },
            formStructure: legacyFormStructure,
            fileSize: file.size,
            fileType: file.type,
            ocrStats: ocrStats
          })

        } catch (fileError) {
          console.error(`Failed to process ${file.name}:`, fileError)
          toast.error(`Failed to process ${file.name}: ${fileError.message}`)
          
          analyses.push({
            fileName: file.name,
            analysis: { 
              error: fileError.message, 
              documentType: 'Unknown',
              extractionConfidence: 0
            },
            fileSize: file.size,
            fileType: file.type
          })
        }
        
        setUploadProgress(((i + 1) / totalFiles) * 100)
      }

      setDocumentAnalysis(analyses)
      setAnalysisComplete(true)
      setStep('analyze')
      
      const successfulAnalyses = analyses.filter(a => !a.analysis.error)
      if (successfulAnalyses.length > 0) {
        toast.success(`Successfully analyzed ${successfulAnalyses.length} of ${fileArray.length} document(s)`)
      } else {
        toast.error('All document analyses failed. Please try different files.')
      }

    } catch (error) {
      console.error('Document upload/analysis failed:', error)
      toast.error('Failed to analyze documents: ' + error.message)
    } finally {
      setProcessing(false)
      setUploadProgress(0)
      setCurrentFileName('')
    }
  }

  // Enhanced form completion with better structure handling
  const handleFormCompletion = async () => {
    if (!documentAnalysis || !selectedProject) {
      toast.error('Please select a project and upload application documents')
      return
    }

    setProcessing(true)
    try {
      const project = projects.find(p => p.id === selectedProject)
      if (!project) {
        throw new Error('Selected project not found')
      }

      console.log('📋 Enhanced form completion with data:', {
        projectId: project.id,
        projectName: project.name || project.title,
        enhancedStructure: !!enhancedFormStructure,
        totalFields: enhancedFormStructure ? 
          Object.keys(enhancedFormStructure.dataFields || {}).length + 
          Object.keys(enhancedFormStructure.narrativeFields || {}).length : 0
      })

      // Combine all form fields from enhanced analysis
      const combinedDataFields = {}
      const combinedNarrativeFields = {}
      const combinedRequirements = []
      const combinedAttachments = []

      documentAnalysis.forEach(({ analysis, formStructure }) => {
        if (analysis.dataFields) {
          Object.assign(combinedDataFields, analysis.dataFields)
        }
        if (analysis.narrativeFields) {
          Object.assign(combinedNarrativeFields, analysis.narrativeFields)
        }
        if (analysis.requirements) {
          combinedRequirements.push(...analysis.requirements)
        }
        if (analysis.attachments) {
          combinedAttachments.push(...analysis.attachments)
        }
      })

      console.log('🔄 Calling enhanced smart form completion API:', {
        dataFields: Object.keys(combinedDataFields).length,
        narrativeFields: Object.keys(combinedNarrativeFields).length,
        requirements: combinedRequirements.length,
        attachments: combinedAttachments.length
      })

      // Call enhanced smart form completion API (now generate-walkthrough)
      const completionResponse = await fetch('/api/ai/generate-walkthrough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: {
            formTitle: enhancedFormStructure?.formMetadata?.detectedFormType || 'Application Form',
            fields: [
              ...Object.entries(enhancedFormStructure?.dataFields || {}).map(([id, field]) => ({
                id,
                ...field,
                type: field.type || 'text'
              })),
              ...Object.entries(enhancedFormStructure?.narrativeFields || {}).map(([id, field]) => ({
                id,
                ...field,
                type: 'textarea'
              }))
            ],
            sections: enhancedFormStructure?.enhancedAnalysis?.requirements?.map((req, idx) => ({
              id: `section_${idx}`,
              title: req.type || 'Section',
              description: req.description,
              type: req.type
            })) || []
          },
          userProfile: userProfile,
          projectData: project,
          companySettings: userProfile // Use userProfile as company settings fallback
        })
      })

      if (!completionResponse.ok) {
        const errorText = await completionResponse.text()
        console.error('Enhanced form completion API error:', errorText)
        throw new Error(`Form completion failed: ${errorText}`)
      }

      const completion = await completionResponse.json()
      console.log('✅ Enhanced form completion result:', {
        steps: completion.data?.walkthrough?.totalSteps || 0,
        autoFilled: completion.data?.progress?.canAutoFill || 0,
        needsInput: completion.data?.progress?.needsInput || 0,
        aiAssisted: completion.data?.progress?.requiresAI || 0
      })

      // Map new API response to legacy format for compatibility
      const legacyCompletion = {
        completionPercentage: Math.round(((completion.data?.progress?.canAutoFill || 0) / (completion.data?.progress?.totalFields || 1)) * 100),
        confidence: 0.85, // Default confidence for walkthrough
        dataFieldCompletions: {},
        narrativeFieldCompletions: {},
        filledForm: {},
        opportunityTitle: completion.data?.walkthrough?.formTitle || 'AI-Enhanced Application',
        opportunityDescription: `Generated walkthrough with ${completion.data?.walkthrough?.totalSteps || 0} steps`,
        amountMin: project?.funding_needed || 0,
        amountMax: project?.funding_needed || 100000,
        deadline: null,
        strengths: completion.data?.aiAssistance?.recommendations || ['Walkthrough generated successfully'],
        challenges: completion.data?.complexFields?.map(f => f.reason) || [],
        recommendations: completion.data?.aiAssistance?.availableHelp?.map(h => h.description) || [],
        nextSteps: completion.data?.walkthrough?.steps?.map(s => s.title) || [],
        reasoning: 'AI-generated guided completion walkthrough',
        walkthrough: completion.data?.walkthrough,
        autoFillData: completion.data?.autoFillData,
        aiAssistance: completion.data?.aiAssistance
      }

      // Populate filled form from auto-fill suggestions
      if (completion.data?.autoFillData?.suggestions) {
        Object.entries(completion.data.autoFillData.suggestions).forEach(([fieldId, suggestion]) => {
          if (suggestion.confidence > 0.7) {
            legacyCompletion.filledForm[fieldId] = suggestion.value
            // Categorize as data or narrative field
            if (enhancedFormStructure?.dataFields?.[fieldId]) {
              legacyCompletion.dataFieldCompletions[fieldId] = suggestion.value
            } else if (enhancedFormStructure?.narrativeFields?.[fieldId]) {
              legacyCompletion.narrativeFieldCompletions[fieldId] = suggestion.value
            }
          }
        })
      }

      // Manually add company/user profile data for common field patterns
      if (userProfile) {
        const companyDataMapping = {
          // EIN/Tax ID patterns
          'tax_id': userProfile.tax_id_ein || userProfile.tax_id || userProfile.ein,
          'ein': userProfile.tax_id_ein || userProfile.tax_id || userProfile.ein,  
          'tax_id_ein': userProfile.tax_id_ein || userProfile.tax_id || userProfile.ein,
          'federal_tax_id': userProfile.tax_id_ein || userProfile.tax_id || userProfile.ein,
          'employer_identification_number': userProfile.tax_id_ein || userProfile.tax_id || userProfile.ein,
          // Organization details
          'organization_name': userProfile.organization_name || userProfile.full_name,
          'organization_legal_name': userProfile.organization_name || userProfile.full_name,
          'legal_name': userProfile.organization_name || userProfile.full_name,
          'company_name': userProfile.organization_name || userProfile.full_name,
          // Incorporation details
          'date_incorporated': userProfile.date_incorporated,
          'incorporation_date': userProfile.date_incorporated,
          'state_incorporated': userProfile.state_incorporated,
          'incorporation_state': userProfile.state_incorporated,
          'state_of_incorporation': userProfile.state_incorporated,
          // DUNS/UEI
          'duns_number': userProfile.duns_uei_number || userProfile.duns,
          'uei_number': userProfile.duns_uei_number || userProfile.uei,
          'duns_uei_number': userProfile.duns_uei_number,
          // Contact info
          'contact_email': userProfile.email,
          'email': userProfile.email,
          'phone': userProfile.phone || userProfile.phone_number,
          'phone_number': userProfile.phone || userProfile.phone_number
        }

        // Apply company data to fields that match
        Object.entries(companyDataMapping).forEach(([fieldPattern, value]) => {
          if (value) {
            // Look for exact matches first
            if (legacyCompletion.filledForm.hasOwnProperty(fieldPattern)) {
              legacyCompletion.filledForm[fieldPattern] = value
            }
            
            // Also check for fields that contain these patterns (case insensitive)
            Object.keys(legacyCompletion.filledForm).forEach(fieldKey => {
              const fieldLower = fieldKey.toLowerCase()
              const patternLower = fieldPattern.toLowerCase()
              
              if (fieldLower.includes(patternLower) || patternLower.includes(fieldLower)) {
                if (!legacyCompletion.filledForm[fieldKey]) {
                  legacyCompletion.filledForm[fieldKey] = value
                }
              }
            })
          }
        })
      }

      // Add ALL detected fields to filledForm for user editing (not just auto-filled ones)
      if (enhancedFormStructure) {
        // Add all data fields
        Object.entries(enhancedFormStructure.dataFields || {}).forEach(([fieldId, fieldConfig]) => {
          if (!legacyCompletion.filledForm[fieldId]) {
            legacyCompletion.filledForm[fieldId] = fieldConfig.value || fieldConfig.extractedText || ''
            legacyCompletion.dataFieldCompletions[fieldId] = legacyCompletion.filledForm[fieldId]
          }
        })

        // Add all narrative fields
        Object.entries(enhancedFormStructure.narrativeFields || {}).forEach(([fieldId, fieldConfig]) => {
          if (!legacyCompletion.filledForm[fieldId]) {
            legacyCompletion.filledForm[fieldId] = fieldConfig.value || fieldConfig.extractedText || fieldConfig.question || ''
            legacyCompletion.narrativeFieldCompletions[fieldId] = legacyCompletion.filledForm[fieldId]
          }
        })

        console.log('📝 Form populated with fields:', {
          totalFields: Object.keys(legacyCompletion.filledForm).length,
          dataFields: Object.keys(legacyCompletion.dataFieldCompletions).length,
          narrativeFields: Object.keys(legacyCompletion.narrativeFieldCompletions).length
        })
      }

      setFormCompletion(legacyCompletion)
      
      // Merge data and narrative field completions
      const mergedFilledForm = {
        ...legacyCompletion.dataFieldCompletions || {},
        ...legacyCompletion.narrativeFieldCompletions || {},
        ...legacyCompletion.filledForm || {} // Legacy compatibility
      }
      setFilledForm(mergedFilledForm)
      
      // Create enhanced opportunity data
      const enhancedOpportunity = {
        id: `ai-enhanced-${Date.now()}`,
        title: legacyCompletion.opportunityTitle || 'AI-Enhanced Grant Opportunity',
        description: legacyCompletion.opportunityDescription || 'Opportunity analyzed from uploaded documents with enhanced structure recognition',
        sponsor: legacyCompletion.sponsor || 'Various Sponsors',
        amount_min: legacyCompletion.amountMin || 0,
        amount_max: legacyCompletion.amountMax || 100000,
        deadline_date: legacyCompletion.deadline || null,
        eligibility_requirements: combinedRequirements.map(r => r.description).join('; ') || 'Standard requirements apply',
        form_type: enhancedFormStructure?.formMetadata?.detectedFormType || 'unknown',
        complexity: enhancedFormStructure?.ocrStats?.documentComplexity || 'moderate'
      }

      // Enhanced analysis data for modal
      const enhancedAnalysisData = {
        opportunity: enhancedOpportunity,
        project: project,
        userProfile: userProfile,
        analysis: {
          fitScore: legacyCompletion.completionPercentage || 75,
          strengths: legacyCompletion.strengths || [
            'Enhanced document structure analysis completed',
            'Form fields automatically categorized',
            'Narrative and data fields distinguished'
          ],
          challenges: legacyCompletion.challenges || ['Some complex fields may need manual review'],
          recommendations: legacyCompletion.recommendations || [
            'Review AI-generated content for accuracy',
            'Complete any missing narrative sections',
            'Verify all data field mappings'
          ],
          nextSteps: legacyCompletion.nextSteps || [
            'Review enhanced application structure',
            'Complete missing information',
            'Download completed application'
          ],
          confidence: legacyCompletion.confidence || 0.85,
          reasoning: legacyCompletion.reasoning || 'Enhanced analysis with structure recognition and field categorization',
          enhancedFeatures: {
            structureAnalysis: true,
            fieldCategorization: true,
            narrativeRecognition: true,
            requirementExtraction: combinedRequirements.length > 0,
            attachmentIdentification: combinedAttachments.length > 0
          }
        },
        quickMatchScore: legacyCompletion.completionPercentage || 75,
        enhancedStructure: enhancedFormStructure
      }

      setAnalysisData(enhancedAnalysisData)
      setStep('complete')
      
      // Handle blank applications or missing info
      if (legacyCompletion.walkthrough?.steps?.some(step => step.type === 'input_required') && legacyCompletion.autoFillData?.needsInput?.length > 0) {
        setAiAnalysisResult(legacyCompletion)
        setShowMissingInfo(true)
        setStep('missing_info')
        try {
          toast?.info?.('Additional information needed for optimal completion.')
        } catch (toastError) {
          console.log('ℹ️ Additional information needed for optimal completion.')
        }
      } else {
        try {
          toast?.success?.('Enhanced form analysis complete!')
        } catch (toastError) {
          console.log('✅ Enhanced form analysis complete!')
        }
      }

    } catch (error) {
      console.error('Enhanced form completion failed:', error)
      try {
        toast?.error?.('Failed to analyze form: ' + error.message)
      } catch (toastError) {
        console.error('❌ Failed to analyze form:', error.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  // Enhanced download with better document generation
  const handleDownloadApplication = async () => {
    try {
      setProcessing(true)
      
      const project = projects.find(p => p.id === selectedProject)
      
      if (!enhancedFormStructure) {
        toast.error('No enhanced form structure available for generation')
        return
      }

      console.log('📥 Generating enhanced application document:', {
        formType: enhancedFormStructure.formMetadata?.detectedFormType,
        totalFields: Object.keys(enhancedFormStructure.dataFields || {}).length + 
                    Object.keys(enhancedFormStructure.narrativeFields || {}).length,
        projectName: project?.name || 'Unknown',
        filledFormFields: Object.keys(filledForm).length
      })

      // Convert enhanced form structure to export API format
      const exportFormStructure = {
        formTitle: enhancedFormStructure.formMetadata?.detectedFormType || project?.name || 'Application Form',
        fields: [
          // Convert data fields to field array
          ...Object.entries(enhancedFormStructure.dataFields || {}).map(([id, fieldConfig]) => ({
            id,
            label: fieldConfig.label || id.replace(/_/g, ' '),
            type: fieldConfig.type || 'text',
            ...fieldConfig
          })),
          // Convert narrative fields to field array
          ...Object.entries(enhancedFormStructure.narrativeFields || {}).map(([id, fieldConfig]) => ({
            id,
            label: fieldConfig.question || fieldConfig.label || id.replace(/_/g, ' '),
            type: 'textarea',
            ...fieldConfig
          }))
        ],
        sections: enhancedFormStructure.sections || []
      }

      // Call enhanced document generation API (now form export)
      const response = await fetch('/api/form/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure: exportFormStructure,
          completedData: filledForm, // Send filledForm directly instead of nested structure
          exportFormat: 'pdf',
          options: {
            includeEmptyFields: true,
            addInstructions: true,
            format: 'pdf',
            enhancedGeneration: true,
            preserveStructure: true
          }
        })
      })

      if (!response.ok) {
        throw new Error('Enhanced generation API failed')
      }

      const result = await response.json()
      if (result.success) {
        // Handle the new export API response format
        const exportData = result.data
        
        if (exportData.format === 'pdf' && exportData.data) {
          // Convert data URL to blob and download
          const dataUrl = exportData.data
          const base64Data = dataUrl.split(',')[1]
          const binaryData = atob(base64Data)
          const bytes = new Uint8Array(binaryData.length)
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: exportData.mimeType || 'application/pdf' })
          
          // Create download link
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = exportData.filename || `enhanced-${enhancedFormStructure.formMetadata?.detectedFormType || 'application'}-${project?.name || 'document'}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          
          toast.success('Enhanced application document downloaded successfully!')
        } else {
          throw new Error('Unsupported export format or missing data')
        }
      } else {
        throw new Error(result.message || 'Enhanced generation failed')
      }
      
    } catch (error) {
      console.error('Enhanced download error:', error)
      toast.error('Failed to download enhanced application: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // Updated analysis step rendering with enhanced structure display
  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <Brain className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Enhanced Document Analysis Complete</h3>
        <p className="text-slate-600">AI has performed enhanced analysis with structure recognition and field categorization</p>
      </div>

      {documentAnalysis && (
        <div className="bg-slate-50 rounded-lg p-6 space-y-4">
          <h4 className="font-medium text-slate-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-emerald-600" />
            Enhanced Analysis Results:
          </h4>
          {documentAnalysis.map((doc, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-slate-900">{doc.fileName}</h5>
                <div className="flex items-center space-x-2">
                  {doc.analysis.error ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">Failed</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-emerald-600">Enhanced Analysis</span>
                    </>
                  )}
                </div>
              </div>
              
              {!doc.analysis.error && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <div className="font-medium text-slate-900">{doc.analysis.detectedFormType || doc.analysis.documentType || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Data Fields:</span>
                    <div className="font-medium text-emerald-600">{Object.keys(doc.analysis.dataFields || {}).length}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Narrative Fields:</span>
                    <div className="font-medium text-purple-600">{Object.keys(doc.analysis.narrativeFields || {}).length}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Confidence:</span>
                    <div className="font-medium text-emerald-600">{Math.round((doc.analysis.extractionConfidence || 0) * 100)}%</div>
                  </div>
                </div>
              )}

              {doc.analysis.error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  <strong>Error:</strong> {doc.analysis.error}
                </div>
              )}

              {doc.analysis.documentSections && doc.analysis.documentSections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Document Sections:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.analysis.documentSections.slice(0, 5).map((section, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800">
                        {section.title}
                      </span>
                    ))}
                    {doc.analysis.documentSections.length > 5 && (
                      <span className="text-xs text-slate-500">+{doc.analysis.documentSections.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('upload')}
          className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Upload
        </button>
        <button
          onClick={handleFormCompletion}
          disabled={processing || !documentAnalysis?.some(doc => !doc.analysis.error)}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          <span>{processing ? 'Processing...' : 'Generate Enhanced Completion'}</span>
        </button>
      </div>
    </div>
  )

  // Enhanced completion step rendering
  const renderCompletionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Enhanced Form Completion Ready</h3>
        <p className="text-slate-600">AI has analyzed and intelligently pre-filled your application with structure recognition</p>
      </div>

      {formCompletion && (
        <div className="bg-emerald-50 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {formCompletion.completionPercentage || 0}%
              </div>
              <div className="text-sm text-slate-600">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((formCompletion.confidence || 0) * 100)}%
              </div>
              <div className="text-sm text-slate-600">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {enhancedFormStructure?.formMetadata?.totalFields || 0}
              </div>
              <div className="text-sm text-slate-600">Fields Found</div>
            </div>
          </div>
          
          {/* Enhanced field completion breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center mb-2">
                <Target className="w-4 h-4 mr-2 text-blue-600" />
                <h5 className="font-medium text-slate-900">Data Fields</h5>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(formCompletion.dataFieldCompletions || {}).length}
              </div>
              <div className="text-sm text-slate-600">Completed automatically</div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center mb-2">
                <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
                <h5 className="font-medium text-slate-900">Narrative Fields</h5>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(formCompletion.narrativeFieldCompletions || {}).length}
              </div>
              <div className="text-sm text-slate-600">Generated intelligently</div>
            </div>
          </div>
          
          {Object.keys(filledForm).length > 0 && (
            <div className="space-y-4">
              {/* Progress Gamification */}
              <ProgressGamification 
                completionPercentage={completionPercentage}
                fieldsCompleted={Object.values(filledForm).filter(value => value && value.toString().trim().length > 0).length}
                totalFields={Object.keys(filledForm).length}
              />
              
              {/* Deadline Context */}
              <DeadlineContext 
                deadline={applicationDeadline} 
                completionPercentage={completionPercentage} 
              />
              
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-slate-900">Edit Application Fields:</h4>
                <span className="text-sm text-slate-500">{Object.keys(filledForm).length} fields detected</span>
              </div>
              <div className="relative">
                <div className="max-h-[400px] overflow-y-auto space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50" id="form-fields-container">
                  {Object.entries(filledForm).map(([field, value]) => {
                    const fieldContext = createEnhancedFieldContext(field, value)
                    const validation = validateFieldInRealTime(field, value || '', fieldContext)
                    const suggestions = generateContextualSuggestions(field, filledForm, projects.find(p => p.id === selectedProject), userProfile)
                    
                    return (
                      <div key={field} className="bg-white rounded-md p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700 capitalize">
                            {field.replace(/_/g, ' ')}:
                            {fieldContext.isRequired && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                console.log('🔧 Enhanced WALI-OS Help clicked for field:', field)
                                
                                const enhancedContext = createEnhancedFieldContext(field, value)
                                handleFieldFocus(field)
                                setAssistantContext({
                                  ...enhancedContext,
                                  specificQuestion: generateSpecificQuestion(field, enhancedContext),
                                  actionableHelp: true
                                })
                                
                                console.log('🎯 Enhanced context created:', enhancedContext)
                                setShowWaliOSAssistant(true)
                              }}
                              className="text-xs px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded flex items-center gap-1 transition-colors"
                              title="Get WALI-OS help with this field"
                            >
                              <Brain className="w-3 h-3" />
                              WALI-OS Help
                            </button>
                          </div>
                        </div>
                        
                        {/* Contextual suggestions */}
                        {suggestions.length > 0 && (
                          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-xs font-medium text-blue-900 mb-1">Smart suggestions:</div>
                            {suggestions.map((suggestion, idx) => (
                              <div key={idx} className="text-xs mb-1 last:mb-0">
                                <button
                                  onClick={() => setFilledForm(prev => ({ ...prev, [field]: suggestion.value }))}
                                  className="text-blue-600 hover:text-blue-800 underline mr-1"
                                >
                                  {suggestion.label}
                                </button>
                                <span className="text-slate-600">- {suggestion.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {field.toLowerCase().includes('description') || 
                         field.toLowerCase().includes('narrative') ||
                         field.toLowerCase().includes('summary') ||
                         field.toLowerCase().includes('statement') ||
                         field.toLowerCase().includes('objective') ||
                         field.toLowerCase().includes('plan') ||
                         field.toLowerCase().includes('approach') ||
                         (typeof value === 'string' && value.length > 100) ? (
                          <div>
                            <textarea
                              value={value || ''}
                              onChange={(e) => {
                                setFilledForm(prev => ({ ...prev, [field]: e.target.value }))
                                setUnsavedChanges(true)
                              }}
                              onFocus={() => handleFieldFocus(field)}
                              onBlur={() => handleFieldBlur(field)}
                              className="w-full p-3 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                              rows={4}
                              placeholder={`Enter ${field.replace(/_/g, ' ').toLowerCase()}...`}
                            />
                            {fieldContext.wordLimit && (
                              <div className="text-xs text-slate-500 mt-1">
                                {(value || '').length}/{fieldContext.wordLimit} characters
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type={field.toLowerCase().includes('amount') || field.toLowerCase().includes('budget') || field.toLowerCase().includes('funding') ? 'number' : 
                                  field.toLowerCase().includes('date') || field.toLowerCase().includes('deadline') ? 'date' : 
                                  field.toLowerCase().includes('email') ? 'email' : 
                                  field.toLowerCase().includes('phone') ? 'tel' : 'text'}
                            value={value || ''}
                            onChange={(e) => {
                              setFilledForm(prev => ({ ...prev, [field]: e.target.value }))
                              setUnsavedChanges(true)
                            }}
                            onFocus={() => handleFieldFocus(field)}
                            onBlur={() => handleFieldBlur(field)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder={`Enter ${field.replace(/_/g, ' ').toLowerCase()}...`}
                          />
                        )}
                        
                        {/* Real-time validation */}
                        {(validation.warnings.length > 0 || validation.suggestions.length > 0) && (
                          <div className="mt-2">
                            {validation.warnings.map((warning, idx) => (
                              <div key={idx} className="text-xs text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {warning}
                              </div>
                            ))}
                            {validation.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="text-xs text-blue-700 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Error prevention */}
                        <ErrorPrevention fieldName={field} value={value} allFormData={filledForm} />
                        
                        {/* Content Library for reusing past content */}
                        <ContentLibrary 
                          userApplicationHistory={customerData?.userApplicationHistory || []}
                          currentField={field}
                          onApplyContent={(content) => setFilledForm(prev => ({ ...prev, [field]: content }))}
                        />
                      </div>
                    )
                  })}
                  {Object.keys(filledForm).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No form fields detected. Please upload a document and run analysis first.</p>
                    </div>
                  )}
                </div>
                {/* Scroll indicator for many fields */}
                {Object.keys(filledForm).length > 5 && (
                  <div className="absolute bottom-2 right-2 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        const container = document.getElementById('form-fields-container')
                        if (container) {
                          container.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                      className="bg-blue-600 text-white p-1 rounded shadow-lg hover:bg-blue-700 transition-colors text-xs"
                      title="Scroll to top"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => {
                        const container = document.getElementById('form-fields-container')
                        if (container) {
                          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
                        }
                      }}
                      className="bg-blue-600 text-white p-1 rounded shadow-lg hover:bg-blue-700 transition-colors text-xs"
                      title="Scroll to bottom"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
              
              {/* Save Status Indicator */}
              <div className="flex justify-between items-center mt-4">
                <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
                <div className="text-xs text-slate-500">
                  Auto-save {unsavedChanges ? 'pending...' : 'up to date'}
                </div>
              </div>
              
              {/* Application Preview */}
              <ApplicationPreview formData={filledForm} formStructure={enhancedFormStructure} />
            </div>
          )}
        </div>
      )}

      {missingQuestions.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center">
            <HelpCircle className="w-4 h-4 mr-2 text-amber-600" />
            Additional Information Needed
          </h4>
          <p className="text-sm text-slate-600 mb-3">
            Answer these questions to enhance your application:
          </p>
          <div className="space-y-3">
            {missingQuestions.slice(0, 3).map((question, index) => (
              <div key={question.id || index} className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {question.question}
                </label>
                <input
                  type="text"
                  placeholder="Enter your answer..."
                  onChange={(e) => handleQuestionAnswer(question.id, e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-4 pt-4 border-t border-slate-200 bg-white sticky bottom-0">
        <button
          onClick={() => setStep('analyze')}
          className="py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Analysis
        </button>
        <button
          onClick={handleDownloadApplication}
          disabled={processing || !enhancedFormStructure}
          className="py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{processing ? 'Generating...' : 'Download Application'}</span>
        </button>
        <button
          onClick={() => setStep('review')}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Edit className="w-5 h-5" />
          <span>Review & Submit</span>
        </button>
      </div>
    </div>
  )

  // Enhanced review step with better structure display
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Save className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Review Enhanced Application</h3>
        <p className="text-slate-600">Final review of your AI-enhanced application</p>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 space-y-6">
        <h4 className="font-medium text-slate-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          Application Summary:
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Project:</span>
            <div className="font-medium text-slate-900">
              {projects.find(p => p.id === selectedProject)?.name || projects.find(p => p.id === selectedProject)?.title || 'Unknown Project'}
            </div>
          </div>
          <div>
            <span className="text-slate-600">Funding Amount:</span>
            <div className="font-medium text-slate-900">
              ${formatFundingAmount()}
            </div>
          </div>
          <div>
            <span className="text-slate-600">Documents Analyzed:</span>
            <div className="font-medium text-slate-900">{documentAnalysis?.length || 0}</div>
          </div>
          <div>
            <span className="text-slate-600">Overall Completion:</span>
            <div className="font-medium text-slate-900">{formCompletion?.completionPercentage || 0}%</div>
          </div>
          <div>
            <span className="text-slate-600">Form Type:</span>
            <div className="font-medium text-slate-900">{enhancedFormStructure?.formMetadata?.detectedFormType || 'Unknown'}</div>
          </div>
          <div>
            <span className="text-slate-600">Complexity:</span>
            <div className="font-medium text-slate-900 capitalize">{enhancedFormStructure?.ocrStats?.documentComplexity || 'Unknown'}</div>
          </div>
        </div>

        {/* Enhanced structure breakdown */}
        {enhancedFormStructure && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h5 className="font-medium text-slate-900 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
              Enhanced Structure Analysis
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center bg-blue-50 rounded p-3">
                <div className="text-xl font-bold text-blue-600">
                  {Object.keys(enhancedFormStructure.dataFields || {}).length}
                </div>
                <div className="text-sm text-slate-600">Data Fields</div>
              </div>
              <div className="text-center bg-purple-50 rounded p-3">
                <div className="text-xl font-bold text-purple-600">
                  {Object.keys(enhancedFormStructure.narrativeFields || {}).length}
                </div>
                <div className="text-sm text-slate-600">Narrative Fields</div>
              </div>
              <div className="text-center bg-emerald-50 rounded p-3">
                <div className="text-xl font-bold text-emerald-600">
                  {enhancedFormStructure.formMetadata?.sectionsFound || 0}
                </div>
                <div className="text-sm text-slate-600">Sections Found</div>
              </div>
            </div>

            {/* Sample fields display */}
            <div className="space-y-3">
              {Object.keys(enhancedFormStructure.dataFields || {}).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-slate-700 mb-2">Sample Data Fields:</h6>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enhancedFormStructure.dataFields).slice(0, 6).map(([fieldId, fieldConfig]) => (
                      <span key={fieldId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {fieldConfig.label || fieldId.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {Object.keys(enhancedFormStructure.dataFields).length > 6 && (
                      <span className="text-xs text-slate-500 self-center">
                        +{Object.keys(enhancedFormStructure.dataFields).length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {Object.keys(enhancedFormStructure.narrativeFields || {}).length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-slate-700 mb-2">Sample Narrative Fields:</h6>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enhancedFormStructure.narrativeFields).slice(0, 4).map(([fieldId, fieldConfig]) => (
                      <span key={fieldId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        {fieldConfig.question?.substring(0, 30) || fieldId.replace(/_/g, ' ')}...
                      </span>
                    ))}
                    {Object.keys(enhancedFormStructure.narrativeFields).length > 4 && (
                      <span className="text-xs text-slate-500 self-center">
                        +{Object.keys(enhancedFormStructure.narrativeFields).length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion status */}
        {filledForm && Object.keys(filledForm).length > 0 && (
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
            <h5 className="font-medium text-slate-900 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              AI Completion Status
            </h5>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-emerald-600">
                  {Object.keys(filledForm).filter(key => filledForm[key] && filledForm[key] !== '[To be completed]').length}
                </div>
                <div className="text-sm text-slate-600">Fields Completed</div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">
                  {Object.keys(filledForm).filter(key => !filledForm[key] || filledForm[key] === '[To be completed]').length}
                </div>
                <div className="text-sm text-slate-600">Fields Pending</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep('complete')}
          className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to Edit
        </button>
        <button
          onClick={handleDownloadApplication}
          disabled={processing || !enhancedFormStructure}
          className="py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          <span>{processing ? 'Generating...' : 'Download Enhanced App'}</span>
        </button>
        <button
          onClick={handleFinalSubmit}
          className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Submit Application</span>
        </button>
      </div>
    </div>
  )

  // Enhanced upload step (keep existing but add enhanced indicators)
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
          <Scan className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Application Documents</h3>
        <p className="text-slate-600">Upload forms for enhanced AI analysis with structure recognition and intelligent field categorization</p>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">Select Project *</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Choose a project...</option>
          {(projects || []).filter(project => project && project.id).map(project => (
            <option key={project.id} value={project.id}>
              {project.name || project.title || 'Untitled Project'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2 block">
          Upload Application Forms
        </label>
        
        {uploadedFiles.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-all">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={!selectedProject || processing}
            />
            <label 
              htmlFor="file-upload" 
              className={`cursor-pointer ${!selectedProject || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-slate-900 mb-2">
                Drop files here or click to upload
              </h4>
              <p className="text-slate-600">
                Supports PDF, Word documents, and text files
              </p>
              <p className="text-xs text-emerald-600 mt-2">
                Enhanced AI will analyze structure, categorize fields, and extract requirements
              </p>
            </label>
          </div>
        ) : (
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-medium text-emerald-900">Documents Uploaded</h4>
              </div>
              <div className="text-sm text-emerald-700">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-md p-3 border border-emerald-100">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-900">{file.name}</span>
                    <span className="text-xs text-slate-500">({Math.round(file.size / 1024)}KB)</span>
                  </div>
                  <div className="text-xs text-emerald-600">Ready for analysis</div>
                </div>
              ))}
            </div>
            
            {/* Option to upload additional files */}
            <div className="pt-3 border-t border-emerald-200">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="additional-file-upload"
                disabled={!selectedProject || processing}
              />
              <label 
                htmlFor="additional-file-upload" 
                className="flex items-center justify-center space-x-2 text-sm text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add more documents</span>
              </label>
            </div>
          </div>
        )}
        
        {/* Upload Progress Bar */}
        {processing && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                {currentFileName ? `Enhanced analysis: ${currentFileName}` : 'Processing with enhanced AI...'}
              </span>
              <span className="text-sm text-blue-600">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-600 mt-2">Enhanced AI is analyzing structure and categorizing fields...</p>
          </div>
        )}
      </div>

      {!selectedProject && (
        <div className="text-center text-amber-600 text-sm">
          Please select a project before uploading documents
        </div>
      )}

      {/* Navigation buttons */}
      {uploadedFiles.length > 0 && selectedProject && !processing && (
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={() => setStep('analyze')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Proceed to Analysis</span>
          </button>
        </div>
      )}
    </div>
  )

  // Keep all other helper functions and state management the same...
  const handleQuestionAnswer = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))

    const question = missingQuestions.find(q => q.id === questionId)
    if (question) {
      setFilledForm(prev => ({
        ...prev,
        [question.field || questionId]: answer
      }))
    }
  }

  const handleInfoCollected = async (completedData) => {
    setUserAnswers(completedData.collectedInfo)
    
    const updatedForm = { ...filledForm }
    
    Object.entries(completedData.autoFillSuggestions || {}).forEach(([fieldName, suggestion]) => {
      if (suggestion.confidence > 0.8) {
        updatedForm[fieldName] = suggestion.value
      }
    })
    
    Object.entries(completedData.collectedInfo || {}).forEach(([fieldName, info]) => {
      updatedForm[fieldName] = info.answer
    })
    
    setFilledForm(updatedForm)
    setShowMissingInfo(false)
    setStep('complete')
    
    toast.success('Information collected! Your enhanced application is ready for review.')
  }

  const handleInfoCancelled = () => {
    setShowMissingInfo(false)
    setStep('analyze')
    toast.info('Info collection cancelled. You can try again when ready.')
  }

  const handleAIAnalysisModalClose = () => {
    setShowAIAnalysisModal(false)
    setAnalysisData(null)
    if (step === 'analyze') {
      setStep('complete')
    }
  }

  const handleAIDocumentAnalysisModalClose = () => {
    setShowAIDocumentAnalysisModal(false)
    setAnalysisData(null)
  }

  const handleFinalSubmit = () => {
    const fundingAmount = formatFundingAmount().replace(/,/g, '')
    
    const finalData = {
      project_id: selectedProject,
      opportunity_title: filledForm.opportunity_title || documentAnalysis?.[0]?.analysis?.title || 'AI-Enhanced Application',
      application_id: filledForm.application_id || '',
      submitted_amount: parseFloat(fundingAmount || 0),
      submission_date: new Date().toISOString().split('T')[0],
      status: 'submitted',
      notes: `Enhanced AI completion with ${formCompletion?.completionPercentage || 0}% completeness`,
      ai_completion_data: {
        completionPercentage: formCompletion?.completionPercentage,
        confidence: formCompletion?.confidence,
        analysisDate: formCompletion?.analysisDate,
        documentsAnalyzed: documentAnalysis?.length || 0,
        questionsAnswered: Object.keys(userAnswers).length,
        enhancedFeatures: {
          structureRecognition: !!enhancedFormStructure,
          fieldCategorization: true,
          narrativeExtraction: Object.keys(formCompletion?.narrativeFieldCompletions || {}).length > 0
        }
      }
    }

    onSubmit(finalData)
  }

  const formatFundingAmount = () => {
    const currentProject = projects.find(p => p.id === selectedProject)
    
    const formFundingAmount = filledForm.funding_amount || 
                             filledForm.budget_amount || 
                             filledForm.requested_amount ||
                             filledForm.amount_requested ||
                             filledForm.total_budget ||
                             filledForm.project_budget

    if (formFundingAmount && formFundingAmount !== '0' && formFundingAmount !== 0) {
      return Number(formFundingAmount).toLocaleString()
    }
    
    const projectFunding = currentProject?.funding_needed || 
                          currentProject?.total_project_budget || 
                          currentProject?.funding_request_amount ||
                          currentProject?.budget_amount

    if (projectFunding && projectFunding !== 0) {
      return Number(projectFunding).toLocaleString()
    }
    
    if (formCompletion?.amountMax && formCompletion.amountMax > 0) {
      return Number(formCompletion.amountMax).toLocaleString()
    }
    
    if (formCompletion?.amountMin && formCompletion.amountMin > 0) {
      return Number(formCompletion.amountMin).toLocaleString()
    }
    
    return '0'
  }

  // Enhanced Component Definitions
  const SaveIndicator = ({ status, lastSaved }) => (
    <div className="text-xs text-slate-500 flex items-center gap-1">
      {status === 'saving' && <Loader className="w-3 h-3 animate-spin" />}
      {status === 'success' && <Check className="w-3 h-3 text-green-500" />}
      {status === 'error' && <AlertTriangle className="w-3 h-3 text-red-500" />}
      {lastSaved && `Saved ${formatTimeAgo(lastSaved)}`}
    </div>
  )

  const ErrorPrevention = ({ fieldName, value, allFormData }) => {
    const errors = detectPotentialErrors(fieldName, value, allFormData)
    
    if (errors.length === 0) return null
    
    return (
      <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded">
        <div className="text-sm font-medium text-amber-800">Potential Issues:</div>
        {errors.map((error, idx) => (
          <div key={idx} className="text-xs text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {error.message}
            {error.fix && (
              <button 
                onClick={() => error.fix()}
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                Fix this
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  const ProgressGamification = ({ completionPercentage, fieldsCompleted, totalFields }) => {
    const achievements = calculateAchievements(completionPercentage, fieldsCompleted)
    
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Application Progress</div>
          <div className="text-sm text-slate-600">{fieldsCompleted}/{totalFields} fields</div>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {achievements.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {achievements.map(achievement => (
              <div key={achievement.id} className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                <Star className="w-3 h-3" />
                {achievement.name}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-slate-600 mt-2">
          Next: {getNextMilestone(completionPercentage)}
        </div>
      </div>
    )
  }

  const ApplicationPreview = ({ formData, formStructure }) => {
    if (!showPreview) return null
    
    return (
      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">Preview: How Funders Will See This</h4>
          <div className="flex items-center gap-2">
            <select 
              value={previewMode} 
              onChange={(e) => setPreviewMode(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="funder">Funder's View</option>
              <option value="print">Print Version</option>
            </select>
            <button 
              onClick={() => setShowPreview(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded border max-h-64 overflow-y-auto p-3">
          {Object.entries(formData).map(([field, value]) => (
            <div key={field} className="mb-2 border-b pb-2">
              <div className="text-xs font-medium text-slate-600">
                {formStructure?.dataFields?.[field]?.label || field.replace(/_/g, ' ')}
              </div>
              <div className="text-sm">
                {value || <span className="text-red-400 italic">Missing</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const DeadlineContext = ({ deadline, completionPercentage }) => {
    if (!deadline) return null
    
    const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    const estimatedTimeLeft = Math.ceil((100 - completionPercentage) * 0.5)
    
    if (daysLeft < 0) return null
    
    return (
      <div className={`p-3 rounded-lg mb-4 ${
        daysLeft <= 3 ? 'bg-red-50 border border-red-200' :
        daysLeft <= 7 ? 'bg-amber-50 border border-amber-200' :
        'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">
              {daysLeft} days until deadline
            </div>
            <div className="text-sm text-slate-600">
              Estimated {estimatedTimeLeft} hours remaining
            </div>
          </div>
          {daysLeft <= 7 && (
            <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
              Schedule Work Time
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Enhanced AI Application Tracker</h2>
            <SaveIndicator status={saveStatus} lastSaved={lastSaved} />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded flex items-center space-x-1"
              title="Preview application"
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            {(step !== 'upload' || uploadedFiles.length > 0) && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Save & Close</span>
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center px-6 py-4 bg-slate-50 flex-shrink-0">
          {['upload', 'analyze', 'missing_info', 'complete', 'review'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName
                  ? 'bg-emerald-600 text-white'
                  : index < ['upload', 'analyze', 'missing_info', 'complete', 'review'].indexOf(step)
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {index + 1}
              </div>
              {index < 4 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  index < ['upload', 'analyze', 'missing_info', 'complete', 'review'].indexOf(step)
                    ? 'bg-emerald-600'
                    : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 'upload' && renderUploadStep()}
              {step === 'analyze' && renderAnalysisStep()}
              {step === 'missing_info' && (
                <MissingInfoCollector
                  analysisResult={aiAnalysisResult}
                  onInfoCollected={handleInfoCollected}
                  onCancel={handleInfoCancelled}
                  userProfile={userProfile}
                  projectData={projects.find(p => p.id === selectedProject)}
                />
              )}
              {step === 'complete' && renderCompletionStep()}
              {step === 'review' && renderReviewStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Modals */}
      {showAIAnalysisModal && analysisData && (
        <AIAnalysisModal
          opportunity={analysisData.opportunity}
          project={analysisData.project}
          userProfile={analysisData.userProfile}
          quickMatchScore={analysisData.quickMatchScore}
          onClose={handleAIAnalysisModalClose}
        />
      )}

      {showAIDocumentAnalysisModal && analysisData && (
        <AIDocumentAnalysisModal
          opportunity={analysisData.opportunity}
          project={analysisData.project}
          userProfile={analysisData.userProfile}
          onClose={handleAIDocumentAnalysisModalClose}
        />
      )}
      
      {/* WALI-OS Assistant Integration */}
      <WaliOSAssistant
        isVisible={showWaliOSAssistant}
        onClose={() => {
          setShowWaliOSAssistant(false)
          setCurrentFieldForAI(null)
          setAssistantContext(null)
        }}
        userProfile={customerData?.userProfile || userProfile}
        allProjects={customerData?.allProjects || projects || []}
        opportunities={customerData?.opportunities || opportunities || []}
        submissions={customerData?.submissions || submissions || []}
        customerData={customerData}
        isProactiveMode={false}
        triggerContext={{
          trigger: 'field_help',
          context: assistantContext
        }}
        onFormUpdate={(fieldName, content) => {
          if (fieldName && content) {
            setFilledForm(prev => ({
              ...prev,
              [fieldName]: content
            }))
            toast.success(`Updated ${fieldName.replace(/_/g, ' ')}`)
          }
        }}
      />
    </div>
  )
}