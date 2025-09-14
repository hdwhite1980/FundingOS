/**
 * Clippy-Style Assistant Component
 * 
 * A Microsoft Clippy-inspired AI assistant that appears as a floating icon
 * with speech bubbles, providing contextual help and guidance.
 */

'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  X, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Lightbulb,
  FileText,
  Sparkles,
  Clock,
  HelpCircle,
  ArrowRight,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClippyAssistant({ 
  isVisible = true,
  onClose,
  userProfile,
  allProjects = [],
  opportunities = [],
  submissions = [],
  isProactiveMode = false,
  triggerContext = {},
  onFormUpdate,
  onSuggestionApply
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [conversation, setConversation] = useState([])
  const [showInput, setShowInput] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [assistantState, setAssistantState] = useState('idle') // idle, talking, listening, thinking
  const [currentAction, setCurrentAction] = useState(null)
  const inputRef = useRef(null)

  // Animation states for the Clippy character
  const [eyesBlink, setEyesBlink] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Blink animation
    const blinkInterval = setInterval(() => {
      setEyesBlink(true)
      setTimeout(() => setEyesBlink(false), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  useEffect(() => {
    if (isVisible && !isOpen) {
      // Auto-open after a short delay when visible
      setTimeout(() => {
        setIsOpen(true)
        if (isProactiveMode) {
          setTimeout(() => startProactiveConversation(), 500)
        } else {
          setTimeout(() => startGenericGreeting(), 500)
        }
      }, 500)
    }
  }, [isVisible, isProactiveMode])

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const startProactiveConversation = () => {
    setIsThinking(true)
    setAssistantState('thinking')
    
    setTimeout(() => {
      const message = generateProactiveMessage()
      showMessage(message, () => {
        // After showing the proactive message, offer help
        setTimeout(() => {
          showMessage("Would you like me to help you with this?", () => {
            setShowInput(true)
            setAssistantState('listening')
          })
        }, 2000)
      })
    }, 1000)
  }

  const startGenericGreeting = () => {
    setIsThinking(true)
    setAssistantState('thinking')
    
    setTimeout(() => {
      const greeting = `👋 Hi ${userProfile?.full_name?.split(' ')[0] || 'there'}! I'm your funding assistant. I can help you find opportunities, complete applications, and track deadlines.`
      showMessage(greeting, () => {
        setTimeout(() => {
          showMessage("What would you like to work on today?", () => {
            setShowInput(true)
            setAssistantState('listening')
          })
        }, 2000)
      })
    }, 1000)
  }

  const generateProactiveMessage = () => {
    const { trigger, context } = triggerContext
    
    switch (trigger) {
      case 'deadline_approaching':
        return `⏰ Hey! You have an application deadline in ${context?.daysLeft} days. Want me to help you get ready?`
      
      case 'incomplete_application':
        return `📝 I noticed your application is ${context?.completionPercentage}% complete. Let me help you finish it!`
      
      case 'compliance_issue':
        return `⚠️ There are some compliance items that need attention for your ${context?.projectName} project.`
      
      case 'new_opportunity':
        return `🎯 Great news! I found ${context?.matchCount} new funding opportunities that match your projects!`
      
      case 'grant_writing_assistance':
        return `✍️ I can help improve your grant narratives and make them more compelling. Want to take a look?`
      
      default:
        return `💡 I'm here to help optimize your funding strategy. I've analyzed your portfolio and have some suggestions!`
    }
  }

  const showMessage = (message, onComplete) => {
    setIsThinking(false)
    setAssistantState('talking')
    setCurrentMessage('')
    setIsAnimating(true)
    
    // Typewriter effect
    let index = 0
    const typeWriter = () => {
      if (index < message.length) {
        setCurrentMessage(prev => prev + message.charAt(index))
        index++
        setTimeout(typeWriter, 30)
      } else {
        setIsAnimating(false)
        setAssistantState('idle')
        if (onComplete) {
          onComplete()
        }
      }
    }
    
    typeWriter()
  }

  const handleUserInput = async (input) => {
    if (!input.trim()) return

    setInputValue('')
    setShowInput(false)
    setAssistantState('thinking')
    setIsThinking(true)

    // Add user message to conversation
    setConversation(prev => [...prev, { type: 'user', content: input }])

    // Simulate processing time
    setTimeout(async () => {
      const response = await processUserInput(input)
      setConversation(prev => [...prev, { type: 'assistant', content: response }])
      
      showMessage(response, () => {
        // Offer follow-up after response
        setTimeout(() => {
          showMessage("Is there anything else I can help you with?", () => {
            setShowInput(true)
            setAssistantState('listening')
          })
        }, 2000)
      })
    }, 1500)
  }

  const processUserInput = async (input) => {
    const lowerInput = input.toLowerCase()
    
    // Intent recognition
    if (lowerInput.includes('deadline') || lowerInput.includes('due date')) {
      const upcomingDeadlines = opportunities.filter(opp => {
        const deadline = new Date(opp.deadline || opp.application_deadline)
        const now = new Date()
        const diffDays = (deadline - now) / (1000 * 60 * 60 * 24)
        return diffDays <= 30 && diffDays > 0
      })
      
      if (upcomingDeadlines.length > 0) {
        return `📅 You have ${upcomingDeadlines.length} upcoming deadlines in the next 30 days. The closest is ${upcomingDeadlines[0]?.title} due ${new Date(upcomingDeadlines[0]?.deadline).toLocaleDateString()}.`
      } else {
        return `✅ Good news! No urgent deadlines in the next 30 days. You're on track!`
      }
    }
    
    if (lowerInput.includes('application') || lowerInput.includes('apply')) {
      const incompleteApps = submissions.filter(s => s.status === 'draft' || s.status === 'in_progress')
      if (incompleteApps.length > 0) {
        return `📝 You have ${incompleteApps.length} applications in progress. Would you like me to help you complete them?`
      } else {
        return `💪 All your applications are submitted! Want me to find new opportunities for you?`
      }
    }
    
    if (lowerInput.includes('opportunity') || lowerInput.includes('grant') || lowerInput.includes('funding')) {
      const highMatchOpps = opportunities.filter(o => o.fit_score > 80)
      if (highMatchOpps.length > 0) {
        return `🎯 I found ${highMatchOpps.length} high-match opportunities (80%+ fit) for your projects. Want me to prioritize them for you?`
      } else {
        return `🔍 Let me search for new opportunities that match your projects. I'll analyze the web for fresh funding sources.`
      }
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
      return `🤖 I can help you with:
• Finding and matching funding opportunities
• Completing application forms
• Tracking deadlines and reminders  
• Improving grant narratives
• Compliance checking
• Strategic funding advice

What would you like to focus on?`
    }
    
    // Default response
    return `🤔 I understand you're asking about "${input}". Let me analyze your portfolio and see how I can help with that specifically.`
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      if (onClose) onClose()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Speech Bubble */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 max-w-sm min-w-64"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Message content */}
              <div className="pr-6">
                {isThinking ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="flex space-x-1">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {currentMessage}
                    {isAnimating && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-1 h-4 bg-gray-800 ml-1"
                      />
                    )}
                  </div>
                )}

                {/* Input field */}
                {showInput && !isThinking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 flex space-x-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUserInput(inputValue)
                        }
                      }}
                      placeholder="Type your response..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleUserInput(inputValue)}
                      disabled={!inputValue.trim()}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Speech bubble pointer */}
              <div className="absolute bottom-0 right-6 transform translate-y-full">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-200 -mt-px"></div>
              </div>
            </motion.div>

            {/* Clippy Character */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-lg cursor-pointer flex items-center justify-center relative overflow-hidden"
              onClick={() => {
                if (!showInput && !isThinking) {
                  setShowInput(true)
                  setAssistantState('listening')
                }
              }}
            >
              {/* Clippy-like character */}
              <div className="relative">
                {/* Body */}
                <motion.div 
                  animate={assistantState === 'talking' ? { y: [0, -1, 0] } : {}}
                  transition={{ duration: 0.5, repeat: assistantState === 'talking' ? Infinity : 0 }}
                  className="w-8 h-10 bg-white rounded-lg relative"
                >
                  {/* Eyes */}
                  <div className="absolute top-2 left-1 right-1 flex justify-between">
                    <motion.div 
                      animate={eyesBlink ? { scaleY: 0.1 } : { scaleY: 1 }}
                      transition={{ duration: 0.1 }}
                      className="w-2 h-2 bg-gray-800 rounded-full"
                    />
                    <motion.div 
                      animate={eyesBlink ? { scaleY: 0.1 } : { scaleY: 1 }}
                      transition={{ duration: 0.1 }}
                      className="w-2 h-2 bg-gray-800 rounded-full"
                    />
                  </div>
                  
                  {/* Mouth */}
                  <motion.div 
                    animate={assistantState === 'talking' ? { scaleX: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3, repeat: assistantState === 'talking' ? Infinity : 0 }}
                    className="absolute top-5 left-2 right-2 h-1 bg-gray-800 rounded-full"
                  />
                  
                  {/* Arms */}
                  <div className="absolute top-4 -left-1 w-2 h-1 bg-white rounded rotate-45"></div>
                  <div className="absolute top-4 -right-1 w-2 h-1 bg-white rounded -rotate-45"></div>
                </motion.div>

                {/* Status indicator */}
                {assistantState === 'thinking' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                )}
                
                {assistantState === 'listening' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  />
                )}
              </div>

              {/* Sparkle effects */}
              <AnimatePresence>
                {assistantState === 'talking' && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: -20, y: -15 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute w-2 h-2 text-yellow-300"
                    >
                      <Sparkles className="w-full h-full" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: 1, scale: 1, x: 15, y: -20 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ delay: 0.2 }}
                      className="absolute w-1.5 h-1.5 text-yellow-300"
                    >
                      <Sparkles className="w-full h-full" />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Show/Hide button when closed */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  )
}