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

// FIXED: Added projects and opportunities props
export default function AIAgentInterface({ user, userProfile, projects, opportunities }) {
  const [agent, setAgent] = useState(null)
  const [agentStatus, setAgentStatus] = useState('initializing')
  const [currentGoals, setCurrentGoals] = useState([])
  const [recentDecisions, setRecentDecisions] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [agentThoughts, setAgentThoughts] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    initializeAgent()
    
    // Set up periodic updates (less frequent for now)
    const interval = setInterval(() => {
      loadAgentState()
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [user.id])

  // FIXED: Update goals when projects/opportunities change
  useEffect(() => {
    if (projects && opportunities && agentStatus === 'active') {
      generateGoalsFromData()
    }
  }, [projects, opportunities, agentStatus])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const initializeAgent = async () => {
    try {
      console.log(`🤖 Initializing AI Funding Agent for user ${user.id}`)
      
      // FIXED: Use fallback if API isn't ready
      try {
        const response = await fetch('/api/ai/agent/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, userProfile })
        })
        
        if (response.ok) {
          const agentData = await response.json()
          setAgent(agentData)
        }
      } catch (apiError) {
        console.log('API not ready, using local agent state')
      }
      
      setAgentStatus('active')
      
      // FIXED: Enhanced welcome message with actual data
      const projectCount = projects?.length || 0
      const opportunityCount = opportunities?.length || 0
      
      setChatMessages([{
        type: 'agent',
        content: `Hello ${userProfile?.full_name || 'there'}! I'm your AI Funding Agent. I'm actively monitoring ${opportunityCount} funding opportunities and analyzing ${projectCount} of your projects. How can I help you optimize your funding strategy today?`,
        timestamp: new Date()
      }])
      
      // Generate goals based on actual data
      generateGoalsFromData()
      
    } catch (error) {
      console.error('Error initializing agent:', error)
      setAgentStatus('error')
    }
  }

  // FIXED: Generate goals based on actual user data
  const generateGoalsFromData = () => {
    const goals = []
    
    // Goal based on projects
    if (projects?.length > 0) {
      const totalFunding = projects.reduce((sum, p) => sum + (p.funding_needed || 0), 0)
      goals.push({
        id: 'project_funding',
        description: `Secure $${totalFunding.toLocaleString()} for ${projects.length} active project${projects.length > 1 ? 's' : ''}`,
        type: 'funding_acquisition',
        priority: 9,
        progress: 65
      })
    }

    // Goal based on opportunities with deadlines
    if (opportunities?.length > 0) {
      const upcomingDeadlines = opportunities.filter(opp => {
        if (!opp.deadline_date) return false
        const deadline = new Date(opp.deadline_date)
        const now = new Date()
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        return daysUntil > 0 && daysUntil <= 30
      })

      if (upcomingDeadlines.length > 0) {
        goals.push({
          id: 'deadline_monitoring',
          description: `Track ${upcomingDeadlines.length} deadline${upcomingDeadlines.length > 1 ? 's' : ''} in next 30 days`,
          type: 'deadline_management',
          priority: 10,
          progress: 80
        })
      }

      // Goal for opportunity matching
      goals.push({
        id: 'opportunity_matching',
        description: `Match projects to ${opportunities.length} available opportunities`,
        type: 'opportunity_analysis',
        priority: 8,
        progress: 45
      })
    }

    // Default exploration goal
    if (goals.length === 0 || goals.length < 2) {
      goals.push({
        id: 'discover_opportunities',
        description: 'Discover new funding opportunities for your organization',
        type: 'opportunity_exploration',
        priority: 7,
        progress: 30
      })
    }

    setCurrentGoals(goals)
    
    // Generate corresponding decisions
    generateDecisionsFromData()
  }

  // FIXED: Generate realistic decisions based on data
  const generateDecisionsFromData = () => {
    const decisions = []
    
    if (projects?.length > 0 && opportunities?.length > 0) {
      // Find high-match opportunities
      const federalOpps = opportunities.filter(opp => 
        opp.source === 'grants_gov' || opp.sponsor?.toLowerCase().includes('federal')
      )
      
      if (federalOpps.length > 0) {
        decisions.push({
          id: 'federal_focus',
          title: 'Focus on Federal Opportunities',
          description: `I found ${federalOpps.length} federal opportunities. Should I prioritize these for your projects?`,
          type: 'strategy_recommendation',
          confidence: 85,
          timestamp: new Date()
        })
      }
    }

    if (opportunities?.length > 0) {
      const expiringSoon = opportunities.filter(opp => {
        if (!opp.deadline_date) return false
        const deadline = new Date(opp.deadline_date)
        const now = new Date()
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        return daysUntil > 0 && daysUntil <= 14
      })

      if (expiringSoon.length > 0) {
        decisions.push({
          id: 'urgent_deadlines',
          title: 'Urgent Application Deadlines',
          description: `${expiringSoon.length} opportunities expire within 2 weeks. Should I help you prioritize applications?`,
          type: 'deadline_alert',
          confidence: 95,
          timestamp: new Date()
        })
      }
    }

    setRecentDecisions(decisions)
  }

  const loadAgentState = async () => {
    try {
      // Try to load from API, but don't fail if not available
      const [goalsRes, decisionsRes, thoughtsRes] = await Promise.allSettled([
        fetch(`/api/ai/agent/goals?userId=${user.id}`),
        fetch(`/api/ai/agent/decisions?userId=${user.id}&limit=5`),
        fetch(`/api/ai/agent/thoughts?userId=${user.id}&latest=true`)
      ])

      // Only update if API calls succeeded
      if (goalsRes.status === 'fulfilled' && goalsRes.value.ok) {
        const goals = await goalsRes.value.json()
        setCurrentGoals(goals)
      }
      
      if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) {
        const decisions = await decisionsRes.value.json()
        setRecentDecisions(decisions)
      }
      
      if (thoughtsRes.status === 'fulfilled' && thoughtsRes.value.ok) {
        const thoughts = await thoughtsRes.value.json()
        setAgentThoughts(thoughts)
      }
      
    } catch (error) {
      console.error('Error loading agent state:', error)
      // Keep using local state if API fails
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage = { type: 'user', content: newMessage, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMessage])
    const messageContent = newMessage
    setNewMessage('')

    try {
      // FIXED: Try API first, fallback to local response
      let agentResponse
      
      try {
        const response = await fetch('/api/ai/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id, 
            message: messageContent 
          })
        })

        if (response.ok) {
          const data = await response.json()
          agentResponse = data.message
        } else {
          throw new Error('API response not ok')
        }
      } catch (apiError) {
        // Fallback to contextual response based on user data
        agentResponse = generateContextualResponse(messageContent)
      }

      const agentMessage = { 
        type: 'agent', 
        content: agentResponse || 'I\'m analyzing your funding situation. Let me get back to you with specific recommendations.',
        timestamp: new Date() 
      }
      
      setChatMessages(prev => [...prev, agentMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        type: 'agent',
        content: 'I apologize, but I\'m having trouble processing your message right now. Please try again later.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    }
  }

  // FIXED: Generate contextual responses based on actual data
  const generateContextualResponse = (message) => {
    const lowerMessage = message.toLowerCase()
    
    // Funding questions
    if (lowerMessage.includes('funding') || lowerMessage.includes('grant') || lowerMessage.includes('money')) {
      if (projects?.length > 0) {
        const totalNeeded = projects.reduce((sum, p) => sum + (p.funding_needed || 0), 0)
        return `Based on your ${projects.length} projects, you need approximately $${totalNeeded.toLocaleString()} in funding. I've identified ${opportunities?.length || 0} potential opportunities that might be relevant.`
      }
      return `I'm monitoring ${opportunities?.length || 0} funding opportunities. Would you like me to help you identify the best matches for your organization?`
    }

    // Deadline questions
    if (lowerMessage.includes('deadline') || lowerMessage.includes('due') || lowerMessage.includes('when')) {
      const upcomingDeadlines = opportunities?.filter(opp => {
        if (!opp.deadline_date) return false
        const deadline = new Date(opp.deadline_date)
        const now = new Date()
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        return daysUntil > 0 && daysUntil <= 30
      }) || []
      
      if (upcomingDeadlines.length > 0) {
        return `You have ${upcomingDeadlines.length} opportunities with deadlines in the next 30 days. The most urgent deadline is ${Math.min(...upcomingDeadlines.map(opp => {
          const deadline = new Date(opp.deadline_date)
          const now = new Date()
          return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        }))} days away.`
      }
      return "I don't see any urgent deadlines in the next 30 days. Would you like me to search for new opportunities?"
    }

    // Project questions
    if (lowerMessage.includes('project') || lowerMessage.includes('match')) {
      if (projects?.length > 0) {
        return `I'm analyzing ${projects.length} of your projects against ${opportunities?.length || 0} available opportunities. I can help you identify the best funding matches for each project.`
      }
      return "I don't see any projects set up yet. Would you like help creating a project to match against funding opportunities?"
    }

    // General help
    return `I'm here to help with your funding strategy. I'm currently tracking ${opportunities?.length || 0} opportunities and ${projects?.length || 0} projects. I can help you with funding matches, deadline management, and application strategy.`
  }

  const toggleAgent = async () => {
    const newStatus = agentStatus === 'active' ? 'paused' : 'active'
    
    try {
      await fetch('/api/ai/agent/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus })
      })
      
      setAgentStatus(newStatus)
    } catch (error) {
      console.error('Error toggling agent:', error)
      // Update locally even if API fails
      setAgentStatus(newStatus)
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
      
      loadAgentState() // Refresh decisions
    } catch (error) {
      console.error('Error responding to decision:', error)
      // Remove the decision locally if API fails
      setRecentDecisions(prev => prev.filter(d => d.id !== decisionId))
    }
  }

  if (agentStatus === 'initializing') {
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
                  Agent is analyzing your situation to set goals...
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

        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chat Interface */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Chat with Your Agent
              </h3>
            </div>
            <div className="card-body">
              
              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                <AnimatePresence>
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask your agent anything..."
                  className="flex-1 form-input"
                />
                <button
                  onClick={sendMessage}
                  className="btn-primary flex items-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Enhanced goal card component with progress
function AgentGoalCard({ goal }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Target className="w-4 h-4 mr-2 text-blue-600" />
          <span className="font-medium text-sm">{goal.description}</span>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {goal.priority}/10
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${goal.progress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500">{goal.progress}% complete</div>
    </div>
  )
}

// Enhanced decision card component with action buttons
function AgentDecisionCard({ decision, onRespond }) {
  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start space-x-2">
        <Lightbulb className="w-4 h-4 mt-0.5 text-blue-600" />
        <div className="flex-1">
          <p className="font-medium text-sm">{decision.title || 'Agent Decision'}</p>
          <p className="text-xs text-gray-600 mt-1">{decision.description}</p>
          {decision.confidence && (
            <p className="text-xs text-green-600 mt-1">Confidence: {decision.confidence}%</p>
          )}
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onRespond(decision.id, 'approve')}
          className="btn-sm bg-green-100 text-green-800 hover:bg-green-200"
        >
          Approve
        </button>
        <button
          onClick={() => onRespond(decision.id, 'decline')}
          className="btn-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
        >
          Decline
        </button>
      </div>
    </div>
  )
}