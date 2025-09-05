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

export default function AIAgentInterface({ user, userProfile }) {
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
    loadAgentState()
    
    // Set up real-time updates
    const interval = setInterval(() => {
      loadAgentState()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [user.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const initializeAgent = async () => {
    try {
      const response = await fetch('/api/ai/agent/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userProfile })
      })
      
      const agentData = await response.json()
      setAgent(agentData)
      setAgentStatus('active')
    } catch (error) {
      console.error('Error initializing agent:', error)
      setAgentStatus('error')
    }
  }

  const loadAgentState = async () => {
    try {
      const [goalsRes, decisionsRes, thoughtsRes] = await Promise.all([
        fetch(`/api/ai/agent/goals?userId=${user.id}`),
        fetch(`/api/ai/agent/decisions?userId=${user.id}&limit=5`),
        fetch(`/api/ai/agent/thoughts?userId=${user.id}&latest=true`)
      ])

      const [goals, decisions, thoughts] = await Promise.all([
        goalsRes.json(),
        decisionsRes.json(),
        thoughtsRes.json()
      ])

      setCurrentGoals(goals)
      setRecentDecisions(decisions)
      setAgentThoughts(thoughts)
    } catch (error) {
      console.error('Error loading agent state:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    const userMessage = { type: 'user', content: newMessage, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMessage])
    setNewMessage('')

    try {
      const response = await fetch('/api/ai/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          message: newMessage 
        })
      })

      const agentResponse = await response.json()
      const agentMessage = { 
        type: 'agent', 
        content: agentResponse.message, 
        context: agentResponse.context,
        timestamp: new Date() 
      }
      
      setChatMessages(prev => [...prev, agentMessage])
    } catch (error) {
      console.error('Error sending message:', error)
    }
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
                  ? `Actively working on ${currentGoals.length} goals` 
                  : 'Agent paused'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-blue-200">Last thought cycle</div>
              <div className="text-lg font-semibold">
                {agentThoughts?.timestamp 
                  ? new Date(agentThoughts.timestamp).toLocaleTimeString()
                  : 'Initializing...'
                }
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
              {currentGoals.map(goal => (
                <AgentGoalCard key={goal.id} goal={goal} />
              ))}
              {currentGoals.length === 0 && (
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
              {recentDecisions.map(decision => (
                <AgentDecisionCard 
                  key={decision.id} 
                  decision={decision}
                  onRespond={respondToDecision}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Agent Thoughts and Analysis */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Thinking */}
          {agentThoughts && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Agent's Current Analysis
                </h3>
              </div>
              <div className="card-body">
                <AgentThoughtsDisplay thoughts={agentThoughts} />
              </div>
            </div>
          )}

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

// Individual Components

function AgentGoalCard({ goal }) {
  const getGoalIcon = (type) => {
    switch (type) {
      case 'funding_acquisition': return Target
      case 'deadline_management': return Clock
      case 'opportunity_exploration': return Zap
      default: return CheckCircle
    }
  }

  const getPriorityColor = (priority) => {
    if (priority >= 8) return 'text-red-600 bg-red-100'
    if (priority >= 6) return 'text-orange-600 bg-orange-100'
    if (priority >= 4) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const Icon = getGoalIcon(goal.goal_type)

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className="w-4 h-4 mr-2 text-blue-600" />
          <span className="font-medium text-sm">{goal.description}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
          P{goal.priority}
        </span>
      </div>
      
      {goal.progress_percentage > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Progress</span>
            <span>{Math.round(goal.progress_percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${goal.progress_percentage}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {goal.target_date && (
        <div className="text-xs text-gray-500">
          Target: {new Date(goal.target_date).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

function AgentDecisionCard({ decision, onRespond }) {
  const [responding, setResponding] = useState(false)

  const handleResponse = async (approved, rating = null) => {
    setResponding(true)
    try {
      await onRespond(decision.id, { approved, rating })
    } finally {
      setResponding(false)
    }
  }

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'opportunity_pursuit': return Target
      case 'emergency_action': return AlertTriangle
      case 'goal_update': return RotateCcw
      default: return Lightbulb
    }
  }

  const Icon = getDecisionIcon(decision.decision_type)

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start space-x-2">
        <Icon className="w-4 h-4 mt-0.5 text-blue-600" />
        <div className="flex-1">
          <p className="font-medium text-sm">{decision.decision_data?.title || 'Agent Decision'}</p>
          <p className="text-xs text-gray-600 mt-1">{decision.reasoning}</p>
        </div>
      </div>
      
      {decision.confidence_score && (
        <div className="text-xs text-gray-500">
          Confidence: {Math.round(decision.confidence_score * 100)}%
        </div>
      )}

      {decision.requires_approval && !decision.responded_at && (
        <div className="flex space-x-2 pt-2 border-t">
          <button
            onClick={() => handleResponse(true)}
            disabled={responding}
            className="btn-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleResponse(false)}
            disabled={responding}
            className="btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {decision.responded_at && (
        <div className="text-xs text-gray-500 pt-2 border-t">
          Responded {new Date(decision.responded_at).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

function AgentThoughtsDisplay({ thoughts }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Current Reasoning</h4>
        <p className="text-sm text-blue-700">{thoughts.reasoning}</p>
      </div>

      {thoughts.actions_taken && thoughts.actions_taken.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Recent Actions</h4>
          <div className="space-y-1">
            {thoughts.actions_taken.map((action, idx) => (
              <div key={idx} className="text-sm text-gray-600 flex items-center">
                <CheckCircle className="w-3 h-3 mr-2 text-green-600" />
                {action.description || action}
              </div>
            ))}
          </div>
        </div>
      )}

      {thoughts.insights && thoughts.insights.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-2">Key Insights</h4>
          <div className="space-y-1">
            {thoughts.insights.map((insight, idx) => (
              <div key={idx} className="text-sm text-gray-600 flex items-start">
                <Lightbulb className="w-3 h-3 mr-2 mt-0.5 text-yellow-600" />
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-1">Next Focus</h4>
        <p className="text-sm text-gray-600">{thoughts.next_focus}</p>
      </div>
    </div>
  )
}
