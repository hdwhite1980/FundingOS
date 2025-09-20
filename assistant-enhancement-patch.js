// Enhanced processUserInput function for WaliOSAssistant.js
// Replace the existing processUserInput function with this enhanced version

const processUserInput = async (input) => {
	const lowerInput = input.toLowerCase()
	try {
		if (userProfile?.user_id || userProfile?.id) {
			const userId = userProfile.user_id || userProfile.id
			
			// Enhanced API call with better context
			const resp = await fetch('/api/ai/assistant', { 
				method: 'POST', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ 
					userId, 
					message: input, 
					useLLM: true,
					mode: 'chat',
					contextData: {
						projects: allProjects,
						opportunities,
						submissions,
						userProfile,
						triggerContext
					}
				}) 
			})
			
			if (resp.ok) { 
				const json = await resp.json()
				console.log('AI Assistant Response:', json) // Debug log
				return json.data?.message || json.message || 'Processing your request...' 
			} else {
				console.error('Assistant API error:', resp.status, resp.statusText)
			}
		}
	} catch (e) { 
		console.warn('Assistant API failed; using enhanced fallback', e) 
	}

	// Enhanced fallback responses with actual project data
	return generateEnhancedFallback(lowerInput, allProjects, opportunities, submissions, userProfile)
}

const generateEnhancedFallback = (lowerInput, projects, opportunities, submissions, profile) => {
	console.log('Using fallback with data:', { projects: projects?.length, opportunities: opportunities?.length, submissions: submissions?.length })

	if (lowerInput.includes('project')) {
		if (!projects || projects.length === 0) {
			return '📊 You haven\'t created any projects yet. Create your first project to get personalized funding recommendations and application assistance.'
		}
		const recentProject = projects[0]
		return `📊 You have ${projects.length} project${projects.length > 1 ? 's' : ''}. Your most recent project is "${recentProject.name}" with a funding request of $${recentProject.funding_request_amount?.toLocaleString() || 'not specified'}. I can help you find matching opportunities, improve your project description, or assist with applications.`
	}

	if (lowerInput.includes('deadline')) {
		const upcoming = opportunities?.filter(o => { 
			const d = new Date(o.deadline || o.application_deadline || o.deadline_date)
			const diff = (d - Date.now())/86400000
			return diff <= 30 && diff > 0 
		}) || []
		return upcoming.length ? `📅 ${upcoming.length} deadline${upcoming.length > 1 ? 's' : ''} in the next 30 days. Closest: "${upcoming[0]?.title}" due ${new Date(upcoming[0]?.deadline || upcoming[0]?.application_deadline).toLocaleDateString()}` : '✅ No urgent deadlines in the next 30 days.'
	}

	if (lowerInput.includes('application') || lowerInput.includes('submission')) {
		if (!submissions || submissions.length === 0) {
			return '📝 You haven\'t submitted any applications yet. I can help you find opportunities and guide you through the application process.'
		}
		const drafts = submissions.filter(s => ['draft','in_progress'].includes(s.status))
		const approved = submissions.filter(s => s.status === 'approved' || s.status === 'awarded')
		return `📝 You have ${submissions.length} application${submissions.length > 1 ? 's' : ''} total. ${drafts.length} in progress, ${approved.length} approved. ${drafts.length > 0 ? 'Want help completing your draft applications?' : 'Ready to start a new application?'}`
	}

	if (lowerInput.includes('opportunity') || lowerInput.includes('grant') || lowerInput.includes('funding')) {
		if (!opportunities || opportunities.length === 0) {
			return '🔍 I don\'t see any opportunities in your workspace yet. I can help you discover new funding opportunities that match your projects and goals.'
		}
		const highMatch = opportunities.filter(o => (o.fit_score || 0) > 80)
		return `🎯 You have ${opportunities.length} tracked opportunities. ${highMatch.length > 0 ? `${highMatch.length} are high-match (80%+). Want me to prioritize them?` : 'I can help you find better-matching opportunities for your projects.'}`
	}

	if (lowerInput.includes('budget') || lowerInput.includes('financial')) {
		const totalRequested = projects?.reduce((sum, p) => sum + (parseFloat(p.funding_request_amount) || 0), 0) || 0
		return `💰 ${profile?.organization_name || 'Your organization'} is seeking $${totalRequested.toLocaleString()} across ${projects?.length || 0} project${projects?.length !== 1 ? 's' : ''}. I can help optimize your budget presentations and find matching funding sources.`
	}

	if (lowerInput.includes('help') || lowerInput.includes('what can')) {
		return `🤖 I can help ${profile?.full_name?.split(' ')[0] || 'you'} with:
• **Project Development** - Structure goals, budgets, and narratives
• **Opportunity Discovery** - Find matching grants and funding
• **Application Assistance** - Complete forms and improve submissions  
• **Deadline Tracking** - Monitor important dates and requirements
• **Strategic Insights** - Analyze your funding portfolio

What would you like to work on?`
	}

	// Context-aware generic response
	const projectCount = projects?.length || 0
	const opportunityCount = opportunities?.length || 0
	return `I understand you're asking about "${input}". With ${projectCount} project${projectCount !== 1 ? 's' : ''} and ${opportunityCount} tracked opportunities, I can provide specific guidance on funding strategy, application completion, or opportunity discovery. What specific aspect would you like help with?`
}

// Also add singleton pattern to prevent multiple instances - add to useEffect
useEffect(() => {
	const existingAssistant = document.querySelector('[data-wali-assistant="true"]')
	if (existingAssistant && existingAssistant !== document.querySelector('[data-wali-assistant="true"]')) {
		console.log('WALI-OS Assistant already exists, preventing duplicate')
		onClose && onClose()
		return
	}
}, [onClose])

// And ensure the assistant container has the data attribute:
// data-wali-assistant="true" on the main container div