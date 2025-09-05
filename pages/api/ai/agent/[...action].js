// pages/api/ai/agent/[...action].js
import { supabase } from '../../../../lib/supabase'

export default async function handler(req, res) {
  const { action } = req.query
  const { userId } = req.body || req.query

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    switch (action[0]) {
      case 'initialize':
        // For now, just return a success response
        // The AI agent functionality can be implemented later
        res.json({ success: true, agentId: userId })
        break

      case 'chat':
        // Placeholder for chat functionality
        res.json({ message: "AI agent is being initialized. This feature will be available soon." })
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
        res.json(thoughts?.data || null)
        break

      case 'toggle':
        const { status } = req.body
        // For now, just return success
        // The actual agent toggling will be implemented later
        res.json({ success: true, status })
        break

      case 'decision-feedback':
        const { decisionId, feedback } = req.body
        // Store feedback in database
        await supabase
          .from('agent_decision_feedback')
          .insert([{
            decision_id: decisionId,
            user_id: userId,
            feedback: feedback,
            created_at: new Date().toISOString()
          }])
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