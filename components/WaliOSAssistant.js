/**
 * Wali-OS Assistant Component
 * Contextual AI funding assistant (formerly ClippyAssistant).
 */
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Sparkles, Send, GripHorizontal } from 'lucide-react'

export default function WaliOSAssistant({ 
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
	// Singleton pattern - prevent multiple instances
	useEffect(() => {
		const existingAssistant = document.querySelector('[data-wali-assistant="true"]')
		if (existingAssistant && existingAssistant !== document.querySelector('[data-wali-assistant="true"]')) {
			console.log('WALI-OS Assistant already exists, preventing duplicate')
			onClose && onClose()
			return
		}
	}, [onClose])
	const [isOpen, setIsOpen] = useState(false)
	const [expanded, setExpanded] = useState(false)
	const [currentMessage, setCurrentMessage] = useState('')
	const [isThinking, setIsThinking] = useState(false)
	const [conversation, setConversation] = useState([])
	const [showInput, setShowInput] = useState(false)
	const [inputValue, setInputValue] = useState('')
	const [assistantState, setAssistantState] = useState('idle')
	const inputRef = useRef(null)
	const scrollRef = useRef(null)
	const [eyesBlink, setEyesBlink] = useState(false)
	const [isAnimating, setIsAnimating] = useState(false)
	
	// Drag and drop state
	const [position, setPosition] = useState({ x: 0, y: 0 })
	const [isDragging, setIsDragging] = useState(false)
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
	const assistantRef = useRef(null)

	// Load saved position on mount
	useEffect(() => {
		const savedPosition = localStorage.getItem('waliOSAssistantPosition')
		if (savedPosition) {
			try {
				const parsed = JSON.parse(savedPosition)
				setPosition(parsed)
			} catch (e) {
				console.warn('Failed to parse saved assistant position:', e)
			}
		}
	}, [])

	// Save position when it changes
	useEffect(() => {
		if (position.x !== 0 || position.y !== 0) {
			localStorage.setItem('waliOSAssistantPosition', JSON.stringify(position))
		}
	}, [position])

	useEffect(() => {
		const blinkInterval = setInterval(() => {
			setEyesBlink(true)
			setTimeout(() => setEyesBlink(false), 150)
		}, 3000 + Math.random() * 2000)
		return () => clearInterval(blinkInterval)
	}, [])

	useEffect(() => {
		if (isVisible && !isOpen) {
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

	useEffect(() => { if (showInput && inputRef.current) inputRef.current.focus() }, [showInput])

	const startProactiveConversation = () => {
		setIsThinking(true); setAssistantState('thinking')
		setTimeout(() => {
			const message = generateProactiveMessage()
			console.log('Generated proactive message:', JSON.stringify(message)) // Debug log
			showMessage(message, () => {
				setTimeout(() => {
					const followUp = 'Would you like help with this now?'
					console.log('Generated follow-up message:', JSON.stringify(followUp)) // Debug log
					showMessage(followUp, () => { setShowInput(true); setAssistantState('listening') })
				}, 1800)
			})
		}, 800)
	}

	const startGenericGreeting = () => {
		setIsThinking(true); setAssistantState('thinking')
		setTimeout(() => {
			const greeting = `👋 Hi ${userProfile?.full_name?.split(' ')[0] || 'there'}! I'm the Wali-OS Assistant. I can help you find funding, complete applications, and track deadlines.`
			showMessage(greeting, () => {
				setTimeout(() => {
					showMessage('What would you like to work on today?', () => { setShowInput(true); setAssistantState('listening') })
				}, 1600)
			})
		}, 800)
	}

	const generateProactiveMessage = () => {
		const { trigger, context } = triggerContext
		switch (trigger) {
			case 'deadline_approaching': {
				const { context } = triggerContext
				const isProject = context?.project
				const isSubmission = context?.submission
				
				if (isProject) {
					return `⏰ Your project "${context.project.name}" has an application deadline in ${context?.daysLeft} days. Want help preparing?`
				} else if (isSubmission) {
					return `⏰ You have a submission deadline in ${context?.daysLeft} days. Want focused help preparing?`
				} else {
					return `⏰ You have an application deadline in ${context?.daysLeft} days. Want focused help preparing?`
				}
			}
			case 'incomplete_application': return `📝 One application is ${context?.completionPercentage}% complete. I can help you finish it quickly.`
			case 'compliance_issue': return `⚠️ Some compliance items need attention for ${context?.projectName}. Shall we review them?`
			case 'new_opportunity': return `🎯 I found ${context?.matchCount} new high-fit opportunities for your portfolio.`
			case 'grant_writing_assistance': return `✍️ I can strengthen your grant narratives and impact statements. Interested?`
			default: return '💡 I have strategic recommendations to optimize your funding pipeline.'
		}
	}

	const showMessage = (message, onComplete) => {
		console.log('WaliOS showMessage called with:', JSON.stringify(message)) // Debug log
		setIsThinking(false) 
		setAssistantState('talking')
		setIsAnimating(true)
		
		// Reset message state immediately and ensure it's really empty
		setCurrentMessage('')
		
		setTimeout(() => {
			const fullMessage = message.toString() // Ensure it's a string
			console.log('WaliOS fullMessage:', JSON.stringify(fullMessage)) // Debug log
			
			// Use a more direct approach - build the message directly instead of relying on prev state
			let currentIndex = 0
			const typeWriter = () => {
				if (currentIndex < fullMessage.length) { 
					const nextChar = fullMessage.charAt(currentIndex)
					currentIndex++
					
					// Set the message directly from the source instead of using prev state
					const newMessage = fullMessage.substring(0, currentIndex)
					console.log(`Character ${currentIndex-1}: "${nextChar}" -> Message: "${newMessage}"`) // Debug log
					
					setCurrentMessage(newMessage)
					setTimeout(typeWriter, 28) 
				} else { 
					console.log('Typewriter complete, final message:', fullMessage) // Debug log
					setIsAnimating(false)
					setAssistantState('idle')
					if (onComplete) onComplete()
				}
			}
			
			typeWriter()
		}, 50) // Small delay to ensure state is reset
	}

	const handleUserInput = async (input) => {
		if (!input.trim()) return
		setInputValue(''); setShowInput(false); setAssistantState('thinking'); setIsThinking(true)
		setConversation(prev => [...prev, { type: 'user', content: input, id: Date.now() }])
		setTimeout(async () => {
			const response = await processUserInput(input)
			setConversation(prev => [...prev, { type: 'assistant', content: response, id: Date.now()+1 }])
			showMessage(response, () => {
				setTimeout(() => { showMessage('Anything else you’d like help with?', () => { setShowInput(true); setAssistantState('listening') }) }, 1600)
			})
		}, 1200)
	}

	const processUserInput = async (input) => {
		const lowerInput = input.toLowerCase()
		try {
			if (userProfile?.user_id || userProfile?.id) {
				const userId = userProfile.user_id || userProfile.id
				const resp = await fetch('/api/ai/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message: input, useLLM: true }) })
				if (resp.ok) { const json = await resp.json(); return json.data?.message || 'Processing your request...' }
			}
		} catch (e) { console.warn('Assistant API failed; using heuristic fallback', e) }
		if (lowerInput.includes('deadline')) {
			const upcoming = opportunities.filter(o => { const d = new Date(o.deadline || o.application_deadline); const diff = (d - Date.now())/86400000; return diff <= 30 && diff > 0 })
			return upcoming.length ? `📅 ${upcoming.length} deadlines in 30 days. Closest: ${upcoming[0]?.title}` : '✅ No urgent deadlines in the next 30 days.'
		}
		if (lowerInput.includes('application')) {
			const drafts = submissions.filter(s => ['draft','in_progress'].includes(s.status))
			return drafts.length ? `📝 ${drafts.length} applications in progress. Want prioritization help?` : '💪 All applications submitted. Want new opportunities?'
		}
		if (lowerInput.includes('opportunity') || lowerInput.includes('grant')) {
			const high = opportunities.filter(o => o.fit_score > 80)
			return high.length ? `🎯 ${high.length} high-match (80%+) opportunities identified. Prioritize now?` : '🔍 I can scan for new high-fit opportunities.'
		}
		if (lowerInput.includes('help') || lowerInput.includes('what can')) {
			return '🤖 I can help with:\n• Opportunity discovery & matching\n• Application completion & narrative improvement\n• Deadline tracking & reminders\n• Compliance readiness\n• Strategic funding insights\n\nWhat should we tackle first?'
		}
		return `I’ll analyze how "${input}" maps to your funding strategy and follow up with actionable steps.`
	}

	// Drag functionality
	const handleMouseDown = (e) => {
		if (expanded) return // Don't allow dragging when expanded
		setIsDragging(true)
		setDragStart({
			x: e.clientX - position.x,
			y: e.clientY - position.y
		})
		e.preventDefault()
	}

	const handleMouseMove = (e) => {
		if (!isDragging) return
		
		const newX = e.clientX - dragStart.x
		const newY = e.clientY - dragStart.y
		
		// Keep assistant within viewport bounds
		const windowWidth = window.innerWidth
		const windowHeight = window.innerHeight
		const assistantWidth = 320 // approximate width
		const assistantHeight = 400 // approximate height
		
		const boundedX = Math.max(-assistantWidth + 64, Math.min(windowWidth - 64, newX))
		const boundedY = Math.max(0, Math.min(windowHeight - assistantHeight, newY))
		
		setPosition({ x: boundedX, y: boundedY })
	}

	const handleMouseUp = () => {
		setIsDragging(false)
	}

	// Add global mouse event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			
			return () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
			}
		}
	}, [isDragging, dragStart, position])

	const handleClose = () => { setIsOpen(false); setTimeout(() => onClose && onClose(), 280) }
	if (!isVisible) return null

	return (
		<div 
			className={`fixed z-50 ${expanded ? 'inset-0 p-4 md:p-6 flex items-end justify-end bg-black/20 backdrop-blur-sm' : ''}`}
			data-wali-assistant="true"
			style={expanded ? {} : 
				position.x === 0 && position.y === 0 
					? { bottom: '24px', right: '24px' } // Default position
					: { left: `${position.x}px`, top: `${position.y}px` } // Custom position
			}
		>
			<AnimatePresence>
				{isOpen && (
					<>
						<motion.div
							ref={assistantRef}
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							className={`${expanded ? 'relative w-full h-full md:w-[600px] md:h-[80vh]' : ''} bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col p-4 max-w-sm min-w-64 ${isDragging && !expanded ? 'shadow-2xl ring-2 ring-emerald-500/50' : ''}`}
							style={!expanded ? { 
								cursor: isDragging ? 'grabbing' : 'default',
								transition: isDragging ? 'none' : 'all 0.2s ease'
							} : {}}
						>
							<div className="flex items-start justify-between mb-2">
								<div 
									className={`text-xs text-gray-500 font-medium flex items-center gap-2 ${!expanded ? 'cursor-move select-none' : ''}`}
									onMouseDown={!expanded ? handleMouseDown : undefined}
									title={!expanded ? "Drag to move assistant" : ""}
								>
									{!expanded && (
										<GripHorizontal className="w-3 h-3 text-gray-400" />
									)}
									Wali-OS Assistant
									{isDragging && !expanded && (
										<span className="text-emerald-500 text-xs">Moving...</span>
									)}
								</div>
								<div className="flex items-center gap-1">
									<button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 p-1" title={expanded ? 'Collapse' : 'Expand'}>
										{expanded ? <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 11h6v6H7v-4H3v-2zm14-2h-6V3h2v4h4v2z"/></svg> : <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3h2v6H3V7h4V3zm6 14h-2v-6h6v2h-4v4z"/></svg>}
									</button>
									<button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1" title="Close">
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
							<div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 space-y-3 mt-2 custom-scrollbar">
								{conversation.map(msg => (
									<div key={msg.id} className={`text-sm leading-relaxed ${msg.type==='user' ? 'text-gray-900' : 'text-gray-800'}`}>
										<span className={`inline-block px-3 py-2 rounded-lg shadow-sm ${msg.type==='user' ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>{msg.content}</span>
									</div>
								))}
								{(currentMessage || isThinking) && (
									<div className="text-sm text-gray-800">
										<span className="inline-block px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 shadow-sm">
											{isThinking ? (
												<span className="flex items-center gap-2">
													<span className="flex space-x-1">
														<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
														<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
														<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
													</span>
													Thinking...
												</span>
											) : (
												<>
													{currentMessage}
													{isAnimating && (
														<motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-1 h-4 bg-gray-800 ml-1" />
													)}
												</>
											)}
										</span>
									</div>
								)}
							</div>
							{showInput && !isThinking && (
								<div className="mt-3 flex space-x-2">
									<input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUserInput(inputValue) }} placeholder="Ask about funding, applications, deadlines..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
									<button onClick={() => handleUserInput(inputValue)} disabled={!inputValue.trim()} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
										<Send className="w-4 h-4" />
									</button>
								</div>
							)}
						</motion.div>
						<motion.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							exit={{ scale: 0, rotate: 180 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className={`${expanded ? 'hidden md:flex absolute -bottom-6 right-4' : 'w-16 h-16'} bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-lg cursor-pointer flex items-center justify-center relative overflow-hidden ${expanded ? 'w-14 h-14' : ''}`}
							onClick={() => { if (!showInput && !isThinking) { setShowInput(true); setAssistantState('listening') } }}
						>
							<div className="relative">
								<motion.div animate={assistantState === 'talking' ? { y: [0, -1, 0] } : {}} transition={{ duration: 0.5, repeat: assistantState === 'talking' ? Infinity : 0 }} className="w-8 h-10 bg-white rounded-lg relative">
									<div className="absolute top-2 left-1 right-1 flex justify-between">
										<motion.div animate={eyesBlink ? { scaleY: 0.1 } : { scaleY: 1 }} transition={{ duration: 0.1 }} className="w-2 h-2 bg-gray-800 rounded-full" />
										<motion.div animate={eyesBlink ? { scaleY: 0.1 } : { scaleY: 1 }} transition={{ duration: 0.1 }} className="w-2 h-2 bg-gray-800 rounded-full" />
									</div>
									<motion.div animate={assistantState === 'talking' ? { scaleX: [1, 1.2, 1] } : {}} transition={{ duration: 0.3, repeat: assistantState === 'talking' ? Infinity : 0 }} className="absolute top-5 left-2 right-2 h-1 bg-gray-800 rounded-full" />
									<div className="absolute top-4 -left-1 w-2 h-1 bg-white rounded rotate-45"></div>
									<div className="absolute top-4 -right-1 w-2 h-1 bg-white rounded -rotate-45"></div>
								</motion.div>
								{assistantState === 'thinking' && (
									<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="absolute -top-2 -right-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
								)}
								{assistantState === 'listening' && (
									<motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
								)}
							</div>
							<AnimatePresence>
								{assistantState === 'talking' && (<>
									<motion.div initial={{ opacity: 0, scale: 0, x: 0, y: 0 }} animate={{ opacity: 1, scale: 1, x: -20, y: -15 }} exit={{ opacity: 0, scale: 0 }} className="absolute w-2 h-2 text-yellow-300"><Sparkles className="w-full h-full" /></motion.div>
									<motion.div initial={{ opacity: 0, scale: 0, x: 0, y: 0 }} animate={{ opacity: 1, scale: 1, x: 15, y: -20 }} exit={{ opacity: 0, scale: 0 }} transition={{ delay: 0.2 }} className="absolute w-1.5 h-1.5 text-yellow-300"><Sparkles className="w-full h-full" /></motion.div>
								</>)}
							</AnimatePresence>
						</motion.div>
					</>
				)}
			</AnimatePresence>
			{!isOpen && (
				<motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsOpen(true)} className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center">
					<MessageCircle className="w-6 h-6" />
				</motion.button>
			)}
		</div>
	)
}