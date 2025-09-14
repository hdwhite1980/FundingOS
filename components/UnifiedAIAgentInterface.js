// components/UnifiedAIAgentInterface.js
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  MessageSquare, 
  Target, 
  Zap, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Send,
  Lightbulb,
  AlertTriangle,
  Activity,
  BarChart3,
  Search,
  FileText,
  Users,
  DollarSign,
  Calendar
} from 'lucide-react'
import { resolveApiUrl } from '../lib/apiUrlUtils'

export default function UnifiedAIAgentInterface({ user, userProfile, projects, opportunities }) {
  const [agent, setAgent] = useState(null)
  const [agentStatus, setAgentStatus] = useState('initializing')
  const [currentStrategy, setCurrentStrategy] = useState(null)
  const [activeGoals, setActiveGoals] = useState([])
  const [recentDecisions, setRecentDecisions] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [performanceMetrics, setPerformanceMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const chatEndRef = useRef(null)

  useEffect(() => {
    initializeUnifiedAgent()
    
    // Set up periodic updates
    const updateInterval = setInterval(() => {
      refreshAgentData()
    }, 30000) // Every 30 seconds

    return () => clearInterval(updateInterval)
  }, [user.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const initializeUnifiedAgent = async () => {
    try {
      setLoading(true)
      console.log(`🤖 Initializing Unified AI Agent for user ${user.id}`)
      
      const response = await fetch(resolveApiUrl('/api/ai/unified-agent/initialize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          userProfile,
          projects,
          opportunities 
        })
      })
      
      if (response.ok) {
        const agentData = await response.json()
        setAgent(agentData)
        setAgentStatus('active')
        setCurrentStrategy(agentData.strategy)
        
        // Load comprehensive agent data
        await refreshAgentData()

        // Load previous chat session if exists
        const hadPreviousSession = await loadChatSessionInternal(agentData)
        
      } else {
        throw new Error('Failed to initialize unified agent')
      }
      
    } catch (error) {
      console.error('Error initializing unified agent:', error)
      setAgentStatus('error')
      
      setChatMessages([{
        type: 'agent',
        content: `I encountered an issue during initialization. Please try refreshing the page or contact support if the issue persists.`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const saveChatMessageInternal = async (messageType, content, metadata = {}) => {
    try {
      const response = await fetch(resolveApiUrl('/api/chat/save-message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, // Pass user ID directly
          messageType,
          content,
          metadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        // If it's an authentication error, just log it but don't break the chat
        if (response.status === 401) {
          console.log('Chat message not saved - user not authenticated:', errorData.message || errorData.error)
          return // Silently fail for unauthenticated users
        }
        console.error('Error saving chat message:', errorData)
      }
    } catch (error) {
      console.error('Error saving chat message:', error)
      // Don't block UI for save failures
    }
  }

  const loadChatSessionInternal = async (agentData) => {
    try {
      const response = await fetch(resolveApiUrl(`/api/chat/load-session?userId=${user.id}`))
      if (response.ok) {
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          setChatMessages(data.messages)
          return true // Had previous session
        }
      } else if (response.status === 401) {
        // User not authenticated - just continue without loading previous session
        console.log('No previous session loaded - user not authenticated')
      }
    } catch (error) {
      console.error('Error loading chat session:', error)
    }
    
    // No previous session, create welcome messages
    const welcomeMessages = [{
      type: 'agent',
      content: `Hello ${userProfile?.full_name || 'there'}! I'm your Unified Funding Agent. I'm now managing your complete funding ecosystem - from opportunity discovery to application generation to deadline monitoring. How can I help optimize your funding strategy today?`,
      timestamp: new Date()
    }]

    // Add strategy context if available
    if (agentData.strategy && agentData.strategy !== 'Developing strategy') {
      welcomeMessages.push({
        type: 'agent',
        content: `📋 **Current Strategy Overview:** ${agentData.strategy}`,
        timestamp: new Date(),
        isStrategyContext: true
      })
    }

    setChatMessages(welcomeMessages)
    
    // Save welcome messages to session
    for (const message of welcomeMessages) {
      await saveChatMessageInternal('agent', message.content, {
        isStrategyContext: message.isStrategyContext
      })
    }
    
    return false // No previous session
  }

  const refreshAgentData = async () => {
    try {
      const [statusRes, goalsRes, decisionsRes, metricsRes] = await Promise.allSettled([
        fetch(resolveApiUrl(`/api/ai/unified-agent/status?userId=${user.id}`)),
        fetch(resolveApiUrl(`/api/ai/unified-agent/goals?userId=${user.id}`)),
        fetch(resolveApiUrl(`/api/ai/unified-agent/decisions?userId=${user.id}&limit=10`)),
        fetch(resolveApiUrl(`/api/ai/unified-agent/metrics?userId=${user.id}`))
      ])

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const status = await statusRes.value.json()
        setAgent(prevAgent => ({ ...prevAgent, ...status }))
        if (status.strategy) setCurrentStrategy(status.strategy)
      }
      
      if (goalsRes.status === 'fulfilled' && goalsRes.value.ok) {
        const goals = await goalsRes.value.json()
        setActiveGoals(goals)
      }

      if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) {
        const decisions = await decisionsRes.value.json()
        setRecentDecisions(decisions)
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const metrics = await metricsRes.value.json()
        setPerformanceMetrics(metrics)
      }

    } catch (error) {
      console.error('Error refreshing agent data:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage = { type: 'user', content: newMessage, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMessage])
    
    // Save user message to session
    await saveChatMessageInternal('user', userMessage.content)
    
    const messageContent = newMessage
    setNewMessage('')
    setIsTyping(true)

    // Check if this might trigger a web search
    const mightSearch = detectSearchIntent(messageContent)
    if (mightSearch) {
      setIsSearching(true)
    }

    try {
      const response = await fetch(resolveApiUrl('/api/ai/unified-agent/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          message: messageContent,
          projects,
          opportunities
        })
      })

      if (response.ok) {
        const data = await response.json()
        const agentMessage = { 
          type: 'agent', 
          content: data.message,
          timestamp: new Date() 
        }
        setChatMessages(prev => [...prev, agentMessage])
        
        // Save agent message to session
        await saveChatMessageInternal('agent', data.message)
        
        // Handle web search results if returned
        if (data.webSearchResults && data.webSearchPerformed) {
          setTimeout(() => {
            const searchNotification = {
              type: 'system',
              content: `🔍 Discovered ${data.webSearchResults.opportunitiesFound || 0} new opportunities from web search`,
              timestamp: new Date(),
              isSearchResult: true
            }
            setChatMessages(prev => [...prev, searchNotification])
          }, 1000)
        }
        
        // Reload agent state
        setTimeout(() => refreshAgentData(), 1000)
        
      } else {
        throw new Error('Failed to get agent response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        type: 'agent',
        content: 'I apologize, but I\'m having trouble processing your message right now. Please try again later.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      setIsSearching(false)
    }
  }

  const toggleAgent = async () => {
    const newStatus = agentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const response = await fetch(resolveApiUrl('/api/ai/unified-agent/toggle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus })
      })
      
      if (response.ok) {
        setAgentStatus(newStatus)
        
        const statusMessage = {
          type: 'agent',
          content: newStatus === 'active' 
            ? "I'm back online and ready to help with your unified funding strategy!" 
            : "I'm now paused. I'll stop monitoring for new opportunities until you reactivate me.",
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, statusMessage])
      }
    } catch (error) {
      console.error('Error toggling agent:', error)
    }
  }

  const respondToDecision = async (decisionId, response) => {
    try {
      await fetch(resolveApiUrl('/api/ai/unified-agent/decision-feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          decisionId, 
          feedback: response,
          userId: user.id
        })
      })
      
      setRecentDecisions(prev => prev.filter(d => d.id !== decisionId))
      
      const confirmationMessage = {
        type: 'agent',
        content: response === 'approve' 
          ? "Thanks for the approval! I'll proceed with this recommendation." 
          : "Understood, I've noted your preference for future recommendations.",
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, confirmationMessage])
      
      refreshAgentData()
    } catch (error) {
      console.error('Error responding to decision:', error)
    }
  }

  // Detect if message might trigger web search
  const detectSearchIntent = (message) => {
    const lowerMessage = message.toLowerCase()
    const searchKeywords = [
      'search online', 'search internet', 'search web', 'find online', 'look online',
      'search for more', 'find more opportunities', 'need more opportunities',
      'not enough opportunities', 'find additional', 'broader search'
    ]
    
    return searchKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           (opportunities?.length < 5 && lowerMessage.includes('analyz'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing your Unified Funding Agent...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Status Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-6 text-white ${
          agentStatus === 'active' 
            ? 'bg-gradient-to-r from-emerald-600 to-blue-600' 
            : agentStatus === 'error'
            ? 'bg-gradient-to-r from-red-600 to-orange-600'
            : 'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-8 h-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">Unified Funding Agent</h2>
              <p className="text-blue-100">
                {agentStatus === 'active' 
                  ? `Managing ${opportunities?.length || 0} opportunities • ${activeGoals.length} active goals • ${currentStrategy || 'Developing strategy'}` 
                  : agentStatus === 'error'
                  ? 'Agent encountered an issue'
                  : 'Agent paused'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-blue-200">Status</div>
              <div className="text-lg font-semibold capitalize">
                {agentStatus}
              </div>
            </div>
            
            {agentStatus !== 'error' && (
              <button
                onClick={toggleAgent}
                className={`p-3 rounded-lg transition-colors ${
                  agentStatus === 'active'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {agentStatus === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agent Goals and Metrics */}
        <div className="space-y-6">
          
          {/* Current Goals */}
          <div className="card bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Active Goals
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {activeGoals.length > 0 ? activeGoals.map((goal, index) => (
                <UnifiedGoalCard key={goal.id || index} goal={goal} />
              )) : (
                <p className="text-gray-500 text-center py-4">
                  Agent is analyzing your situation to set strategic goals.
                </p>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Performance
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Opportunities Discovered</span>
                <span className="font-semibold">{performanceMetrics.opportunitiesDiscovered || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Applications Generated</span>
                <span className="font-semibold">{performanceMetrics.applicationsGenerated || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="font-semibold">{Math.round((performanceMetrics.successRate || 0) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Recent Decisions */}
          <div className="card bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Pending Decisions
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {recentDecisions.length > 0 ? recentDecisions.slice(0,3).map(decision => (
                <UnifiedDecisionCard 
                  key={decision.id} 
                  decision={decision}
                  onRespond={respondToDecision}
                />
              )) : (
                <p className="text-gray-500 text-center py-4">
                  No pending decisions to review.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="card bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Chat with Your Unified Agent
                {isSearching && (
                  <span className="ml-2 text-sm text-emerald-600 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600 mr-2"></div>
                    Searching web...
                  </span>
                )}
                {isTyping && !isSearching && (
                  <span className="ml-2 text-sm text-slate-500">Agent is typing...</span>
                )}
              </h3>
            </div>
            <div className="p-4">
              
              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                <AnimatePresence>
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : message.type === 'system' ? 'justify-center' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-emerald-600 text-white'
                          : message.type === 'system'
                          ? 'bg-blue-50 border border-blue-200 text-blue-800'
                          : 'bg-white border shadow-sm'
                      }`}>
                        <div className={`text-sm whitespace-pre-line ${
                          message.type === 'user' 
                            ? 'text-white' 
                            : message.type === 'system'
                            ? 'text-blue-800'
                            : 'text-slate-900'
                        }`}>
                          {message.content}
                        </div>
                        <p className={`text-xs mt-2 ${
                          message.type === 'user' 
                            ? 'text-emerald-100' 
                            : message.type === 'system'
                            ? 'text-blue-600'
                            : 'text-slate-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Typing indicator */}
                  {(isTyping || isSearching) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white border shadow-sm px-4 py-3 rounded-lg">
                        {isSearching ? (
                          <div className="flex items-center space-x-2 text-emerald-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                            <span className="text-sm">Searching the web for opportunities...</span>
                          </div>
                        ) : (
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask your unified agent anything... (try 'analyze my funding strategy')"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={agentStatus !== 'active' || isTyping}
                />
                <button
                  onClick={sendMessage}
                  disabled={agentStatus !== 'active' || !newMessage.trim() || isTyping}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {/* Status messages */}
              {agentStatus !== 'active' && (
                <p className="text-sm text-gray-500 mt-2">
                  {agentStatus === 'error' 
                    ? 'Agent is experiencing issues. Please refresh the page.'
                    : 'Agent is paused. Activate it to continue chatting.'
                  }
                </p>
              )}
              
              {/* Quick action suggestions */}
              {chatMessages.length === 1 && agentStatus === 'active' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button 
                    onClick={() => setNewMessage('Analyze my complete funding strategy')}
                    className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                  >
                    Analyze strategy
                  </button>
                  <button 
                    onClick={() => setNewMessage('Search online for more opportunities')}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    🔍 Search web
                  </button>
                  <button 
                    onClick={() => setNewMessage('Help me analyze a funding document')}
                    className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    📄 Analyze document
                  </button>
                  <button 
                    onClick={() => setNewMessage('What deadlines are coming up?')}
                    className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                  >
                    Check deadlines
                  </button>
                  <button 
                    onClick={() => setNewMessage('Generate application drafts')}
                    className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                  >
                    Generate applications
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Goal card component
function UnifiedGoalCard({ goal }) {
  const getGoalIcon = (type) => {
    switch (type) {
      case 'funding_acquisition': return <DollarSign className="w-4 h-4" />
      case 'opportunity_discovery': return <Search className="w-4 h-4" />
      case 'deadline_management': return <Calendar className="w-4 h-4" />
      case 'application_tracking': return <FileText className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority) => {
    if (priority >= 8) return 'bg-red-100 text-red-800'
    if (priority >= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-blue-600 mr-2">
            {getGoalIcon(goal.type)}
          </div>
          <span className="font-medium text-sm">{goal.description}</span>
        </div>
        {goal.priority && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
            {goal.priority}/10
          </span>
        )}
      </div>
      {goal.progress !== undefined && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                goal.progress >= 80 ? 'bg-green-600' : 
                goal.progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${goal.progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">
            {goal.progress}% complete
          </div>
        </>
      )}
    </div>
  )
}

// Decision card component
function UnifiedDecisionCard({ decision, onRespond }) {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': case 10: case 9: case 8: 
        return <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">High Priority</span>
      case 'medium': case 7: case 6: case 5:
        return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Medium Priority</span>
      case 'low': case 4: case 3: case 2: case 1:
        return <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Low Priority</span>
      default: return null
    }
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <Lightbulb className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">{decision.title}</p>
            <p className="text-xs text-gray-600 mt-1">{decision.description}</p>
          </div>
        </div>
        {decision.priority && getPriorityBadge(decision.priority)}
      </div>
      
      {decision.confidence && (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-green-600 h-1.5 rounded-full" 
              style={{ width: `${decision.confidence * 100}%` }}
            ></div>
          </div>
          <span className="text-xs text-green-600">{Math.round(decision.confidence * 100)}% confidence</span>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={() => onRespond(decision.id, 'approve')}
          className="px-3 py-1 text-sm bg-green-100 text-green-800 hover:bg-green-200 rounded transition-colors flex items-center"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Approve
        </button>
        <button
          onClick={() => onRespond(decision.id, 'decline')}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 rounded transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}