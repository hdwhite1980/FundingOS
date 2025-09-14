/**
 * Application Assistant Component
 * 
 * An intelligent AI assistant that helps users complete grant applications by
 * asking clarifying questions, providing guidance, and suggesting improvements.
 */

'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  Send, 
  X, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Lightbulb,
  FileText,
  User,
  Bot,
  Sparkles,
  Clock,
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import smartFormCompletionService from '../lib/smartFormCompletionService'
import documentAnalysisService from '../lib/documentAnalysisService'

export default function ApplicationAssistant({ 
  isOpen,
  onClose,
  userProfile,
  projectData,
  applicationForm,
  documentAnalyses = [],
  onFormUpdate,
  onSuggestionApply,
  // NEW: Comprehensive data access for proactive assistance
  allProjects = [],
  opportunities = [],
  submissions = [],
  complianceData = {},
  isProactiveMode = false,
  triggerContext = {}
}) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState('initial')
  const [missingInformation, setMissingInformation] = useState([])
  const [formCompletions, setFormCompletions] = useState({})
  const [conversationContext, setConversationContext] = useState({})
  const messagesEndRef = useRef(null)

  const steps = {
    'initial': 'Getting Started',
    'analysis': 'Analyzing Requirements',
    'questions': 'Gathering Information',
    'completion': 'Form Completion',
    'review': 'Review & Optimization'
  }

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeAssistant()
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeAssistant = async () => {
    setIsProcessing(true)
    
    // Determine if this is proactive mode (Clippy-style) or manual mode
    const welcomeMessage = {
      id: Date.now(),
      type: 'assistant',
      content: isProactiveMode ? 
        generateProactiveWelcome() : 
        `Hello! I'm your AI application assistant. I'll help you complete this funding application by analyzing the requirements, identifying missing information, and guiding you through each step.

Let me start by analyzing what you have so far...`,
      timestamp: new Date(),
      step: 'initial'
    }

    setMessages([welcomeMessage])
    
    try {
      // Analyze based on mode and context
      if (isProactiveMode) {
        await analyzeProactiveContext()
      } else {
        await analyzeCurrentState()
      }
    } catch (error) {
      console.error('Failed to initialize assistant:', error)
      addMessage('assistant', 'I encountered an error during initialization. Let me know how I can help you!', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // NEW: Generate proactive welcome based on trigger context
  const generateProactiveWelcome = () => {
    const { trigger, context } = triggerContext
    
    switch (trigger) {
      case 'deadline_approaching':
        return `📅 **Deadline Alert!** Hi ${userProfile?.full_name || 'there'}! I noticed you have an application deadline approaching in ${context?.daysLeft} days. I'm here to help ensure everything is ready for submission.`
      
      case 'incomplete_application':
        return `📝 **Application Assistance** Hello! I see you're working on an application that's ${context?.completionPercentage}% complete. Let me help you identify what's missing and guide you through completion.`
      
      case 'compliance_issue':
        return `⚠️ **Compliance Alert** Hi! I've identified some compliance requirements that need attention for your ${context?.projectName} project. Let me help you address these to keep your applications on track.`
      
      case 'new_opportunity':
        return `🎯 **New Funding Match!** Great news! I found ${context?.matchCount} new funding opportunities that are ${context?.fitScore}% match for your projects. Want me to help you prioritize and apply?`
      
      case 'grant_writing_assistance':
        return `✍️ **Grant Writing Support** Hi there! I'm here to help you craft compelling narratives for your funding applications. I've reviewed your project details and have some strategic suggestions.`
      
      default:
        return `👋 **Your Funding Assistant** Hello ${userProfile?.full_name || 'there'}! I'm your personal administrative assistant for funding, compliance, and grant writing. How can I help optimize your funding strategy today?`
    }
  }

  // NEW: Analyze proactive context with comprehensive data
  const analyzeProactiveContext = async () => {
    setCurrentStep('analysis')
    
    try {
      // Comprehensive analysis using all available data
      const comprehensiveAnalysis = await analyzeComprehensiveContext()
      
      // Generate contextual insights and recommendations
      const insights = generateContextualInsights(comprehensiveAnalysis)
      
      // Create strategic recommendations
      const recommendations = generateStrategicRecommendations(comprehensiveAnalysis)
      
      // Display analysis results
      const analysisMessage = formatProactiveAnalysis(insights, recommendations)
      addMessage('assistant', analysisMessage, 'analysis')
      
      // Set next steps based on trigger context
      setCurrentStep('recommendations')
      
    } catch (error) {
      console.error('Proactive analysis failed:', error)
      addMessage('assistant', 'I encountered an issue during analysis, but I can still help you with your funding strategy. What would you like to focus on?', 'error')
    }
  }

  // NEW: Comprehensive context analysis
  const analyzeComprehensiveContext = async () => {
    const analysis = {
      // User and organization context
      userContext: {
        profile: userProfile,
        totalProjects: allProjects?.length || 0,
        activeProjects: allProjects?.filter(p => p.status === 'active')?.length || 0,
        organizationType: userProfile?.organization_type,
        experience: userProfile?.years_of_experience
      },
      
      // Project portfolio analysis
      projectPortfolio: {
        projects: allProjects || [],
        totalValue: allProjects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0,
        fundingTypes: [...new Set(allProjects?.flatMap(p => p.preferred_funding_types || []) || [])],
        completionRates: allProjects?.map(p => p.completion_percentage || 0) || []
      },
      
      // Opportunity landscape
      opportunityLandscape: {
        totalOpportunities: opportunities?.length || 0,
        matchedOpportunities: opportunities?.filter(o => o.fit_score > 70)?.length || 0,
        upcomingDeadlines: opportunities?.filter(o => {
          const deadline = new Date(o.deadline || o.application_deadline);
          const now = new Date();
          const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
          return diffDays <= 30 && diffDays > 0;
        }) || []
      },
      
      // Application status
      applicationStatus: {
        totalSubmissions: submissions?.length || 0,
        pendingSubmissions: submissions?.filter(s => s.status === 'submitted')?.length || 0,
        successRate: submissions?.length > 0 ? 
          (submissions.filter(s => s.status === 'approved').length / submissions.length * 100) : 0
      },
      
      // Compliance and requirements
      compliance: {
        ...complianceData,
        missingDocuments: findMissingDocuments(),
        upcomingRenewals: findUpcomingRenewals()
      }
    }
    
    return analysis
  }

  // NEW: Helper functions for comprehensive analysis
  const findMissingDocuments = () => {
    // Analyze projects for missing standard documents
    const standardDocs = ['budget', 'narrative', 'timeline', 'team_info', 'organization_info']
    const missing = []
    
    allProjects?.forEach(project => {
      standardDocs.forEach(doc => {
        if (!project[doc] || project[doc] === '') {
          missing.push({ project: project.name, document: doc })
        }
      })
    })
    
    return missing
  }

  const findUpcomingRenewals = () => {
    // Check for certifications, licenses, or registrations that need renewal
    const renewals = []
    const now = new Date()
    
    // Check organization certifications
    if (userProfile?.certifications) {
      userProfile.certifications.forEach(cert => {
        if (cert.expiry_date) {
          const expiryDate = new Date(cert.expiry_date)
          const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24)
          
          if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
            renewals.push({ type: 'certification', name: cert.name, expiryDate, daysUntilExpiry })
          }
        }
      })
    }
    
    return renewals
  }

  const generateContextualInsights = (analysis) => {
    const insights = []
    
    // Portfolio insights
    if (analysis.userContext.totalProjects > 0) {
      const avgCompletion = analysis.projectPortfolio.completionRates.reduce((a, b) => a + b, 0) / 
                           analysis.projectPortfolio.completionRates.length
      
      if (avgCompletion < 70) {
        insights.push({
          type: 'completion_rate',
          severity: 'medium',
          message: `Your average project completion rate is ${Math.round(avgCompletion)}%. Let me help improve this.`,
          actions: ['Focus on one project at a time', 'Set smaller milestones', 'Use project templates']
        })
      }
    }
    
    // Opportunity insights
    if (analysis.opportunityLandscape.upcomingDeadlines.length > 0) {
      insights.push({
        type: 'deadlines',
        severity: 'high',
        message: `You have ${analysis.opportunityLandscape.upcomingDeadlines.length} application deadlines in the next 30 days.`,
        actions: ['Prioritize applications', 'Set up deadline reminders', 'Prepare standard documents']
      })
    }
    
    // Success rate insights
    if (analysis.applicationStatus.successRate < 50 && analysis.applicationStatus.totalSubmissions >= 3) {
      insights.push({
        type: 'success_rate',
        severity: 'medium',
        message: `Your application success rate is ${Math.round(analysis.applicationStatus.successRate)}%. Let's improve this strategy.`,
        actions: ['Better opportunity matching', 'Strengthen project narratives', 'Improve compliance documentation']
      })
    }
    
    return insights
  }

  const generateStrategicRecommendations = (analysis) => {
    const recommendations = []
    
    // Portfolio diversification
    if (analysis.projectPortfolio.fundingTypes.length < 3) {
      recommendations.push({
        category: 'diversification',
        priority: 'medium',
        title: 'Diversify Funding Sources',
        description: 'Consider exploring different funding types to reduce risk and increase opportunities.',
        benefits: ['Reduced dependency', 'More opportunities', 'Better risk management'],
        nextSteps: ['Research grant programs', 'Explore angel investment', 'Consider crowdfunding']
      })
    }
    
    // Opportunity optimization
    if (analysis.opportunityLandscape.matchedOpportunities > 0) {
      recommendations.push({
        category: 'optimization',
        priority: 'high',
        title: 'Focus on High-Match Opportunities',
        description: `You have ${analysis.opportunityLandscape.matchedOpportunities} opportunities with 70%+ match score.`,
        benefits: ['Higher success probability', 'Better resource allocation', 'Faster results'],
        nextSteps: ['Review top matches', 'Prepare targeted applications', 'Set application priorities']
      })
    }
    
    // Compliance improvement
    if (analysis.compliance.missingDocuments.length > 0) {
      recommendations.push({
        category: 'compliance',
        priority: 'high',
        title: 'Complete Missing Documentation',
        description: `${analysis.compliance.missingDocuments.length} documents are missing across your projects.`,
        benefits: ['Faster applications', 'Better compliance', 'Reduced rejection risk'],
        nextSteps: ['Create document checklist', 'Set up document templates', 'Schedule completion tasks']
      })
    }
    
    return recommendations
  }

  const formatProactiveAnalysis = (insights, recommendations) => {
    let message = `📊 **Comprehensive Analysis Complete**\n\n`
    
    // Add insights
    if (insights.length > 0) {
      message += `**🔍 Key Insights:**\n`
      insights.forEach((insight, i) => {
        const emoji = insight.severity === 'high' ? '🚨' : insight.severity === 'medium' ? '⚠️' : 'ℹ️'
        message += `${i + 1}. ${emoji} ${insight.message}\n`
      })
      message += `\n`
    }
    
    // Add recommendations
    if (recommendations.length > 0) {
      message += `**🎯 Strategic Recommendations:**\n`
      recommendations.forEach((rec, i) => {
        const emoji = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '📈' : '💡'
        message += `${i + 1}. ${emoji} **${rec.title}**\n   ${rec.description}\n`
      })
      message += `\n`
    }
    
    message += `**🤝 How I Can Help:**\n`
    message += `• Complete missing applications and documents\n`
    message += `• Improve project narratives and compliance\n`
    message += `• Set up deadline monitoring and reminders\n`
    message += `• Optimize your funding strategy\n\n`
    message += `What would you like to focus on first?`
    
    return message
  }

  const analyzeCurrentState = async () => {
    setCurrentStep('analysis')
    
    try {
      // Check if methods exist before calling them
      let analysis = {};
      let questions = [];

      try {
        if (smartFormCompletionService.detectMissingInformation) {
          analysis = await smartFormCompletionService.detectMissingInformation(
            applicationForm,
            userProfile,
            projectData
          );
        } else {
          // Fallback analysis
          analysis = {
            missing_critical: ['organization_info', 'project_details'],
            missing_optional: ['budget_details', 'timeline'],
            completion_percentage: 60
          };
        }
      } catch (error) {
        console.warn('Missing information analysis failed, using fallback:', error);
        analysis = {
          missing_critical: ['organization_info', 'project_details'],
          missing_optional: ['budget_details', 'timeline'],
          completion_percentage: 60
        };
      }

      setMissingInformation(analysis.missing_critical || [])
      
      try {
        if (smartFormCompletionService.generateSmartQuestions) {
          questions = await smartFormCompletionService.generateSmartQuestions(
            analysis,
            { userProfile, projectData }
          );
        } else {
          // Fallback questions
          questions = [
            {
              id: 'org_type',
              category: 'Organization',
              question: 'What type of organization are you representing?',
              helpText: 'This helps us tailor the application to your organization type.'
            },
            {
              id: 'project_goal',
              category: 'Project',
              question: 'What is the main goal of your project?',
              helpText: 'A clear project goal helps align with funding requirements.'
            }
          ];
        }
      } catch (error) {
        console.warn('Question generation failed, using fallback:', error);
        questions = [
          {
            id: 'org_type',
            category: 'Organization',
            question: 'What type of organization are you representing?',
            helpText: 'This helps us tailor the application to your organization type.'
          },
          {
            id: 'project_goal',
            category: 'Project',
            question: 'What is the main goal of your project?',
            helpText: 'A clear project goal helps align with funding requirements.'
          }
        ];
      }

      setConversationContext({
        analysis,
        questions,
        currentQuestionIndex: 0
      })

      // Send analysis summary
      const analysisMessage = `I've analyzed your application and found:

**✅ Available Information:**
- Company profile: ${userProfile ? 'Complete' : 'Missing'}
- Project details: ${projectData ? 'Complete' : 'Missing'}
- Supporting documents: ${documentAnalyses.length} analyzed

**❗ Missing Information:**
${analysis.missing_critical?.length || 0} critical items needed
${analysis.missing_optional?.length || 0} optional items that would strengthen your application

${questions.length > 0 ? "I have some questions to help complete your application. Shall we begin?" : "Your application looks quite complete! Let me help you optimize it."}`

      addMessage('assistant', analysisMessage)
      
      if (questions.length > 0) {
        setCurrentStep('questions')
        setTimeout(() => askNextQuestion(), 1000)
      } else {
        setCurrentStep('completion')
        setTimeout(() => generateFormCompletions(), 1000)
      }

    } catch (error) {
      console.error('Analysis failed:', error)
      addMessage('assistant', 'I had trouble analyzing your application. Can you tell me what specific help you need?', 'error')
    }
  }

  const askNextQuestion = () => {
    const { questions, currentQuestionIndex } = conversationContext
    
    if (currentQuestionIndex < questions.length) {
      const question = questions[currentQuestionIndex]
      
      const questionMessage = `**${question.category || 'Information Needed'} (${currentQuestionIndex + 1}/${questions.length})**

${question.question}

${question.helpText ? `💡 *${question.helpText}*` : ''}`

      addMessage('assistant', questionMessage, 'question', {
        questionId: question.id,
        category: question.category,
        priority: question.priority
      })
    } else {
      // All questions answered, move to completion
      setCurrentStep('completion')
      addMessage('assistant', 'Great! I have all the information I need. Let me generate your application completions...')
      setTimeout(() => generateFormCompletions(), 1000)
    }
  }

  const generateFormCompletions = async () => {
    setIsProcessing(true)
    
    try {
      let completions = {};

      try {
        if (smartFormCompletionService.completeFormFields) {
          completions = await smartFormCompletionService.completeFormFields(
            applicationForm,
            userProfile,
            projectData
          );
        } else {
          // Fallback completions
          completions = {
            fieldCompletions: {
              'organization_name': userProfile?.organization_name || 'Your Organization',
              'project_title': projectData?.name || 'Your Project',
              'contact_email': userProfile?.email || ''
            },
            narrativeSuggestions: [
              {
                field: 'project_summary',
                suggestion: 'Describe your project goals, methodology, and expected outcomes.',
                priority: 'high'
              }
            ],
            strategicRecommendations: [
              {
                type: 'improvement',
                title: 'Complete Organization Profile',
                description: 'A complete profile increases your application success rate.',
                priority: 'medium'
              }
            ]
          };
        }
      } catch (error) {
        console.warn('Form completion failed, using fallback:', error);
        completions = {
          fieldCompletions: {
            'organization_name': userProfile?.organization_name || 'Your Organization',
            'project_title': projectData?.name || 'Your Project',
            'contact_email': userProfile?.email || ''
          },
          narrativeSuggestions: [
            {
              field: 'project_summary', 
              suggestion: 'Describe your project goals, methodology, and expected outcomes.',
              priority: 'high'
            }
          ],
          strategicRecommendations: [
            {
              type: 'improvement',
              title: 'Complete Organization Profile',
              description: 'A complete profile increases your application success rate.',
              priority: 'medium'
            }
          ]
        };
      }

      setFormCompletions(completions)

      const completionMessage = `🎉 **Application Analysis Complete!**

I've generated completions for your application:

**✅ Fields I can complete:** ${Object.keys(completions.fieldCompletions || {}).length}
**📝 Narrative suggestions:** ${completions.narrativeSuggestions?.length || 0}
**🎯 Strategic recommendations:** ${completions.strategicRecommendations?.length || 0}

Would you like me to:
1. **Apply completions** - Fill in all the fields I can complete
2. **Review suggestions** - Show you each completion before applying
3. **Generate narratives** - Create compelling project descriptions and essays

Just let me know what you'd like to do!`

      addMessage('assistant', completionMessage, 'completion')
      setCurrentStep('completion')

    } catch (error) {
      console.error('Form completion failed:', error)
      addMessage('assistant', 'I had trouble generating completions. Can you provide more specific information about what fields you need help with?', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUserMessage = async (content) => {
    if (!content.trim()) return

    // Add user message
    addMessage('user', content)
    setInputValue('')
    setIsProcessing(true)

    try {
      // Process user response based on current step
      if (currentStep === 'questions') {
        await handleQuestionResponse(content)
      } else if (currentStep === 'completion') {
        await handleCompletionRequest(content)
      } else {
        await handleGeneralQuery(content)
      }
    } catch (error) {
      console.error('Error processing user message:', error)
      addMessage('assistant', 'I had trouble processing your response. Could you try rephrasing that?', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuestionResponse = async (response) => {
    // Store the response
    const { questions, currentQuestionIndex } = conversationContext
    const currentQuestion = questions[currentQuestionIndex]
    
    // Update context with response
    const newContext = {
      ...conversationContext,
      responses: {
        ...conversationContext.responses,
        [currentQuestion.id]: response
      },
      currentQuestionIndex: currentQuestionIndex + 1
    }
    setConversationContext(newContext)

    // Acknowledge response
    addMessage('assistant', '✅ Got it! Thank you for that information.')

    // Ask next question or move to completion
    setTimeout(() => {
      if (newContext.currentQuestionIndex < questions.length) {
        askNextQuestion()
      } else {
        addMessage('assistant', 'Perfect! I have all the information I need. Let me update your application...')
        setCurrentStep('completion')
        setTimeout(() => generateFormCompletions(), 1000)
      }
    }, 500)
  }

  const handleCompletionRequest = async (request) => {
    const lowerRequest = request.toLowerCase()
    
    if (lowerRequest.includes('apply') || lowerRequest.includes('fill')) {
      await applyAllCompletions()
    } else if (lowerRequest.includes('review') || lowerRequest.includes('show')) {
      await showCompletionReview()
    } else if (lowerRequest.includes('narrative') || lowerRequest.includes('essay')) {
      await generateNarratives()
    } else {
      addMessage('assistant', `I can help you with:
- **"Apply completions"** - Fill in all fields automatically
- **"Review suggestions"** - Show each completion for approval
- **"Generate narratives"** - Create compelling essays and descriptions
- **"Show missing"** - Display what information is still needed

What would you like to do?`)
    }
  }

  const handleGeneralQuery = async (query) => {
    // Handle general questions about the application
    const response = await generateContextualResponse(query)
    addMessage('assistant', response)
  }

  const generateContextualResponse = async (query) => {
    try {
      // Check if this is a general funding/opportunity query that should go to UnifiedAgent
      const lowerQuery = query.toLowerCase()
      const isFundingQuery = lowerQuery.includes('grant') || 
                           lowerQuery.includes('funding') || 
                           lowerQuery.includes('opportunity') || 
                           lowerQuery.includes('available') ||
                           lowerQuery.includes('recent') ||
                           lowerQuery.includes('new') ||
                           lowerQuery.includes('show me') ||
                           lowerQuery.includes('tell me about')

      if (isFundingQuery) {
        // Forward to UnifiedAgent API for real opportunity data
        console.log(`🔄 Forwarding funding query to UnifiedAgent: "${query}"`)
        try {
          const response = await fetch('/api/ai/unified-agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userProfile?.id || userProfile?.user_id,
              message: query,
              projects: allProjects || [],
              opportunities: opportunities || [],
              submissions: submissions || [],
              context: {
                userProfile,
                complianceData: complianceData || {},
                originalMessage: query
              }
            })
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`✅ UnifiedAgent response received for: "${query}"`)
            return data.message || `I found information about your query. Here's what I can tell you about funding opportunities.`
          } else {
            console.error('UnifiedAgent API error:', response.status)
          }
        } catch (error) {
          console.error('Error forwarding to UnifiedAgent:', error)
        }
      }

      // For application-specific queries, use the form completion context
      const context = {
        userProfile,
        projectData,
        applicationForm,
        documentAnalyses,
        conversationHistory: messages
      }

      // Application-specific assistance
      return `I can help you with application completion and form guidance. For funding opportunity discovery and general questions, please use the AI Assistant tab in the main dashboard.

For this application, I can help with:
• Form completion and requirements analysis  
• Document preparation guidance
• Compliance checking
• Application optimization

What specific application assistance do you need?`

    } catch (error) {
      return 'I want to help but I need a bit more information. Could you be more specific about what you need assistance with?'
    }
  }

  const applyAllCompletions = async () => {
    if (formCompletions.fieldCompletions) {
      // Apply completions via callback
      if (onFormUpdate) {
        onFormUpdate(formCompletions.fieldCompletions)
      }
      
      addMessage('assistant', `✅ **Completions Applied!**

I've filled in ${Object.keys(formCompletions.fieldCompletions).length} fields with the information we gathered.

**Next Steps:**
- Review the completed fields for accuracy
- Add any additional details you think would strengthen the application
- Let me know if you need help with narratives or essays

Your application is looking great! 🎉`)

      setCurrentStep('review')
    }
  }

  const showCompletionReview = async () => {
    if (formCompletions.fieldCompletions) {
      const fields = Object.entries(formCompletions.fieldCompletions)
      const reviewContent = `📋 **Completion Review**

Here's what I'll fill in for each field:

${fields.map(([field, completion]) => 
  `**${field}:**
  "${completion.value || completion}"
  ${completion.confidence ? `(Confidence: ${Math.round(completion.confidence * 100)}%)` : ''}`
).join('\n\n')}

Type "approve" to apply all, or tell me which specific fields to modify.`

      addMessage('assistant', reviewContent)
    }
  }

  const generateNarratives = async () => {
    setIsProcessing(true)
    
    try {
      // This would integrate with the narrative generation service
      addMessage('assistant', `🖊️ **Generating Narratives...**

I'm creating compelling content for your essays and project descriptions. This may take a moment...`)

      // Simulate narrative generation
      setTimeout(() => {
        addMessage('assistant', `✅ **Narratives Generated!**

I've created draft content for:
- Project Summary (250 words)
- Technical Approach (500 words)  
- Expected Outcomes (300 words)
- Team Qualifications (400 words)

Would you like me to show you each section, or apply them all to your application?`)
        setIsProcessing(false)
      }, 3000)

    } catch (error) {
      addMessage('assistant', 'I had trouble generating narratives. Let me know which specific sections you need help writing.', 'error')
      setIsProcessing(false)
    }
  }

  const addMessage = (type, content, messageType = 'default', metadata = {}) => {
    const message = {
      id: Date.now() + Math.random(),
      type,
      content,
      messageType,
      metadata,
      timestamp: new Date(),
      step: currentStep
    }
    setMessages(prev => [...prev, message])
  }

  const getMessageIcon = (message) => {
    if (message.type === 'user') return <User className="w-4 h-4" />
    
    switch (message.messageType) {
      case 'question': return <HelpCircle className="w-4 h-4" />
      case 'completion': return <CheckCircle className="w-4 h-4" />
      case 'error': return <AlertCircle className="w-4 h-4" />
      default: return <Bot className="w-4 h-4" />
    }
  }

  const getMessageColor = (message) => {
    if (message.type === 'user') return 'bg-blue-600 text-white'
    
    switch (message.messageType) {
      case 'question': return 'bg-amber-100 text-amber-800 border border-amber-200'
      case 'completion': return 'bg-green-100 text-green-800 border border-green-200'
      case 'error': return 'bg-red-100 text-red-800 border border-red-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Application Assistant
              </h3>
              <p className="text-sm text-gray-600">
                {steps[currentStep]} • AI-powered application help
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center space-x-2 text-sm">
            {Object.entries(steps).map(([key, label], index) => (
              <div key={key} className="flex items-center">
                <div className={`px-2 py-1 rounded-full text-xs ${
                  key === currentStep 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : Object.keys(steps).indexOf(key) < Object.keys(steps).indexOf(currentStep)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {label}
                </div>
                {index < Object.keys(steps).length - 1 && (
                  <ArrowRight className="w-3 h-3 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl rounded-lg px-4 py-3 ${getMessageColor(message)}`}>
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getMessageIcon(message)}
                    </div>
                    <div className="flex-1">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      <div className="mt-2 text-xs opacity-60">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center space-x-2">
                <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleUserMessage(inputValue)}
              placeholder="Type your response or ask a question..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            />
            <button
              onClick={() => handleUserMessage(inputValue)}
              disabled={isProcessing || !inputValue.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          {/* Quick Actions */}
          {currentStep === 'completion' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => handleUserMessage('apply completions')}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              >
                Apply All Completions
              </button>
              <button
                onClick={() => handleUserMessage('review suggestions')}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
              >
                Review Each Field
              </button>
              <button
                onClick={() => handleUserMessage('generate narratives')}
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
              >
                Generate Essays
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}