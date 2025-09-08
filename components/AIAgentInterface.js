// components/AIAgentInterface.js
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
  AlertTriangle
} from 'lucide-react'

export default function AIAgentInterface({ user, userProfile, projects, opportunities }) {
  const [agent, setAgent] = useState(null)
  const [agentStatus, setAgentStatus] = useState('initializing')
  const [currentGoals, setCurrentGoals] = useState([])
  const [recentDecisions, setRecentDecisions] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [agentThoughts, setAgentThoughts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [lastSearchResults, setLastSearchResults] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    initializeAgent()
    
    // Set up periodic updates
    const interval = setInterval(() => {
      loadAgentState()
    }, 60000) // Every minute

    // Set up periodic progress updates
    const progressInterval = setInterval(() => {
      updateGoalProgress()
    }, 5 * 60000) // Every 5 minutes

    return () => {
      clearInterval(interval)
      clearInterval(progressInterval)
    }
  }, [user.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const initializeAgent = async () => {
    try {
      setLoading(true)
      console.log(`🤖 Initializing AI Funding Agent for user ${user.id}`)
      
      const response = await fetch('/api/ai/agent/initialize', {
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
        
        // Load real agent state from database
        await loadAgentState()
        
        // Only show welcome message after successful initialization
        setChatMessages([{
          type: 'agent',
          content: `Hello ${userProfile?.full_name || 'there'}! I'm your AI Funding Agent and I'm now actively working for you. How can I help you optimize your funding strategy?`,
          timestamp: new Date()
        }])
        
      } else {
        throw new Error('Failed to initialize agent')
      }
      
    } catch (error) {
      console.error('Error initializing agent:', error)
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

  const loadAgentState = async () => {
    try {
      const [goalsRes, decisionsRes, thoughtsRes] = await Promise.allSettled([
        fetch(`/api/ai/agent/goals?userId=${user.id}`),
        fetch(`/api/ai/agent/decisions?userId=${user.id}&limit=5`),
        fetch(`/api/ai/agent/thoughts?userId=${user.id}&latest=true`)
      ])

      // Only update if API calls succeeded and returned real data
      if (goalsRes.status === 'fulfilled' && goalsRes.value.ok) {
        const goals = await goalsRes.value.json()
        if (goals && Array.isArray(goals) && goals.length > 0) {
          setCurrentGoals(goals)
          
          // Update goal progress in the background
          updateGoalProgress()
        }
      }
      
      if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) {
        const decisions = await decisionsRes.value.json()
        if (decisions && Array.isArray(decisions) && decisions.length > 0) {
          setRecentDecisions(decisions)
        }
      }
      
      if (thoughtsRes.status === 'fulfilled' && thoughtsRes.value.ok) {
        const thoughts = await thoughtsRes.value.json()
        if (thoughts && typeof thoughts === 'object') {
          setAgentThoughts(thoughts)
        }
      }
      
    } catch (error) {
      console.error('Error loading agent state:', error)
    }
  }

  const updateGoalProgress = async () => {
    try {
      const response = await fetch('/api/ai/agent/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      
      if (response.ok) {
        const updatedGoals = await response.json()
        setCurrentGoals(updatedGoals)
        console.log('Goal progress updated successfully')
      }
    } catch (error) {
      console.error('Error updating goal progress:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage = { type: 'user', content: newMessage, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMessage])
    const messageContent = newMessage
    setNewMessage('')
    setIsTyping(true)

    // Check if this might trigger a web search
    const mightSearch = detectSearchIntent(messageContent)
    if (mightSearch) {
      setIsSearching(true)
    }

    try {
      const response = await fetch('/api/ai/agent/chat', {
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
        
        // Handle web search results if returned
        if (data.webSearchResults && data.searchPerformed) {
          setLastSearchResults({
            results: data.webSearchResults,
            timestamp: new Date(),
            query: messageContent
          })
          
          // Add a visual indicator for discovered opportunities
          setTimeout(() => {
            const searchNotification = {
              type: 'system',
              content: `🔍 Discovered ${data.webSearchResults.length} new opportunities from web search`,
              timestamp: new Date(),
              isSearchResult: true
            }
            setChatMessages(prev => [...prev, searchNotification])
          }, 1000)
        }
        
        // Reload agent state in case the conversation created new decisions
        setTimeout(() => loadAgentState(), 1000)
        
        // Update goal progress after agent interaction (might have triggered new activity)
        setTimeout(() => updateGoalProgress(), 2000)
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
      const response = await fetch('/api/ai/agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus })
      })
      
      if (response.ok) {
        setAgentStatus(newStatus)
        
        // Add status change message to chat
        const statusMessage = {
          type: 'agent',
          content: newStatus === 'active' 
            ? "I'm back online and ready to help with your funding strategy!" 
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
      await fetch('/api/ai/agent/decision-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          decisionId, 
          feedback: response,
          userId: user.id
        })
      })
      
      // Remove the decision from the list after responding
      setRecentDecisions(prev => prev.filter(d => d.id !== decisionId))
      
      // Add confirmation message to chat
      const confirmationMessage = {
        type: 'agent',
        content: response === 'approve' 
          ? "Thanks for the approval! I'll proceed with this recommendation." 
          : "Understood, I've noted your preference for future recommendations.",
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, confirmationMessage])
      
      // Reload agent state to get updated data
      loadAgentState()
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
          <p className="text-gray-600">Initializing your AI Funding Agent...</p>
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
            ? 'bg-gradient-to-r from-green-600 to-blue-600' 
            : agentStatus === 'error'
            ? 'bg-gradient-to-r from-red-600 to-orange-600'
            : 'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-8 h-8 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">AI Funding Agent</h2>
              <p className="text-blue-100">
                {agentStatus === 'active' 
                  ? `Monitoring ${opportunities?.length || 0} opportunities • ${currentGoals.length} active goals` 
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
        
        {/* Agent Goals and Status */}
        <div className="space-y-6">
          
          {/* Current Goals */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Agent Goals
              </h3>
            </div>
            <div className="card-body space-y-3">
              {currentGoals.length > 0 ? currentGoals.map(goal => (
                <AgentGoalCard key={goal.id} goal={goal} />
              )) : (
                <p className="text-gray-500 text-center py-4">
                  No active goals set. Agent will establish goals after analyzing your profile.
                </p>
              )}
            </div>
          </div>

          {/* Recent Decisions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Agent Decisions
              </h3>
            </div>
            <div className="card-body space-y-3">
              {recentDecisions.length > 0 ? recentDecisions.map(decision => (
                <AgentDecisionCard 
                  key={decision.id} 
                  decision={decision}
                  onRespond={respondToDecision}
                />
              )) : (
                <p className="text-gray-500 text-center py-4">
                  No recent decisions to review.
                </p>
              )}
            </div>
          </div>

          {/* Agent Thoughts Display - Only show if real data exists */}
          {agentThoughts && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Agent Insights
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-2 text-sm">
                  {agentThoughts.next_focus && (
                    <>
                      <p className="font-medium text-gray-900">Current Focus:</p>
                      <p className="text-gray-700">{agentThoughts.next_focus}</p>
                    </>
                  )}
                  
                  {agentThoughts.insights && agentThoughts.insights.length > 0 && (
                    <>
                      <p className="font-medium text-gray-900 mt-3">Key Insights:</p>
                      <ul className="text-gray-700 space-y-1">
                        {agentThoughts.insights.slice(0, 2).map((insight, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chat Interface */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Chat with Your Agent
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
            <div className="card-body">
              
              {/* Enhanced Chat Messages */}
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
                        {/* Enhanced message content rendering with proper formatting */}
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
                  placeholder="Ask your agent anything... (try 'analyze opportunities')"
                  className="flex-1 form-input"
                  disabled={agentStatus !== 'active' || isTyping}
                />
                <button
                  onClick={sendMessage}
                  disabled={agentStatus !== 'active' || !newMessage.trim() || isTyping}
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => setNewMessage('Analyze my opportunities')}
                    className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                  >
                    Analyze opportunities
                  </button>
                  <button 
                    onClick={() => setNewMessage('Search online for more opportunities')}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    🔍 Search web
                  </button>
                  <button 
                    onClick={() => setNewMessage('What deadlines are coming up?')}
                    className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                  >
                    Check deadlines
                  </button>
                  <button 
                    onClick={() => setNewMessage('Show me my best matches')}
                    className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                  >
                    Best matches
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

// Enhanced Goal card component with better visual design
function AgentGoalCard({ goal }) {
  const getGoalIcon = (type) => {
    switch (type) {
      case 'opportunity_discovery': return <Zap className="w-4 h-4" />
      case 'deadline_management': return <Clock className="w-4 h-4" />
      case 'application_tracking': return <TrendingUp className="w-4 h-4" />
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
                goal.progress >= 50 ? 'bg-green-600' : 'bg-yellow-600'
              }`}
              style={{ width: `${goal.progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">
            {goal.progress}% complete 
            <span className="text-green-500 ml-1">• Live tracking</span>
          </div>
        </>
      )}
    </div>
  )
}

// Enhanced Decision card component with better visual hierarchy
function AgentDecisionCard({ decision, onRespond }) {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">High Priority</span>
      case 'medium': return <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Medium Priority</span>
      case 'low': return <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Low Priority</span>
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
              style={{ width: `${decision.confidence}%` }}
            ></div>
          </div>
          <span className="text-xs text-green-600">{decision.confidence}% confidence</span>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={() => onRespond(decision.id, 'approve')}
          className="btn-sm bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Approve
        </button>
        <button
          onClick={() => onRespond(decision.id, 'decline')}
          className="btn-sm bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}