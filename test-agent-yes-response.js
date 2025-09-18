// Test script to verify agent handles "yes" follow-up responses correctly

// Mock conversation history that mimics the scenario
const mockConversationHistory = [
  {
    role: 'user',
    content: 'what grants should I apply to',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
  },
  {
    role: 'assistant',
    content: 'I found **5** relevant funding opportunities for you:\n\n• **UI Interstate Connection Network** (DOL-ETA)\nDeadline: 9/5/2025\n\n• **UI Integrity Center of Excellence Operations** (DOL-ETA)\nDeadline: 9/5/2025\n\n• **Industry-Driven Skills Training Fund Grant Program** (DOL-ETA)\nDeadline: 9/5/2025\n\n• **Rural Community Development Program (RCD) Water and Wastewater Treatment Systems Training and Technical Assistance Project** (HHS-ACF-OCS)\nDeadline: 9/5/2025\n\n• **FY 2026 International Visitor Leadership Program Collaborative Services** (DOS-ECA)\nDeadline: 9/8/2025\n\nPlus 195 more opportunities available. Would you like me to analyze how these match your projects?',
    timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
    metadata: {
      context_type: 'opportunity_analysis'
    }
  }
]

// Test the intent analysis functions
function analyzeMessageIntent(message, conversationHistory = []) {
  const intents = []
  const lowerMessage = message.toLowerCase().trim()
  
  // Get the most recent agent message for context
  const lastAgentMessage = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .pop()
  
  // Detect follow-up responses
  const isFollowUp = detectFollowUpResponse(lowerMessage, lastAgentMessage)
  
  if (isFollowUp) {
    console.log('✅ Detected follow-up response to:', lastAgentMessage?.content?.substring(0, 100) + '...')
    
    // Map follow-up intent based on previous agent context
    const followUpIntent = mapFollowUpIntent(lowerMessage, lastAgentMessage)
    if (followUpIntent) {
      intents.push(followUpIntent)
      console.log('✅ Mapped follow-up intent:', followUpIntent)
    }
  } else {
    console.log('❌ NOT detected as follow-up response')
    // Standard intent analysis for new requests
    if (lowerMessage.includes('analyz') || lowerMessage.includes('recommend') || lowerMessage.includes('should i apply')) {
      intents.push('analyze_opportunities')
    }
    if (lowerMessage.includes('deadline') || lowerMessage.includes('due')) {
      intents.push('check_deadlines')
    }
    if (lowerMessage.includes('status') || lowerMessage.includes('progress') || lowerMessage.includes('portfolio')) {
      intents.push('check_status')
    }
    if (lowerMessage.includes('diversif') || lowerMessage.includes('balance') || lowerMessage.includes('spread')) {
      intents.push('diversification_analysis')
    }
  }
  
  return intents
}

// Detect if message is a follow-up response
function detectFollowUpResponse(lowerMessage, lastAgentMessage) {
  const followUpPatterns = [
    /^(yes|yeah|yep|sure|okay|ok|absolutely|definitely)$/,
    /^(no|nope|nah|not really)$/,
    /^(tell me more|more info|details|elaborate|explain)$/,
    /^(continue|proceed|go ahead|next)$/,
    /^(that sounds good|sounds great|i'm interested)$/,
    /^(skip|pass|maybe later|not now)$/,
    /^(help|assist|guide me)$/,
  ]
  
  console.log('Testing follow-up detection:')
  console.log('- Message:', lowerMessage)
  console.log('- Message length:', lowerMessage.length)
  console.log('- Is short?', lowerMessage.length <= 25)
  
  const isShortResponse = lowerMessage.length <= 25
  const matchesPattern = followUpPatterns.some(pattern => {
    const matches = pattern.test(lowerMessage)
    if (matches) console.log('- Matches pattern:', pattern.source)
    return matches
  })
  
  const hasRecentAgentMessage = lastAgentMessage && 
    (Date.now() - new Date(lastAgentMessage.timestamp).getTime()) < 10 * 60 * 1000 // 10 minutes
  
  console.log('- Has recent agent message?', hasRecentAgentMessage)
  if (lastAgentMessage) {
    const timeDiff = (Date.now() - new Date(lastAgentMessage.timestamp).getTime()) / 1000
    console.log('- Time since last message:', Math.round(timeDiff), 'seconds')
  }
  
  const result = isShortResponse && matchesPattern && hasRecentAgentMessage
  console.log('- FOLLOW-UP DETECTED?', result)
  
  return result
}

// Map follow-up responses to appropriate intents
function mapFollowUpIntent(lowerMessage, lastAgentMessage) {
  if (!lastAgentMessage) return null
  
  const lastContent = lastAgentMessage.content.toLowerCase()
  const contextType = lastAgentMessage.metadata?.context_type
  
  console.log('Mapping follow-up intent:')
  console.log('- Last message context type:', contextType)
  console.log('- Last content includes "analyze"?', lastContent.includes('analyze'))
  console.log('- Last content includes "opportunities"?', lastContent.includes('opportunities'))
  
  // Positive responses
  if (/^(yes|yeah|yep|sure|okay|ok|absolutely|definitely)$/.test(lowerMessage)) {
    console.log('- Detected positive response')
    
    if (lastContent.includes('analyze') || lastContent.includes('opportunities')) {
      console.log('- Returning: analyze_opportunities')
      return 'analyze_opportunities'
    }
    if (lastContent.includes('search') || lastContent.includes('find more')) {
      return 'web_search'
    }
    if (lastContent.includes('deadline') || lastContent.includes('urgent')) {
      return 'check_deadlines'
    }
    if (contextType === 'opportunity_analysis') {
      console.log('- Returning: continue_analysis (from context type)')
      return 'continue_analysis'
    }
    return 'continue_previous'
  }
  
  // More info requests
  if (/^(tell me more|more info|details|elaborate|explain)$/.test(lowerMessage)) {
    if (contextType === 'opportunity_analysis') {
      return 'expand_opportunity_analysis'
    }
    if (lastContent.includes('deadline') || contextType === 'deadline_check') {
      return 'expand_deadline_info'
    }
    return 'expand_previous'
  }
  
  // Continue/proceed responses
  if (/^(continue|proceed|go ahead|next)$/.test(lowerMessage)) {
    return 'continue_previous'
  }
  
  // Negative responses
  if (/^(no|nope|nah|not really|skip|pass|maybe later|not now)$/.test(lowerMessage)) {
    return 'skip_previous'
  }
  
  return null
}

// Run the test
console.log('='.repeat(60))
console.log('TESTING AGENT "YES" RESPONSE HANDLING')
console.log('='.repeat(60))

const testMessage = 'yes'
console.log('\nTesting message:', `"${testMessage}"`)
console.log('\nWith conversation history:')
mockConversationHistory.forEach((msg, i) => {
  console.log(`${i + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`)
})

console.log('\n' + '-'.repeat(40))
console.log('ANALYSIS RESULTS:')
console.log('-'.repeat(40))

const intents = analyzeMessageIntent(testMessage, mockConversationHistory)

console.log('\nFinal intents detected:', intents)

if (intents.includes('analyze_opportunities') || intents.includes('continue_analysis')) {
  console.log('\n✅ SUCCESS: Agent should analyze opportunities')
} else {
  console.log('\n❌ FAILURE: Agent should have detected this as a request to analyze opportunities')
}

console.log('\n' + '='.repeat(60))