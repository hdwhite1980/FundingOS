import { createClient } from '@supabase/supabase-js'

class ChatSessionService {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }

  // Create a new chat session for the user
  async createSession(userId) {
    try {
      // Close any existing active sessions first
      await this.closeActiveSessions(userId)

      // Create new session
      const { data: session, error } = await this.supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      return session
    } catch (error) {
      console.error('Error creating chat session:', error)
      throw error
    }
  }

  // Get the active session for a user
  async getActiveSession(userId) {
    try {
      const { data: session, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return session
    } catch (error) {
      console.error('Error getting active session:', error)
      throw error
    }
  }

  // Save a message to the current session
  async saveMessage(userId, messageType, content, metadata = {}) {
    try {
      // Get or create active session
      let session = await this.getActiveSession(userId)
      if (!session) {
        session = await this.createSession(userId)
      }

      // Save the message
      const { data: message, error } = await this.supabase
        .from('chat_messages')
        .insert({
          session_id: session.id,
          user_id: userId,
          message_type: messageType,
          content: content,
          metadata: metadata
        })
        .select()
        .single()

      if (error) throw error
      return message
    } catch (error) {
      console.error('Error saving message:', error)
      throw error
    }
  }

  // Load messages for the active session
  async loadSessionMessages(userId) {
    try {
      const session = await this.getActiveSession(userId)
      if (!session) return []

      const { data: messages, error } = await this.supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp', { ascending: true })

      if (error) throw error
      return messages.map(msg => ({
        type: msg.message_type,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        ...msg.metadata
      }))
    } catch (error) {
      console.error('Error loading session messages:', error)
      return []
    }
  }

  // Close active sessions for a user
  async closeActiveSessions(userId) {
    try {
      const { error } = await this.supabase.rpc('close_active_chat_sessions', {
        user_uuid: userId
      })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error closing active sessions:', error)
      throw error
    }
  }

  // Get conversation history for email
  async getConversationForEmail(userId) {
    try {
      // Get the most recently closed session
      const { data: session, error: sessionError } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', false)
        .order('session_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessionError || !session) return null

      // Get messages for that session
      const { data: messages, error: messagesError } = await this.supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp', { ascending: true })

      if (messagesError) throw messagesError

      return {
        session,
        messages: messages.map(msg => ({
          type: msg.message_type,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          ...msg.metadata
        }))
      }
    } catch (error) {
      console.error('Error getting conversation for email:', error)
      return null
    }
  }

  // Clean up old sessions (optional maintenance function)
  async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { error } = await this.supabase
        .from('chat_sessions')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('is_active', false)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error cleaning up old sessions:', error)
      throw error
    }
  }
}

export default new ChatSessionService()