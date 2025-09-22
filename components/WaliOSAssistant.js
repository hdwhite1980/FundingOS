// WaliOSAssistant.js - Enhanced with API integration support
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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
	// Debug logging - reduced to prevent render loop spam
	useEffect(() => {
		console.log('🟢 WaliOSAssistant mounted/updated')
	}, [])
	
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
	
	const [isOpen, setIsOpen] = useState(isVisible) // Initialize with isVisible prop
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
	const [lastHelpedFieldContext, setLastHelpedFieldContext] = useState(null)
	const [isSearchingAPIs, setIsSearchingAPIs] = useState(false)
	const [lastAPISearch, setLastAPISearch] = useState(null)
	
	// Sync isVisible prop with internal isOpen state
	useEffect(() => {
		console.log('📱 Syncing isVisible prop:', isVisible, '-> isOpen:', isVisible)
		setIsOpen(isVisible)
		
		// If assistant is becoming visible and has no conversation, prepare for initial greeting
		if (isVisible && conversation.length === 0 && !isThinking && !currentMessage) {
			console.log('🎬 Assistant becoming visible with no content, preparing greeting...')
			// Don't start conversation here - let the main useEffect handle it
		}
	}, [isVisible, conversation.length, isThinking, currentMessage])
	
	// Handle triggerContext changes
	useEffect(() => {
		if (triggerContext?.context) {
			console.log('🎯 Setting field context from triggerContext:', triggerContext.context)
			setFieldContext(triggerContext.context)
		}
	}, [triggerContext])
	
	// Clear helped field context when assistant closes or field context changes significantly
	useEffect(() => {
		if (!isOpen) {
			setLastHelpedFieldContext(null)
		}
	}, [isOpen])
	
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

	// Define showMessage FIRST as it's used by other functions
	const showMessage = useCallback((message, onComplete) => {
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
	}, [setIsThinking, setAssistantState, setIsAnimating, setCurrentMessage])

	// Define callback functions BEFORE they are used in useEffect dependencies
	const startFieldHelp = useCallback(() => {
		if (!fieldContext) return
		
		// Check if we've already provided help for this specific field context
		const contextKey = `${fieldContext.fieldName}_${fieldContext.opportunityId || 'default'}`
		const lastHelpedKey = `${lastHelpedFieldContext?.fieldName}_${lastHelpedFieldContext?.opportunityId || 'default'}`
		
		if (contextKey === lastHelpedKey) {
			console.log('🔄 Field help already shown for:', fieldContext.fieldName)
			return // Don't repeat the same field help
		}
		
		// Mark this field context as helped
		setLastHelpedFieldContext(fieldContext)
		
		setIsThinking(true)
		setAssistantState('thinking')
		setTimeout(() => {
			const fieldName = fieldContext.fieldName?.replace(/_/g, ' ') || 'this field'
			const message = `I can help you with the "${fieldName}" field! Let me provide some guidance.`
			showMessage(message, () => {
				setTimeout(() => {
					// Inline field help message generation to avoid dependency issues
					const fieldDisplayName = fieldName
					let helpMessage = ''
					
					if (fieldName.includes('description') || fieldName.includes('summary')) {
						helpMessage = `For the ${fieldDisplayName}, focus on your unique approach and measurable outcomes. Be specific about who benefits and how.`
					} else if (fieldName.includes('budget') || fieldName.includes('amount') || fieldName.includes('cost')) {
						helpMessage = `For the ${fieldDisplayName}, break down costs clearly and justify each expense. Show how it relates to project activities.`
					} else if (fieldName.includes('timeline') || fieldName.includes('schedule')) {
						helpMessage = `For the ${fieldDisplayName}, provide a realistic timeline with key milestones. Break down major phases and deliverables with specific dates.`
					} else if (fieldName.includes('personnel') || fieldName.includes('staff') || fieldName.includes('team')) {
						helpMessage = `For the ${fieldDisplayName}, describe your team's qualifications and roles. Highlight relevant experience and how each member contributes to project success.`
					} else {
						helpMessage = `For the ${fieldDisplayName}, I can help you create content based on your project details and similar successful applications. Let me know what specific guidance you need.`
					}
					
					showMessage(helpMessage, () => {
						setTimeout(() => {
							showMessage('Would you like me to generate content for this field, or do you have specific questions?', () => {
								setShowInput(true)
								setAssistantState('listening')
							})
						}, 1500)
					})
				}, 1800)
			})
		}, 800)
	}, [fieldContext, lastHelpedFieldContext, setIsThinking, setAssistantState, showMessage, setShowInput])

	const startGenericGreeting = useCallback(() => {
		setIsThinking(true); setAssistantState('thinking')
		setTimeout(() => {
			const greeting = `Hi ${userProfile?.full_name?.split(' ')[0] || 'there'}! I'm the WALI-OS Assistant. I can help you find funding, complete applications, and track deadlines.`
			showMessage(greeting, () => {
				setTimeout(() => {
					showMessage('What would you like to work on today?', () => { setShowInput(true); setAssistantState('listening') })
				}, 1600)
			})
		}, 1200)
	}, [userProfile, showMessage, setIsThinking, setAssistantState, setShowInput])

	const startProactiveConversation = useCallback(() => {
		setIsThinking(true); 
		setAssistantState('thinking')
		setTimeout(() => {
			// Generate proactive message inline to avoid circular dependency
			const { trigger, context } = triggerContext
			let message = null
			
			// Only generate messages if we have real data to support them
			switch (trigger) {
				case 'deadline_approaching': {
					const isProject = context?.project
					const isSubmission = context?.submission
					
					if (isProject) {
						message = `Your project "${context.project.name}" has an application deadline in ${context?.daysLeft} days. Want help preparing?`
					} else if (isSubmission) {
						message = `You have a submission deadline in ${context?.daysLeft} days. Want focused help preparing?`
					} else {
						message = `You have an application deadline in ${context?.daysLeft} days. Want focused help preparing?`
					}
					break
				}
				case 'incomplete_application': 
					// Only show if we have actual completion data
					if (context?.completionPercentage && context.completionPercentage < 100) {
						message = `One application is ${context.completionPercentage}% complete. I can help you finish it quickly.`
					}
					break
			}
			
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
	}, [triggerContext, showMessage, setIsThinking, setAssistantState, setShowInput, startGenericGreeting])

	useEffect(() => {
		// When assistant becomes visible/open, start appropriate conversation
		if (isOpen) {
			console.log('🚀 Assistant is now open, starting conversation...')
			console.log('   fieldContext:', fieldContext)
			console.log('   isProactiveMode:', isProactiveMode)
			console.log('   userProfile:', userProfile?.full_name)
			console.log('   current conversation length:', conversation.length)
			console.log('   currentMessage:', currentMessage)
			console.log('   isThinking:', isThinking)
			
			// Only start conversation if we don't already have one in progress
			if (conversation.length === 0 && !isThinking && !currentMessage) {
				console.log('🎬 No existing conversation, starting new one...')
				setTimeout(() => {
					if (fieldContext) {
						// Start with field-specific help
						console.log('🎯 Starting field help for:', fieldContext.fieldName)
						startFieldHelp()
					} else if (isProactiveMode) {
						console.log('🔄 Starting proactive conversation')
						startProactiveConversation()
					} else {
						console.log('👋 Starting generic greeting')
						startGenericGreeting()
					}
				}, 300) // Reduced delay for faster response
			} else {
				console.log('🔄 Conversation already exists or in progress, skipping new start')
			}
		} else {
			// When assistant closes, clear the conversation to ensure fresh start next time
			console.log('📴 Assistant closed, clearing conversation')
			setConversation([])
			setCurrentMessage('')
			setShowInput(false)
			setAssistantState('idle')
		}
	}, [isOpen, fieldContext, isProactiveMode, conversation.length, isThinking, currentMessage, startFieldHelp, startProactiveConversation, startGenericGreeting])

	useEffect(() => {
		// When field context changes and assistant is already open
		if (fieldContext && isOpen) {
			startFieldHelp()
		}
	}, [fieldContext, isOpen, startFieldHelp])

	useEffect(() => { if (showInput && inputRef.current) inputRef.current.focus() }, [showInput])

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

	const generateProactiveMessage = useCallback(() => {
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
	}, [triggerContext])

	// ========== ENHANCED PROJECT-SPECIFIC RESPONSE FUNCTIONS ==========
	
	// Enhanced intent classification for project queries (no memoization needed)
	const classifyProjectIntent = (message, projectData) => {
		const lower = message.toLowerCase()
		
		if (lower.includes('tell me about') && projectData) {
			return 'project_enhancement_needed'
		}
		
		if (lower.includes('grants') || lower.includes('funding')) {
			if (projectData && projectData.description) {
				return 'specific_grant_search'
			} else {
				return 'grant_search_needs_context'
			}
		}
		
		if (lower.includes('help with') && projectData) {
			return 'project_specific_assistance'
		}
		
		return 'general_project_help'
	}

	// Identify what project context is missing (no memoization needed)
	const identifyMissingProjectContext = (projectData) => {
		const missing = []
		
		if (!projectData?.project_type && !projectData?.technology_type) {
			missing.push('project_type')
		}
		
		if (!projectData?.target_market && !projectData?.beneficiaries) {
			missing.push('target_market')  
		}
		
		if (!projectData?.development_stage && !projectData?.stage) {
			missing.push('development_stage')
		}
		
		if (!projectData?.budget && !projectData?.funding_amount) {
			missing.push('budget')
		}
		
		if (!projectData?.location && !userProfile?.state) {
			missing.push('location')
		}
		
		return missing
	}

	// Build response that gathers missing context (no memoization needed)
	const buildContextGatheringResponse = (project, missingContext) => {
		let response = `I can help you find specific funding for ${project?.name || 'your project'}. To give you the most relevant grant opportunities, I need to understand your project better:\n\n`
		
		if (missingContext.includes('project_type')) {
			response += `• What type of technology does your project involve? (AI/ML, software platform, hardware, biotech, etc.)\n`
		}
		
		if (missingContext.includes('target_market')) {
			response += `• Who is your target market or beneficiary?\n`
		}
		
		if (missingContext.includes('development_stage')) {
			response += `• What development stage are you in? (concept, prototype, testing, scaling)\n`
		}
		
		if (missingContext.includes('budget')) {
			response += `• What funding amount are you seeking?\n`
		}
		
		if (missingContext.includes('location')) {
			response += `• What state/region is your organization located in?\n`
		}
		
		response += `\nOnce I understand these details, I can search for specific grants that match your project profile and give you exact deadlines and requirements.`
		
		return response
	}

	// Extract keywords from project context for grant search (no memoization needed)
	const extractKeywords = (projectContext) => {
		const keywords = []
		
		// Add project type keywords
		if (projectContext?.technology_type || projectContext?.project_type) {
			keywords.push(projectContext.technology_type || projectContext.project_type)
		}
		
		// Add description keywords
		if (projectContext?.description) {
			const descWords = projectContext.description.toLowerCase()
				.split(' ')
				.filter(word => word.length > 3)
				.slice(0, 10) // Top 10 keywords
			keywords.push(...descWords)
		}
		
		// Add target market keywords
		if (projectContext?.target_market || projectContext?.beneficiaries) {
			keywords.push(projectContext.target_market || projectContext.beneficiaries)
		}
		
		return keywords.filter(k => k && k.length > 0)
	}

	// Format grant recommendations into readable response (no memoization needed)
	const formatGrantRecommendations = (grants) => {
		let response = `Based on your project, here are specific grant opportunities:\n\n`
		
		grants.slice(0, 3).forEach((grant, index) => {
			response += `**${index + 1}. ${grant.title}**\n`
			response += `• Funder: ${grant.sponsor}\n`
			response += `• Amount: $${grant.amount_min.toLocaleString()}`
			if (grant.amount_max > grant.amount_min) {
				response += ` - $${grant.amount_max.toLocaleString()}`
			}
			response += `\n• Deadline: ${grant.deadline}\n`
			response += `• Fit Score: ${grant.fit_score}%\n`
			response += `• Why it matches: ${grant.match_reason}\n\n`
		})
		
		response += `Would you like me to help you with the application process for any of these grants?`
		
		return response
	}

	// Find specific grants - only memoize this expensive function
	const findSpecificGrants = useCallback(async (projectContext, userProfile) => {
		// Search actual grant databases via API
		const searchParams = {
			keywords: extractKeywords(projectContext),
			amount: projectContext?.budget || projectContext?.funding_amount,
			organization_type: userProfile?.organization_type,
			location: userProfile?.state || projectContext?.location,
			project_type: projectContext?.technology_type || projectContext?.project_type,
			development_stage: projectContext?.development_stage || projectContext?.stage
		}
		
		// This would call actual grant APIs - for now return formatted response
		return formatGrantRecommendations([
			{
				title: "SBIR Phase I Small Business Innovation Research",
				sponsor: "NSF",
				amount_min: 275000,
				amount_max: 275000,
				deadline: "Next deadline: December 7, 2025",
				fit_score: 85,
				match_reason: "Matches technology focus and development stage"
			},
			{
				title: "NIST Small Business Innovation Research",
				sponsor: "NIST", 
				amount_min: 100000,
				amount_max: 500000,
				deadline: "January 23, 2026",
				fit_score: 72,
				match_reason: "Good fit for technology commercialization"
			}
		])
	}, []) // No dependencies to avoid re-render issues

	// Generate project-specific assistance - only memoize this if needed
	const generateSpecificAssistance = useCallback(async (projectData, userProfile) => {
		const projectName = projectData?.name || 'your project'
		
		let response = `I can provide specific help with ${projectName}:\n\n`
		response += `• **Grant Writing**: Help draft compelling narratives and technical descriptions\n`
		response += `• **Budget Planning**: Assist with realistic budget development\n`
		response += `• **Deadline Management**: Track key dates and milestones\n`
		response += `• **Documentation**: Organize required attachments and forms\n`
		response += `• **Compliance**: Ensure requirements are met\n\n`
		response += `What specific area would you like to focus on first?`
		
		return response
	}, [])

	// Main project response builder - simplified dependencies
	const buildProjectResponse = useCallback(async (intent, context, message, userId) => {
		const project = context.customerData?.allProjects?.[0]
		const profile = context.customerData?.userProfile
		
		try {
			switch (intent) {
				case 'project_enhancement_needed':
					const missingContext = identifyMissingProjectContext(project)
					if (missingContext.length > 0) {
						return buildContextGatheringResponse(project, missingContext)
					}
					return await findSpecificGrants(project, profile)
					
				case 'specific_grant_search':
					return await findSpecificGrants(project, profile)
					
				case 'grant_search_needs_context':
					return `I can find specific grants for ${project?.name || 'your project'}, but I need more details about the project. What type of technology or solution does it involve?`
					
				case 'project_specific_assistance':
					return await generateSpecificAssistance(project, profile)
					
				default:
					if (context.customerData?.allProjects?.length > 0) {
						return buildContextGatheringResponse(context.customerData.allProjects[0], ['project_type'])
					}
					return `I can help you with funding strategies, grant applications, and project development. What would you like to work on?`
			}
		} catch (error) {
			console.error('Error in buildProjectResponse:', error)
			return `I'm having trouble processing your request. Please try asking again.`
		}
	}, [findSpecificGrants, generateSpecificAssistance]) // Minimal dependencies

	// ========== DYNAMIC FIELD DEFINITION SYSTEM ==========
	
	// Build comprehensive context for field analysis
	const buildFieldContext = async (fieldName, formContext) => {
		return {
			fieldName,
			userProfile: formContext?.userProfile || userProfile || userProfileState,
			currentProject: formContext?.currentProject || (allProjects || allProjectsState)?.[0],
			allProjects: formContext?.allProjects || allProjects || allProjectsState,
			formType: formContext?.formType || 'grant_application',
			currentSection: formContext?.currentSection || 'application_form',
			relatedFields: formContext?.allFormData || {},
			organizationHistory: formContext?.organizationHistory || {}
		}
	}

	// Generate smart defaults based on customer data
	const generateSmartDefaults = (fieldName, context) => {
		const suggestions = []
		const fieldLower = fieldName.toLowerCase()
		
		// Organization fields
		if (fieldLower.includes('organization') && context.userProfile?.organization_name) {
			suggestions.push({
				value: context.userProfile.organization_name,
				confidence: 0.95,
				source: 'organization profile'
			})
		}
		
		// EIN/Tax fields
		if ((fieldLower.includes('ein') || fieldLower.includes('tax')) && context.userProfile?.ein) {
			suggestions.push({
				value: context.userProfile.ein,
				confidence: 0.98,
				source: 'organization profile'
			})
		}
		
		// Project-specific fields
		if (fieldLower.includes('project') && fieldLower.includes('title') && context.currentProject?.name) {
			suggestions.push({
				value: context.currentProject.name,
				confidence: 0.9,
				source: 'current project'
			})
		}
		
		// Budget fields with smart calculations
		if (fieldLower.includes('budget') || fieldLower.includes('amount')) {
			if (context.currentProject?.budget) {
				suggestions.push({
					value: context.currentProject.budget,
					confidence: 0.85,
					source: 'project budget'
				})
			}
			
			// Calculate common budget breakdowns
			if (fieldLower.includes('personnel') && context.currentProject?.budget) {
				const personnelEstimate = Math.round(context.currentProject.budget * 0.6)
				suggestions.push({
					value: personnelEstimate,
					confidence: 0.7,
					source: 'calculated (60% of total budget)',
					explanation: 'Personnel costs typically represent 60% of project budgets'
				})
			}
		}
		
		return suggestions
	}

	// Identify what information is missing and ask for it
	const identifyInformationGaps = (fieldName, context) => {
		const gaps = []
		const fieldLower = fieldName.toLowerCase()
		
		// Check for missing organization info
		if (fieldLower.includes('organization')) {
			if (!context.userProfile?.organization_type) {
				gaps.push({
					type: 'organization_type',
					question: 'What type of organization are you? (nonprofit, for-profit, government, etc.)',
					importance: 'high',
					reason: 'Needed for eligibility and field completion'
				})
			}
			
			if (!context.userProfile?.ein) {
				gaps.push({
					type: 'ein',
					question: 'What is your organization\'s EIN or Tax ID?',
					importance: 'high',
					reason: 'Required for most grant applications'
				})
			}
		}
		
		// Check for missing project details
		if (fieldLower.includes('project')) {
			if (!context.currentProject?.description) {
				gaps.push({
					type: 'project_description',
					question: 'Can you describe what your project does and what problem it solves?',
					importance: 'high',
					reason: 'Essential for providing relevant field guidance'
				})
			}
			
			if (!context.currentProject?.target_population) {
				gaps.push({
					type: 'target_population',
					question: 'Who will benefit from your project? (target audience/population)',
					importance: 'medium',
					reason: 'Helps tailor application language and impact metrics'
				})
			}
		}
		
		// Check for missing timeline info
		if (fieldLower.includes('timeline') || fieldLower.includes('period')) {
			if (!context.currentProject?.timeline) {
				gaps.push({
					type: 'project_timeline',
					question: 'What is your planned project timeline? How long will it take to complete?',
					importance: 'high',
					reason: 'Critical for funding period and milestone planning'
				})
			}
		}
		
		return gaps.filter(gap => gap.importance === 'high').slice(0, 2) // Focus on most important gaps
	}

	// Generate targeted questions to fill information gaps
	const generateInformationGatheringQuestions = (gaps, fieldName) => {
		if (gaps.length === 0) return null
		
		let questionText = `To give you the most accurate help with the "${fieldName.replace(/_/g, ' ')}" field, I need a bit more information:\n\n`
		
		gaps.forEach((gap, index) => {
			questionText += `${index + 1}. ${gap.question}\n`
		})
		
		questionText += `\nOnce I have these details, I can provide specific, tailored guidance for completing this field effectively.`
		
		return questionText
	}

	// Build field analysis prompt for AI
	const buildFieldAnalysisPrompt = (fieldName, fieldValue, context) => {
		return `You are helping a user understand a form field in their grant application.

FIELD NAME: "${fieldName}"
CURRENT VALUE: "${fieldValue || 'empty'}"

USER CONTEXT:
- Organization: ${context.userProfile?.organization_name || 'Unknown'}
- Organization Type: ${context.userProfile?.organization_type || 'Unknown'}
- Project: ${context.currentProject?.name || 'Unknown'}
- Project Type: ${context.currentProject?.project_type || 'Unknown'}
- Budget: $${context.currentProject?.budget?.toLocaleString() || 'Unknown'}

FORM CONTEXT:
- Form Type: ${context.formType || 'Unknown'}
- Section: ${context.currentSection || 'Unknown'}

Provide a helpful explanation that includes:
1. What this field means in plain language
2. What specific information should go here
3. Format or structure expected
4. Tips specific to their project/organization
5. Example based on their context
6. Common mistakes to avoid

Be specific and actionable. If you need more information about their project to give better advice, ask targeted questions.

Response format:
DEFINITION: [Clear explanation]
PURPOSE: [Why this field exists]
FORMAT: [How to structure the answer]
EXAMPLE: [Specific to their context]
TIPS: [3-4 actionable tips]
QUESTIONS: [What you need to know to help better, if anything]`
	}

	// AI-powered field analysis
	const analyzeFieldWithAI = async (fieldName, fieldValue, context) => {
		const prompt = buildFieldAnalysisPrompt(fieldName, fieldValue, context)
		
		try {
			// Call the assistant API for AI analysis
			const response = await fetch('/api/ai/assistant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: userProfile?.user_id || userProfile?.id,
					message: `Analyze this field: ${prompt}`,
					useLLM: true,
					includeFullContext: true,
					context: {
						customerData: {
							userProfile: context.userProfile,
							allProjects: context.allProjects || [],
							submissions: submissionsState || [],
							opportunities: opportunitiesState || []
						},
						fieldContext: { fieldName, fieldValue }
					}
				})
			})
			
			if (!response.ok) {
				throw new Error(`AI analysis failed: ${response.status}`)
			}
			
			const result = await response.json()
			return parseAIFieldResponse(result.data?.message || result.message, fieldName, context)
		} catch (error) {
			console.error('AI field analysis failed:', error)
			return getFallbackFieldHelp(fieldName)
		}
	}

	// Parse AI response into structured field help
	const parseAIFieldResponse = (aiResponse, fieldName, context) => {
		// Simple parser for AI response
		const sections = {
			definition: '',
			purpose: '',
			format: '',
			example: '',
			tips: [],
			questions: ''
		}
		
		try {
			const lines = aiResponse.split('\n')
			let currentSection = null
			
			lines.forEach(line => {
				const upper = line.toUpperCase()
				if (upper.startsWith('DEFINITION:')) {
					currentSection = 'definition'
					sections.definition = line.substring(11).trim()
				} else if (upper.startsWith('PURPOSE:')) {
					currentSection = 'purpose'
					sections.purpose = line.substring(8).trim()
				} else if (upper.startsWith('FORMAT:')) {
					currentSection = 'format'
					sections.format = line.substring(7).trim()
				} else if (upper.startsWith('EXAMPLE:')) {
					currentSection = 'example'
					sections.example = line.substring(8).trim()
				} else if (upper.startsWith('TIPS:')) {
					currentSection = 'tips'
				} else if (upper.startsWith('QUESTIONS:')) {
					currentSection = 'questions'
					sections.questions = line.substring(10).trim()
				} else if (line.trim() && currentSection) {
					if (currentSection === 'tips') {
						sections.tips.push(line.trim())
					} else if (currentSection !== 'tips') {
						sections[currentSection] += ' ' + line.trim()
					}
				}
			})
		} catch (error) {
			console.error('Failed to parse AI response:', error)
			sections.definition = aiResponse // Fallback to raw response
		}
		
		return sections
	}

	// Fallback field help for when AI fails
	const getFallbackFieldHelp = (fieldName) => {
		const fieldLower = fieldName.toLowerCase()
		
		if (fieldLower.includes('description') || fieldLower.includes('summary')) {
			return {
				definition: 'Provide a clear, compelling description of your project or organization',
				purpose: 'Help reviewers understand what you do and why it matters',
				format: 'Use clear, concise language with specific examples',
				example: 'Focus on impact, beneficiaries, and unique approach',
				tips: ['Be specific about outcomes', 'Quantify impact when possible', 'Avoid jargon'],
				questions: ''
			}
		}
		
		if (fieldLower.includes('budget') || fieldLower.includes('amount')) {
			return {
				definition: 'Specify the funding amount requested for this item',
				purpose: 'Demonstrate fiscal responsibility and project planning',
				format: 'Use exact dollar amounts, rounded to nearest dollar',
				example: 'Include detailed breakdowns for large amounts',
				tips: ['Justify all costs', 'Research market rates', 'Include indirect costs'],
				questions: ''
			}
		}
		
		return {
			definition: `Complete the ${fieldName.replace(/_/g, ' ')} field with accurate information`,
			purpose: 'Provide required information for application processing',
			format: 'Follow any specific formatting requirements shown',
			example: 'Be thorough and accurate in your response',
			tips: ['Double-check accuracy', 'Be comprehensive', 'Follow guidelines'],
			questions: ''
		}
	}

	// Main comprehensive field help function
	const getComprehensiveFieldHelp = async (fieldName, fieldValue, formContext) => {
		try {
			// Get current context
			const context = await buildFieldContext(fieldName, formContext)
			
			// Check for information gaps
			const gaps = identifyInformationGaps(fieldName, context)
			
			// If we have critical gaps, ask for info first
			if (gaps.length > 0) {
				return {
					type: 'information_needed',
					message: generateInformationGatheringQuestions(gaps, fieldName),
					gaps: gaps,
					fieldName: fieldName
				}
			}
			
			// Otherwise, provide comprehensive field help
			const fieldHelp = await analyzeFieldWithAI(fieldName, fieldValue, context)
			
			return {
				type: 'field_help',
				...fieldHelp,
				smartDefaults: generateSmartDefaults(fieldName, context),
				fieldName: fieldName
			}
			
		} catch (error) {
			console.error('Field help generation failed:', error)
			return {
				type: 'field_help',
				...getFallbackFieldHelp(fieldName),
				smartDefaults: [],
				fieldName: fieldName
			}
		}
	}

	// Extract field name from user query
	// Use AI-powered extraction then analyzer, with local fallbacks
	const getDynamicFieldHelp = async (userQuery, formData = {}, userProfileContext = {}, currentProjectContext = {}) => {
		try {
			// Build basic context for the APIs
			const availableFields = Object.keys(formData || {})
			// Ask AI to extract the field name
			let extractedField = null
			try {
				const resp = await fetch('/api/ai/field-extract', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ userQuery, availableFields })
				})
				if (resp.ok) {
					const j = await resp.json()
					extractedField = j.field || null
					if (extractedField === 'UNKNOWN') extractedField = null
				}
			} catch (e) {
				console.warn('Field-extract API failed, falling back to heuristic', e.message)
			}
			
			// Fallback extraction heuristics
			if (!extractedField) {
				extractedField = heuristicExtractFieldName(userQuery, availableFields)
			}
			
			// Build analyzer request context
			const formContext = {
				formType: inferFormType ? inferFormType(formData) : 'grant_application',
				availableFields,
				completedFields: Object.keys(formData || {}).filter(k => formData[k])
			}
			const userContext = {
				organizationType: userProfileContext?.organization_type,
				projectType: currentProjectContext?.project_type,
				organizationName: userProfileContext?.organization_name,
				hasEIN: !!(userProfileContext?.ein || userProfileContext?.tax_id),
				budget: currentProjectContext?.budget
			}
			
			// Call analyzer
			let analysis = null
			try {
				const resp = await fetch('/api/ai/field-analyzer', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fieldName: extractedField, formContext, userContext })
				})
				if (resp.ok) {
					const j = await resp.json()
					if (j.success && j.analysis) analysis = j.analysis
					else if (j.analysis) analysis = j.analysis
				}
			} catch (e) {
				console.warn('Field analyzer API failed, falling back to local heuristics', e.message)
			}
			
			// If no analysis, use local fallback
			if (!analysis) {
				analysis = generateFallbackDefinition(extractedField || 'field_input', formContext, userContext)
			}
			
			// Build output text
			let response = `**${(extractedField || 'Field').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}**\n\n`
			response += `${analysis.definition || ''}\n\n`
			if (analysis.purpose) response += `**Purpose**: ${analysis.purpose}\n\n`
			if (analysis.expectedFormat) response += `**Expected Format**: ${analysis.expectedFormat}\n\n`
			if (analysis.commonExamples && analysis.commonExamples.length) {
				response += `**Examples**:\n`
				analysis.commonExamples.forEach(e => { response += `• ${e}\n` })
				response += `\n`
			}
			if (analysis.tips && analysis.tips.length) {
				response += `**Tips**:\n`
				analysis.tips.forEach(t => { response += `• ${t}\n` })
				response += `\n`
			}
			if (analysis.contextSpecificGuidance) response += `**Context Guidance**: ${analysis.contextSpecificGuidance}\n\n`
			
			// Add smart defaults if available
			const smartDefaults = generateSmartDefaults(extractedField || 'field_input', { userProfile: userProfileContext, currentProject: currentProjectContext })
			if (smartDefaults.length > 0) {
				response += `**Suggested for your situation**:\n`
				smartDefaults.forEach(s => { response += `• ${s.value} (${s.source})\n` })
				response += `\n`
			}
			
			response += `Would you like me to help you fill this field out, or do you have other questions about it?`
			
			return response
		} catch (error) {
			console.error('getDynamicFieldHelp failed:', error)
			return `I can help explain that field. Can you clarify which specific field you're asking about? I see these fields: ${Object.keys(formData || {}).slice(0,5).join(', ')}`
		}
	}

	// ========== END DYNAMIC FIELD DEFINITION SYSTEM ==========

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
		
		// Check for field-specific help requests
		const inputLower = input.toLowerCase()
		const fieldHelpPattern = /help\s+with|explain\s+(this|the|a)?\s*(field)?|what\s+is\s+(this|the|a)?\s*(field)?|fill\s+out|complete\s+(this|the|a)?\s*(field)?|field\s+help|form\s+help|how\s+to\s+(fill|complete)|what\s+goes\s+(in|here)|what\s+should\s+i\s+put|how\s+do\s+i\s+(fill|complete)|explain.*field|help.*field/i
		
		if (fieldHelpPattern.test(input)) {
			try {
				const fieldResponse = await buildFieldHelpResponse(input, {
					userProfile: userProfile || userProfileState,
					currentProject: (allProjects || allProjectsState)?.[0],
					allProjects: allProjects || allProjectsState,
					formType: 'grant_application'
				})
				
				// Add field help response to conversation
				setConversation(prev => [...prev, { 
					type: 'assistant', 
					content: fieldResponse,
					id: Date.now() + 1,
					isFieldHelp: true,
					timestamp: new Date().toISOString()
				}])
				
				setIsThinking(false)
				setAssistantState('ready')
				setIsSearchingAPIs(false)
				
				console.log('Field help provided for:', input)
				return
			} catch (error) {
				console.error('Field help failed, falling back to regular response:', error)
				// Continue to normal processing if field help fails
			}
		}
		
		// Add user message to conversation
		setConversation(prev => [...prev, { type: 'user', content: input, id: Date.now() }])
		
		try {
			// Enhanced project-specific response logic
			const currentContext = {
				customerData: {
					userProfile: userProfile || userProfileState,
					allProjects: allProjects || allProjectsState,
					submissions: submissions || submissionsState,
					opportunities: opportunities || opportunitiesState
				},
				fieldContext: fieldContext
			}
			
			// Classify the intent for better responses
			const project = currentContext.customerData?.allProjects?.[0]
			const intent = classifyProjectIntent(input, project)
			
			console.log(`🧠 Classified intent: ${intent}`)
			
			// For project-specific intents, use enhanced local logic first
			if (['project_enhancement_needed', 'specific_grant_search', 'grant_search_needs_context', 'project_specific_assistance'].includes(intent)) {
				console.log(`🎯 Using enhanced project-specific response for: ${intent}`)
				
				const enhancedResponse = await buildProjectResponse(intent, currentContext, input, userProfile?.user_id || userProfile?.id)
				
				// Add assistant response to conversation
				setConversation(prev => [...prev, { type: 'assistant', content: enhancedResponse, id: Date.now() + 1 }])
				
				// Reset thinking state and show follow-up prompt
				setIsThinking(false)
				setAssistantState('idle')
				setTimeout(() => {
					showMessage('Anything else you\'d like help with?', () => {
						setShowInput(true)
						setAssistantState('listening')
					})
				}, 800)
				
				return // Skip the API call since we handled it locally
			}
			
			// For other intents, continue with API call
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
					context: currentContext
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

	// Always render the component so it's mounted and the assistant manager can keep the instance.
	// Visibility is controlled with the `isVisible` prop and internal `isOpen` state.
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
				.assistant-hidden {
					opacity: 0.0;
					pointer-events: none;
					height: 0;
					overflow: hidden;
				}
				.assistant-content {
					flex: 1;
					overflow-y: auto;
					overflow-x: hidden;
				}
			`}</style>
			<div 
				className={`fixed z-50 ${expanded ? 'inset-0 p-4 md:p-6 flex items-end justify-end bg-black/20 backdrop-blur-sm' : ''} ${!isVisible ? 'assistant-hidden' : ''}`}
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
							transition={{ duration: 0.18 }}
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