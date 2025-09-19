// Debug script to test the "yes" response issue

const DEBUG_USER_ID = '00000000-0000-0000-0000-000000000000' // Use test UUID

// Simulate the exact flow that's causing issues
console.log('🔍 Debugging "yes" response issue...')

// Test the intent detection functions directly
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
  
  const isShortResponse = lowerMessage.length <= 25
  const matchesPattern = followUpPatterns.some(pattern => pattern.test(lowerMessage))
  const hasRecentAgentMessage = lastAgentMessage && 
    (Date.now() - new Date(lastAgentMessage.timestamp || lastAgentMessage.created_at).getTime()) < 10 * 60 * 1000 // 10 minutes
  
  console.log('Follow-up detection:')
  console.log('- Message:', lowerMessage)
  console.log('- Is short response:', isShortResponse)
  console.log('- Matches pattern:', matchesPattern)
  console.log('- Has recent agent message:', hasRecentAgentMessage)
  if (lastAgentMessage) {
    console.log('- Last message timestamp:', lastAgentMessage.timestamp || lastAgentMessage.created_at)
    console.log('- Time diff (ms):', Date.now() - new Date(lastAgentMessage.timestamp || lastAgentMessage.created_at).getTime())
  }
  
  return isShortResponse && matchesPattern && hasRecentAgentMessage
}

function mapFollowUpIntent(lowerMessage, lastAgentMessage) {
  if (!lastAgentMessage) {
    console.log('No last agent message - returning null')
    return null
  }
  
  const lastContent = lastAgentMessage.content.toLowerCase()
  const contextType = lastAgentMessage.metadata?.context_type
  
  console.log('Mapping follow-up intent:')
  console.log('- Last content includes "analyze":', lastContent.includes('analyze'))
  console.log('- Last content includes "opportunities":', lastContent.includes('opportunities'))
  console.log('- Context type:', contextType)
  
  // Positive responses
  if (/^(yes|yeah|yep|sure|okay|ok|absolutely|definitely)$/.test(lowerMessage)) {
    if (lastContent.includes('analyze') || lastContent.includes('opportunities')) {
      console.log('✅ Returning: analyze_opportunities')
      return 'analyze_opportunities'
    }
    if (lastContent.includes('search') || lastContent.includes('find more')) {
      console.log('✅ Returning: web_search')
      return 'web_search'
    }
    if (lastContent.includes('deadline') || lastContent.includes('urgent')) {
      console.log('✅ Returning: check_deadlines')
      return 'check_deadlines'
    }
    if (contextType === 'opportunity_analysis') {
      console.log('✅ Returning: continue_analysis')
      return 'continue_analysis'
    }
    console.log('✅ Returning: continue_previous')
    return 'continue_previous'
  }
  
  console.log('❌ No match for positive response pattern')
  return null
}

// Simulate the exact scenario from the chat
const mockLastMessage = {
  role: 'assistant',
  content: 'I found 5 relevant funding opportunities for you: Advanced Technological Education (ATE) (National Science Foundation (NSF)) Deadline: 10/1/2024, Plus 195 more opportunities available. Would you like me to analyze how these match your projects?',
  timestamp: new Date().toISOString(),
  metadata: { context_type: 'opportunity_analysis' }
}

const userMessage = 'yes'

console.log('\n' + '='.repeat(60))
console.log('TESTING WITH ACTUAL CHAT SCENARIO')
console.log('='.repeat(60))
console.log('User message:', `"${userMessage}"`)
console.log('Last agent message preview:', mockLastMessage.content.substring(0, 100) + '...')

const isFollowUp = detectFollowUpResponse(userMessage.toLowerCase(), mockLastMessage)
console.log('\nIs follow-up detected:', isFollowUp)

if (isFollowUp) {
  const intent = mapFollowUpIntent(userMessage.toLowerCase(), mockLastMessage)
  console.log('Mapped intent:', intent)
  
  if (intent === 'analyze_opportunities') {
    console.log('\n🎉 SUCCESS: "yes" correctly mapped to analyze_opportunities!')
  } else {
    console.log('\n❌ ISSUE: Expected "analyze_opportunities" but got:', intent)
  }
} else {
  console.log('\n❌ MAJOR ISSUE: Follow-up not detected at all!')
}