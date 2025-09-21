// WaliOSAssistant.js - Enhanced with API integration support
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Sparkles, Send, GripHorizontal, Search, Database } from 'lucide-react'
import assistantManager from '../utils/assistantManager'

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
	// Register with global assistant manager
	const assistantInstanceRef = useRef({
		show: (context) => {
			setIsOpen(true)
			if (context?.fieldContext) {
				setFieldContext(context.fieldContext)
			}
		},
		hide: () => {
			setIsOpen(false)
			onClose && onClose()
		},
		close: () => {
			setIsOpen(false)
			onClose && onClose()
		},
		setFieldContext: (context) => {
			setFieldContext(context)
			if (context && !isOpen) {
				setIsOpen(true)
			}
		},
		updateData: (data) => {
			// Update component state with new data
			if (data.userProfile) setUserProfile(data.userProfile)
			if (data.allProjects) setAllProjects(data.allProjects)
			if (data.opportunities) setOpportunities(data.opportunities)  
			if (data.submissions) setSubmissions(data.submissions)
		}
	})

	useEffect(() => {
		assistantManager.setInstance(assistantInstanceRef.current)
		assistantManager.updateCustomerData({
			userProfile,
			allProjects,
			opportunities,
			submissions
		})
		
		return () => {
			// Don't clear the instance on unmount, let manager handle it
		}
	}, [])
	
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
	const [fieldContext, setFieldContext] = useState(null)
	const [isSearchingAPIs, setIsSearchingAPIs] = useState(false)
	const [lastAPISearch, setLastAPISearch] = useState(null)
	
	// State for customer data that can be updated
	const [userProfileState, setUserProfile] = useState(userProfile)
	const [allProjectsState, setAllProjects] = useState(allProjects)
	const [opportunitiesState, setOpportunities] = useState(opportunities)
	const [submissionsState, setSubmissions] = useState(submissions)
	
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
				if (fieldContext) {
					// Start with field-specific help
					setTimeout(() => startFieldHelp(), 500)
				} else if (isProactiveMode) {
					setTimeout(() => startProactiveConversation(), 500)
				} else {
					setTimeout(() => startGenericGreeting(), 500)
				}
			}, 500)
		}
	}, [isVisible, isProactiveMode, fieldContext])

	useEffect(() => {
		// When field context changes and assistant is already open
		if (fieldContext && isOpen) {
			startFieldHelp()
		}
	}, [fieldContext, isOpen])

	useEffect(() => { if (showInput && inputRef.current) inputRef.current.focus() }, [showInput])

	const startFieldHelp = () => {
		if (!fieldContext) return
		
		setIsThinking(true)
		setAssistantState('thinking')
		setTimeout(() => {
			const fieldName = fieldContext.fieldName?.replace(/_/g, ' ') || 'this field'
			const message = `I can help you with the "${fieldName}" field! Let me provide some guidance.`
			showMessage(message, () => {
				setTimeout(() => {
					const helpMessage = generateFieldHelpMessage(fieldContext)
					showMessage(helpMessage, () => {
						setTimeout(() => {
							showMessage('Would you like me to generate content for this field, or do you have specific questions?', () => {
								setShowInput(true)
								setAssistantState('listening')
							})
						}, 1500)
					})
				}, 1200)
			})
		}, 500)
	}

	const generateFieldHelpMessage = (context) => {
		const fieldName = context.fieldName?.toLowerCase() || ''
		const fieldDisplayName = context.fieldName?.replace(/_/g, ' ') || 'this field'
		
		if (fieldName.includes('abstract') || fieldName.includes('summary')) {
			return `For the ${fieldDisplayName}, provide a concise overview of your project's goals, methods, and expected outcomes. Keep it clear and compelling - this is often the first thing reviewers read.`
		} else if (fieldName.includes('description') || fieldName.includes('narrative')) {
			return `For the ${fieldDisplayName}, provide detailed information about your project. Include background, methodology, timeline, and expected impact. Be specific and thorough.`
		} else if (fieldName.includes('budget') || fieldName.includes('cost')) {
			return `For the ${fieldDisplayName}, provide detailed financial information. Include direct and indirect costs, and justify all expenses. Make sure numbers align with your project scope.`
		} else if (fieldName.includes('timeline') || fieldName.includes('schedule')) {
			return `For the ${fieldDisplayName}, provide a realistic timeline with key milestones. Break down major phases and deliverables with specific dates.`
		} else if (fieldName.includes('personnel') || fieldName.includes('staff') || fieldName.includes('team')) {
			return `For the ${fieldDisplayName}, describe your team's qualifications and roles. Highlight relevant experience and how each member contributes to project success.`
		} else {
			return `For the ${fieldDisplayName}, I can help you create content based on your project details and similar successful applications. Let me know what specific guidance you need.`
		}
	}

	const startProactiveConversation = () => {
		setIsThinking(true); setAssistantState('thinking')
		setTimeout(() => {
			const message = generateProactiveMessage()
			
			// If no valid proactive message, fall back to generic greeting
			if (!message) {
				startGenericGreeting()
				return
			}
			
			showMessage(message, () => {
				setTimeout(() => {
					const followUp = 'Would you like help with this now?'
					showMessage(followUp, () => { setShowInput(true); setAssistantState('listening') })
				}, 1800)
			})
		}, 800)
	}

	const startGenericGreeting = () => {
		setIsThinking(true); setAssistantState('thinking')
		setTimeout(() => {
			const greeting = `Hi ${userProfile?.full_name?.split(' ')[0] || 'there'}! I'm the WALI-OS Assistant. I can help you find funding, complete applications, and track deadlines.`
			showMessage(greeting, () => {
				setTimeout(() => {
					showMessage('What would you like to work on today?', () => { setShowInput(true); setAssistantState('listening') })
				}, 1600)
			})
		}, 800)
	}

	const generateProactiveMessage = () => {
		const { trigger, context } = triggerContext
		
		// Only generate messages if we have real data to support them
		switch (trigger) {
			case 'deadline_approaching': {
				const { context } = triggerContext
				const isProject = context?.project
				const isSubmission = context?.submission
				
				if (isProject) {
					return `Your project "${context.project.name}" has an application deadline in ${context?.daysLeft} days. Want help preparing?`
				} else if (isSubmission) {
					return `You have a submission deadline in ${context?.daysLeft} days. Want focused help preparing?`
				} else {
					return `You have an application deadline in ${context?.daysLeft} days. Want focused help preparing?`
				}
			}
			case 'incomplete_application': 
				// Only show if we have actual completion data
				if (context?.completionPercentage && context.completionPercentage < 100) {
					return `One application is ${context.completionPercentage}% complete. I can help you finish it quickly.`
				}
				return null // Don't show message if no real data
				
			case 'compliance_issue': 
				// Only show if we have actual compliance issues identified
				if (context?.complianceIssues && context.complianceIssues.length > 0) {
					return `Some compliance items need attention for ${context?.projectName}. Shall we review them?`
				}
				return null // Don't show message if no actual compliance issues
				
			case 'new_opportunity': 
				// Only show if we have actual new opportunities
				if (context?.matchCount && context.matchCount > 0) {
					return `I found ${context.matchCount} new high-fit opportunities for your portfolio.`
				}
				return null
				
			case 'grant_writing_assistance': 
				return `I can strengthen your grant narratives and impact statements. Interested?`
				
			default: 
				return null // Don't show generic messages
		}
	}

	const showMessage = (message, onComplete) => {
		setIsThinking(false) 
		setAssistantState('talking')
		setIsAnimating(true)
		
		// Reset message state immediately and ensure it's really empty
		setCurrentMessage('')
		
		setTimeout(() => {
			const fullMessage = message.toString() // Ensure it's a string
			
			// Use a more direct approach - build the message directly instead of relying on prev state
			let currentIndex = 0
			const typeWriter = () => {
				if (currentIndex < fullMessage.length) { 
					const nextChar = fullMessage.charAt(currentIndex)
					currentIndex++
					
					// Set the message directly from the source instead of using prev state
					const newMessage = fullMessage.substring(0, currentIndex)
					
					setCurrentMessage(newMessage)
					setTimeout(typeWriter, 28) 
				} else { 
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
		
		console.log(`User input: "${input}"`)
		
		setInputValue('')
		setShowInput(false)
		setAssistantState('thinking')
		setIsThinking(true)
		
		// Check if this is a funding strategy request to show API search indicator
		const isFundingRequest = input.toLowerCase().match(/\b(funding\s+ideas|grant\s+ideas|funding\s+options|what\s+grants|funding\s+strategies|find\s+grants|search\s+grants)\b/)
		
		if (isFundingRequest) {
			setIsSearchingAPIs(true)
			setLastAPISearch(new Date())
		}
		
		// Add user message to conversation
		setConversation(prev => [...prev, { type: 'user', content: input, id: Date.now() }])
		
		try {
			// Call the assistant API with full context
			const userId = userProfile?.user_id || userProfile?.id
			
			if (!userId) {
				throw new Error('No user ID available')
			}
			
			console.log(`Calling assistant API for user ${userId}`)
			
			const response = await fetch('/api/ai/assistant', {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId,
					message: input,
					useLLM: true, // Always use LLM for better responses
					includeFullContext: true,
					context: {
						customerData: {
							userProfile: userProfile || userProfileState,
							allProjects: allProjects || allProjectsState,
							submissions: submissions || submissionsState,
							opportunities: opportunities || opportunitiesState
						},
						fieldContext: fieldContext
					}
				})
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || `API error: ${response.status}`)
			}

			const json = await response.json()
			const assistantMessage = json.data?.message || json.message || 'I apologize, but I had trouble processing your request.'
			
			console.log(`Assistant response: "${assistantMessage.substring(0, 100)}..."`)
			console.log(`Debug info:`, json.data?.debugInfo)
			
			// Show API integration indicator if this was a funding strategy request
			if (json.data?.apiIntegration === 'active') {
				console.log('API integration was active for this request')
			}
			
			// Add assistant response to conversation
			setConversation(prev => [...prev, { type: 'assistant', content: assistantMessage, id: Date.now() + 1 }])
			
			// Reset thinking state and show follow-up prompt
			setIsThinking(false)
			setAssistantState('idle')
			setTimeout(() => {
				showMessage('Anything else you\'d like help with?', () => {
					setShowInput(true)
					setAssistantState('listening')
				})
			}, 800)
			
		} catch (error) {
			console.error('Assistant API failed:', error)
			
			const errorMessage = `I'm having trouble connecting to the assistant service. Error: ${error.message}`
			
			setConversation(prev => [...prev, { type: 'assistant', content: errorMessage, id: Date.now() + 1 }])
			
			// Reset thinking state and show follow-up prompt
			setIsThinking(false)
			setAssistantState('idle')
			setTimeout(() => {
				showMessage('Please try again in a moment.', () => {
					setShowInput(true)
					setAssistantState('listening')
				})
			}, 800)
		} finally {
			// Reset API search indicator after a delay
			if (isFundingRequest) {
				setTimeout(() => {
					setIsSearchingAPIs(false)
				}, 2000)
			}
		}
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
		
		// Keep assistant within viewport bounds with better calculations
		const windowWidth = window.innerWidth
		const windowHeight = window.innerHeight
		const assistantWidth = expanded ? 600 : 320 // Dynamic width based on state
		const assistantHeight = expanded ? Math.min(windowHeight * 0.8, 600) : Math.min(windowHeight * 0.7, 500) // Dynamic height
		
		// Ensure minimum visibility (at least 100px visible)
		const minVisible = 100
		const boundedX = Math.max(-assistantWidth + minVisible, Math.min(windowWidth - minVisible, newX))
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
		<>
			<style jsx>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: #f1f1f1;
					border-radius: 3px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: #c1c1c1;
					border-radius: 3px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: #a8a8a8;
				}
				.resize {
					resize: both;
					overflow: auto;
					min-height: 200px;
					max-height: 70vh;
				}
				.resize::-webkit-resizer {
					background: linear-gradient(-45deg, transparent 0px, transparent 2px, #ddd 2px, #ddd 4px, transparent 4px);
				}
				.assistant-container {
					max-height: 70vh;
					display: flex;
					flex-direction: column;
				}
				.assistant-content {
					flex: 1;
					overflow-y: auto;
					overflow-x: hidden;
				}
			`}</style>
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
							className={`${expanded ? 'relative w-full h-full md:w-[600px] md:h-[80vh]' : 'w-80 max-w-[90vw] max-h-[70vh]'} bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col p-4 min-h-[300px] ${isDragging && !expanded ? 'shadow-2xl ring-2 ring-emerald-500/50' : ''} ${expanded ? 'resize-none' : 'resize overflow-auto min-w-64 max-w-[500px] min-h-[200px]'}`}
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
									WALI-OS Assistant
									{isDragging && !expanded && (
										<span className="text-emerald-500 text-xs">Moving...</span>
									)}
									{isSearchingAPIs && (
										<div className="flex items-center gap-1 text-blue-500">
											<Search className="w-3 h-3 animate-pulse" />
											<span className="text-xs">Searching APIs...</span>
										</div>
									)}
								</div>
								<div className="flex items-center gap-1">
									{lastAPISearch && (
										<div className="text-xs text-green-500 flex items-center gap-1" title="Recent API search">
											<Database className="w-3 h-3" />
										</div>
									)}
									<button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 p-1" title={expanded ? 'Collapse' : 'Expand'}>
										{expanded ? <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 11h6v6H7v-4H3v-2zm14-2h-6V3h2v4h4v2z"/></svg> : <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3h2v6H3V7h4V3zm6 14h-2v-6h6v2h-4v4z"/></svg>}
									</button>
									<button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1" title="Close">
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
							<div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-3 mt-2 custom-scrollbar">
								{conversation.map(msg => (
									<div key={msg.id} className={`text-sm leading-relaxed ${msg.type==='user' ? 'text-gray-900' : 'text-gray-800'}`}>
										<span className={`inline-block px-3 py-2 rounded-lg shadow-sm whitespace-pre-wrap break-words max-w-full ${msg.type==='user' ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>{msg.content}</span>
									</div>
								))}
								{(currentMessage || isThinking) && (
									<div className="text-sm text-gray-800">
										<span className="inline-block px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 shadow-sm whitespace-pre-wrap break-words max-w-full">
											{isThinking ? (
												<span className="flex items-center gap-2">
													{isSearchingAPIs ? (
														<>
															<Search className="w-3 h-3 text-blue-500 animate-pulse" />
															<span className="flex space-x-1">
																<span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
																<span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
																<span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
															</span>
															Searching grant databases...
														</>
													) : (
														<>
															<span className="flex space-x-1">
																<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
																<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
																<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
															</span>
															Thinking...
														</>
													)}
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
								{isSearchingAPIs && (
									<motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full" />
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
		</>
	)
}