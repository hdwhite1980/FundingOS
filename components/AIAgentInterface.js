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
  Sparkles
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
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const agentData = {
        id: 'agent-' + user.id,
        status: 'active',
        initialized: true
      }
      
      setAgent(agentData)
      setAgentStatus('active')
      
      // Load mock agent state
      await loadAgentState()
      
      setChatMessages([{
        type: 'agent',
        content: `Hello ${userProfile?.full_name || 'there'}! I'm your AI Funding Agent and I'm now actively working for you. How can I help you optimize your funding strategy?`,
        timestamp: new Date()
      }])
      
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
      // Mock data for demonstration
      const mockGoals = [
        {
          id: 1,
          type: 'opportunity_discovery',
          description: 'Monitor new grant opportunities in healthcare',
          progress: 75,
          priority: 8
        },
        {
          id: 2,
          type: 'deadline_management',
          description: 'Track NSF application deadline (Dec 15)',
          progress: 45,
          priority: 9
        },
        {
          id: 3,
          type: 'application_tracking',
          description: 'Follow up on SBIR Phase II proposal',
          progress: 90,
          priority: 6
        }
      ]

      const mockDecisions = [
        {
          id: 1,
          title: 'New NIH Opportunity Match',
          description: 'Found a 92% match for your biotech research project. Deadline in 3 weeks.',
          priority: 'high',
          confidence: 92
        },
        {
          id: 2,
          title: 'Application Strategy Update',
          description: 'Recommend updating your project budget based on recent funding trends.',
          priority: 'medium',
          confidence: 78
        }
      ]

      const mockThoughts = {
        next_focus: 'Analyzing recent funding patterns in your sector to identify emerging opportunities.',
        insights: [
          'Your success rate could improve by 23% with earlier application submissions',
          'Three new programs launched this month match your research profile'
        ]
      }

      setCurrentGoals(mockGoals)
      setRecentDecisions(mockDecisions)
      setAgentThoughts(mockThoughts)
      
    } catch (error) {
      console.error('Error loading agent state:', error)
    }
  }

  const updateGoalProgress = async () => {
    try {
      // Mock progress updates
      setCurrentGoals(prev => prev.map(goal => ({
        ...goal,
        progress: Math.min(100, goal.progress + Math.random() * 5)
      })))
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

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const responses = [
        "I'm analyzing your current opportunities and will provide recommendations shortly.",
        "Based on your profile, I've identified 3 new funding opportunities that match your criteria.",
        "Your application deadlines are well-managed. The next critical deadline is in 2 weeks.",
        "I recommend focusing on the NIH R01 program - it has a 94% match with your research."
      ]
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      const agentMessage = { 
        type: 'agent', 
        content: randomResponse,
        timestamp: new Date() 
      }
      setChatMessages(prev => [...prev, agentMessage])
      
      // Simulate state updates
      setTimeout(() => loadAgentState(), 1000)
      setTimeout(() => updateGoalProgress(), 2000)
      
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
    }
  }

  const toggleAgent = async () => {
    const newStatus = agentStatus === 'active' ? 'paused' : 'active'
    
    try {
      setAgentStatus(newStatus)
      
      const statusMessage = {
        type: 'agent',
        content: newStatus === 'active' 
          ? "I'm back online and ready to help with your funding strategy!" 
          : "I'm now paused. I'll stop monitoring for new opportunities until you reactivate me.",
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, statusMessage])
    } catch (error) {
      console.error('Error toggling agent:', error)
    }
  }

  const respondToDecision = async (decisionId, response) => {
    try {
      // Remove the decision from the list after responding
      setRecentDecisions(prev => prev.filter(d => d.id !== decisionId))
      
      const confirmationMessage = {
        type: 'agent',
        content: response === 'approve' 
          ? "Thanks for the approval! I'll proceed with this recommendation." 
          : "Understood, I've noted your preference for future recommendations.",
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, confirmationMessage])
      
      loadAgentState()
    } catch (error) {
      console.error('Error responding to decision:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="p-4 bg-emerald-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Brain className="w-10 h-10 text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Initializing AI Agent</h2>
          <p className="text-slate-600">Setting up your intelligent funding assistant...</p>
          <div className="mt-4 w-48 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'active': return 'bg-emerald-600'
      case 'error': return 'bg-red-600'
      case 'paused': return 'bg-amber-600'
      default: return 'bg-slate-600'
    }
  }

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'active': return <Activity className="w-5 h-5" />
      case 'error': return <AlertTriangle className="w-5 h-5" />
      case 'paused': return <Pause className="w-5 h-5" />
      default: return <Brain className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Funding Agent</h1>
          <p className="text-lg text-slate-600">Your intelligent assistant for funding opportunities</p>
        </div>

        {/* Agent Status Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${getStatusColor()} rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-all duration-300`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 rounded-lg mr-4">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">AI Agent Status</h2>
                <p className="text-white/90">
                  {agentStatus === 'active' 
                    ? `Monitoring ${opportunities?.length || 12} opportunities • ${currentGoals.length} active goals` 
                    : agentStatus === 'error'
                    ? 'Agent encountered an issue and needs attention'
                    : 'Agent paused - click to reactivate monitoring'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Status Metrics */}
              <div className="hidden sm:flex space-x-6 text-center">
                <div>
                  <div className="text-2xl font-bold">{currentGoals.length}</div>
                  <div className="text-xs text-white/80">Active Goals</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{recentDecisions.length}</div>
                  <div className="text-xs text-white/80">Decisions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{opportunities?.length || 12}</div>
                  <div className="text-xs text-white/80">Opportunities</div>
                </div>
              </div>

              {/* Status Badge and Toggle */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-white/20 rounded-lg px-3 py-2">
                  {getStatusIcon()}
                  <span className="ml-2 font-semibold capitalize">{agentStatus}</span>
                </div>
                
                {agentStatus !== 'error' && (
                  <button
                    onClick={toggleAgent}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200"
                  >
                    {agentStatus === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Agent Controls and Status */}
          <div className="space-y-6">
            
            {/* Current Goals */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center mb-6">
                <div className="p-2.5 bg-emerald-50 rounded-lg mr-3">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Active Goals</h3>
              </div>
              <div className="space-y-4">
                {currentGoals.length > 0 ? currentGoals.map(goal => (
                  <AgentGoalCard key={goal.id} goal={goal} />
                )) : (
                  <div className="text-center py-8">
                    <div className="p-3 bg-slate-50 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <Target className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      No active goals set. Agent will establish goals after analyzing your profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Decisions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center mb-6">
                <div className="p-2.5 bg-amber-50 rounded-lg mr-3">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Pending Decisions</h3>
              </div>
              <div className="space-y-4">
                {recentDecisions.length > 0 ? recentDecisions.map(decision => (
                  <AgentDecisionCard 
                    key={decision.id} 
                    decision={decision}
                    onRespond={respondToDecision}
                  />
                )) : (
                  <div className="text-center py-8">
                    <div className="p-3 bg-slate-50 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      No decisions pending your review.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Insights */}
            {agentThoughts && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-center mb-6">
                  <div className="p-2.5 bg-slate-50 rounded-lg mr-3">
                    <Sparkles className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Agent Insights</h3>
                </div>
                <div className="space-y-4">
                  {agentThoughts.next_focus && (
                    <div>
                      <p className="text-sm font-medium text-slate-900 mb-2">Current Focus:</p>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{agentThoughts.next_focus}</p>
                    </div>
                  )}
                  
                  {agentThoughts.insights && agentThoughts.insights.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-900 mb-3">Key Insights:</p>
                      <div className="space-y-2">
                        {agentThoughts.insights.slice(0, 2).map((insight, index) => (
                          <div key={index} className="flex items-start bg-emerald-50 rounded-lg p-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <p className="text-sm text-emerald-800">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Chat Interface */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="border-b border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2.5 bg-emerald-50 rounded-lg mr-3">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Chat with Your Agent</h3>
                  </div>
                  {isTyping && (
                    <div className="flex items-center text-sm text-slate-500">
                      <div className="flex space-x-1 mr-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      Agent is typing...
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {/* Chat Messages */}
                <div className="h-80 overflow-y-auto mb-6 space-y-4 bg-slate-50 rounded-lg p-4">
                  <AnimatePresence>
                    {chatMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-sm ${
                          message.type === 'user'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200'
                        }`}>
                          <div className={`text-sm whitespace-pre-line ${
                            message.type === 'user' ? 'text-white' : 'text-slate-900'
                          }`}>
                            {message.content}
                          </div>
                          <p className={`text-xs mt-2 ${
                            message.type === 'user' ? 'text-emerald-100' : 'text-slate-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white border border-slate-200 shadow-sm px-4 py-3 rounded-xl">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask your agent anything..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    disabled={agentStatus !== 'active' || isTyping}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={agentStatus !== 'active' || !newMessage.trim() || isTyping}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Status messages */}
                {agentStatus !== 'active' && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      {agentStatus === 'error' 
                        ? 'Agent is experiencing issues. Please refresh the page.'
                        : 'Agent is paused. Activate it to continue chatting.'
                      }
                    </p>
                  </div>
                )}
                
                {/* Quick action suggestions */}
                {chatMessages.length === 1 && agentStatus === 'active' && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-slate-600">Quick actions:</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setNewMessage('Analyze my opportunities')}
                        className="text-xs px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors duration-200 border border-emerald-200"
                      >
                        Analyze opportunities
                      </button>
                      <button 
                        onClick={() => setNewMessage('What deadlines are coming up?')}
                        className="text-xs px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors duration-200 border border-emerald-200"
                      >
                        Check deadlines
                      </button>
                      <button 
                        onClick={() => setNewMessage('Show me my best matches')}
                        className="text-xs px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors duration-200 border border-emerald-200"
                      >
                        Best matches
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Goal card component
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
    if (priority >= 8) return 'bg-red-100 text-red-700 border-red-200'
    if (priority >= 6) return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3 hover:shadow-sm hover:border-emerald-300 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-emerald-600 mr-3 p-1 bg-emerald-50 rounded">
            {getGoalIcon(goal.type)}
          </div>
          <span className="font-medium text-sm text-slate-900">{goal.description}</span>
        </div>
        {goal.priority && (
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getPriorityColor(goal.priority)}`}>
            {goal.priority}/10
          </span>
        )}
      </div>
      {goal.progress !== undefined && (
        <div className="space-y-2">
          <div className="w-full bg-slate-100 rounded-lg h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-lg transition-all duration-700 ease-out ${
                goal.progress >= 80 ? 'bg-emerald-500' : 
                goal.progress >= 50 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${goal.progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600">{goal.progress}% complete</span>
            <span className="text-xs text-emerald-600 font-medium">• Live tracking</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Decision card component
function AgentDecisionCard({ decision, onRespond }) {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-md font-medium border border-red-200">High Priority</span>
      case 'medium': return <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md font-medium border border-amber-200">Medium Priority</span>
      case 'low': return <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md font-medium border border-emerald-200">Low Priority</span>
      default: return null
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-4 hover:shadow-sm hover:border-emerald-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="p-1 bg-amber-50 rounded mt-0.5">
            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-slate-900">{decision.title}</p>
            <p className="text-xs text-slate-600 mt-1">{decision.description}</p>
          </div>
        </div>
        {decision.priority && getPriorityBadge(decision.priority)}
      </div>
      
      {decision.confidence && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">Confidence Level</span>
            <span className="text-xs font-medium text-emerald-600">{decision.confidence}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2 rounded-lg transition-all duration-700 ease-out" 
              style={{ width: `${decision.confidence}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={() => onRespond(decision.id, 'approve')}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Approve
        </button>
        <button
          onClick={() => onRespond(decision.id, 'decline')}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors duration-200"
        >
          Decline
        </button>
      </div>
    </div>
  )
}