// Get recent conversation history for context
async function getRecentConversationHistory(userId, limit = 20) {
  try {
    const { data: conversations, error } = await supabase
      .from('agent_conversations')
      .select('role, content, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching conversation history:', error)
      return []
    }

    if (!conversations || conversations.length === 0) {
      return []
    }

    // Reverse to get chronological order and format for AI context
    return conversations.reverse().map(conv => ({
      role: conv.role,
      content: conv.content,
      timestamp: conv.created_at,
      metadata: conv.metadata || {}
    }))
  } catch (error) {
    console.error('Error in getRecentConversationHistory:', error)
    return []
  }
}