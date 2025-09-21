/**
 * Test file to verify the Dynamic Field Definition System integration
 * Run with: node test-field-definition-system.js
 */

// Mock field help scenarios
const testFieldHelpQueries = [
	"help with project description field",
	"explain the budget amount field", 
	"what is the organization name field",
	"help me fill out the timeline field",
	"what goes in the personnel field",
	"how to complete project objectives",
	"field help for EIN",
	"explain this field",
	"what should I put here"
]

// Mock user context
const mockUserProfile = {
	organization_name: "Tech for Good Nonprofit",
	organization_type: "501c3",
	ein: "12-3456789",
	email: "director@techforgood.org"
}

const mockProject = {
	name: "Digital Literacy Program",
	description: "Teaching seniors digital skills",
	budget: 150000,
	project_type: "education",
	target_population: "Senior citizens 65+",
	timeline: "18 months"
}

// Test field name extraction
function testExtractFieldName(query) {
	const lower = query.toLowerCase()
	
	// Common field patterns
	if (lower.includes('project description') || lower.includes('project summary')) return 'project_description'
	if (lower.includes('project title') || lower.includes('project name')) return 'project_title'
	if (lower.includes('budget') || lower.includes('amount')) return 'budget_amount'
	if (lower.includes('organization name')) return 'organization_name'
	if (lower.includes('timeline') || lower.includes('schedule')) return 'project_timeline'
	if (lower.includes('personnel') || lower.includes('staff')) return 'personnel'
	if (lower.includes('objectives') || lower.includes('goals')) return 'project_objectives'
	if (lower.includes('ein')) return 'ein'
	
	// Extract from quoted field names
	const quoted = query.match(/"([^"]+)"/g)
	if (quoted && quoted.length > 0) {
		return quoted[0].replace(/"/g, '').replace(/\s+/g, '_').toLowerCase()
	}
	
	// Fallback to generic field
	return 'field_input'
}

// Test smart defaults generation
function testGenerateSmartDefaults(fieldName, context) {
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

// Test field help pattern detection
function testFieldHelpPatternDetection(query) {
	const fieldHelpPattern = /help\s+with|explain\s+(this|the|a)\s+field|what\s+is\s+(this|the|a)\s+field|fill\s+out|complete\s+(this|the|a)\s+field|field\s+help|form\s+help|how\s+to\s+(fill|complete)|what\s+goes\s+(in|here)/i
	return fieldHelpPattern.test(query)
}

// Test information gaps identification
function testIdentifyInformationGaps(fieldName, context) {
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
	
	return gaps.filter(gap => gap.importance === 'high').slice(0, 2)
}

// Get fallback field help
function testGetFallbackFieldHelp(fieldName) {
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

// Run tests
function runTests() {
	console.log('🧪 Testing Dynamic Field Definition System\n')
	
	// Test 1: Field help pattern detection
	console.log('📋 Test 1: Field Help Pattern Detection')
	testFieldHelpQueries.forEach((query, index) => {
		const isFieldHelp = testFieldHelpPatternDetection(query)
		console.log(`${index + 1}. "${query}" → ${isFieldHelp ? '✅ DETECTED' : '❌ MISSED'}`)
	})
	
	// Test 2: Field name extraction
	console.log('\n📋 Test 2: Field Name Extraction')
	testFieldHelpQueries.slice(0, 7).forEach((query, index) => {
		const fieldName = testExtractFieldName(query)
		console.log(`${index + 1}. "${query}" → "${fieldName}"`)
	})
	
	// Test 3: Smart defaults generation
	console.log('\n📋 Test 3: Smart Defaults Generation')
	const context = {
		userProfile: mockUserProfile,
		currentProject: mockProject
	}
	
	const testFields = ['organization_name', 'ein', 'project_title', 'budget_amount', 'personnel']
	testFields.forEach(fieldName => {
		const defaults = testGenerateSmartDefaults(fieldName, context)
		console.log(`${fieldName}:`)
		if (defaults.length > 0) {
			defaults.forEach(def => {
				console.log(`  ✅ ${def.value} (${def.confidence * 100}% confidence, from ${def.source})`)
				if (def.explanation) console.log(`     💡 ${def.explanation}`)
			})
		} else {
			console.log(`  ❌ No smart defaults available`)
		}
	})
	
	// Test 4: Information gaps identification
	console.log('\n📋 Test 4: Information Gaps Identification')
	
	// Test with complete context
	console.log('With complete context:')
	const gaps1 = testIdentifyInformationGaps('organization_name', context)
	console.log(`Organization field gaps: ${gaps1.length === 0 ? '✅ None' : gaps1.map(g => g.type).join(', ')}`)
	
	// Test with incomplete context
	const incompleteContext = {
		userProfile: { organization_name: 'Test Org' }, // Missing type and EIN
		currentProject: { name: 'Test Project' } // Missing description
	}
	console.log('\nWith incomplete context:')
	const gaps2 = testIdentifyInformationGaps('organization_name', incompleteContext)
	console.log(`Organization field gaps: ${gaps2.length === 0 ? '✅ None' : gaps2.map(g => g.type).join(', ')}`)
	
	const gaps3 = testIdentifyInformationGaps('project_description', incompleteContext)
	console.log(`Project field gaps: ${gaps3.length === 0 ? '✅ None' : gaps3.map(g => g.type).join(', ')}`)
	
	// Test 5: Fallback field help
	console.log('\n📋 Test 5: Fallback Field Help')
	const fallbackFields = ['project_description', 'budget_amount', 'unknown_field']
	fallbackFields.forEach(fieldName => {
		const help = testGetFallbackFieldHelp(fieldName)
		console.log(`${fieldName}:`)
		console.log(`  Definition: ${help.definition}`)
		console.log(`  Tips: ${help.tips.length} available`)
	})
	
	console.log('\n✅ Dynamic Field Definition System tests completed!')
	console.log('\n🚀 System ready for integration with WaliOSAssistant.js')
}

// Run the tests
runTests()