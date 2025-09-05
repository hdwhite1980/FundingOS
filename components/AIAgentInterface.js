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
    
    // Set up periodic updates (less frequent for now)
    const interval = setInterval(() => {
      loadAgentState()
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [user.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const initializeAgent = async () => {
    try {
      console.log(`🤖 Initializing AI Funding Agent for user ${user.id}`)
      
      const response = await fetch('/api/ai/agent/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userProfile })
      })
      
      const agentData = await response.json()
      setAgent(agentData)
      setAgentStatus('active')
      
      // Add welcome message
      setChatMessages([{
        type: 'agent',
        content: 'Hello! I\'m your AI Funding Agent. I\'m here to help you discover opportunities, track deadlines, and optimize your funding strategy. How can I assist you today?',
        timestamp: new Date()
      }])
      
    } catch (error) {
      console.error('Error initializing agent:', error)
      setAgentStatus('error')
    }
  }

  const loadAgentState = async () => {
    try {
      // Load goals, decisions, and thoughts from API
      const [goalsRes, decisionsRes, thoughtsRes] = await Promise.all([
        fetch(`/api/ai/agent/goals?userId=${user.id}`),
        fetch(`/api/ai/agent/decisions?userId=${user.id}&limit=5`),
        fetch(`/api/ai/agent/thoughts?userId=${user.id}&latest=true`)
      ])

      if (goalsRes.ok) {
        const goals = await goalsRes.json()
        setCurrentGoals(goals)
      }
      
      if (decisionsRes.ok) {
        const decisions = await decisionsRes.json()
        setRecentDecisions(decisions)
      }
      
      if (thoughtsRes.ok) {
        const thoughts = await thoughtsRes.json()
        setAgentThoughts(thoughts)
      }
      
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
        content: agentResponse.message || 'I\'m processing your request. This feature is being enhanced.',
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
                  ? `Working on ${currentGoals.length} goals` 
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

// Simplified goal card component
function AgentGoalCard({ goal }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Target className="w-4 h-4 mr-2 text-blue-600" />
          <span className="font-medium text-sm">{goal.description}</span>
        </div>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Active
        </span>
      </div>
    </div>
  )
}

// Simplified decision card component  
function AgentDecisionCard({ decision, onRespond }) {
  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start space-x-2">
        <Lightbulb className="w-4 h-4 mt-0.5 text-blue-600" />
        <div className="flex-1">
          <p className="font-medium text-sm">{decision.title || 'Agent Decision'}</p>
          <p className="text-xs text-gray-600 mt-1">{decision.description}</p>
        </div>
      </div>
    </div>
  )
}