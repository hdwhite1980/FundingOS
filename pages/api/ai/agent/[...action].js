import { agentManager } from '../../../../lib/ai-agent/manager.js'

export default async function handler(req, res) {
  const { action } = req.query
  const { userId } = req.body || req.query

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    switch (action[0]) {
      case 'initialize':
        const agent = await agentManager.startAgent(userId)
        res.json({ success: true, agentId: agent.userId })
        break

      case 'chat':
        const chatAgent = await agentManager.getAgent(userId)
        const response = await chatAgent.chat(req.body.message)
        res.json({ message: response })
        break

      case 'goals':
        const { data: goals } = await supabase
          .from('agent_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('priority', { ascending: false })
        res.json(goals || [])
        break

      case 'decisions':
        const limit = req.query.limit || 10
        const { data: decisions } = await supabase
          .from('agent_decisions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
        res.json(decisions || [])
        break

      case 'thoughts':
        const { data: thoughts } = await supabase
          .from('agent_experiences')
          .select('*')
          .eq('user_id', userId)
          .eq('experience_type', 'thinking_cycle')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        res.json(thoughts?.action_results || null)
        break

      case 'toggle':
        const { status } = req.body
        const toggleAgent = await agentManager.getAgent(userId)
        if (status === 'paused') {
          await agentManager.stopAgent(userId)
        } else {
          await agentManager.startAgent(userId)
        }
        res.json({ success: true, status })
        break

      case 'decision-feedback':
        const { decisionId, feedback } = req.body
        const feedbackAgent = await agentManager.getAgent(userId)
        await feedbackAgent.handleUserFeedback(decisionId, feedback)
        res.json({ success: true })
        break

      default:
        res.status(404).json({ error: 'Action not found' })
    }
  } catch (error) {
    console.error('Agent API error:', error)
    res.status(500).json({ error: error.message })
  }
}