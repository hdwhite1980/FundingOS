// lib/sessionManager.js
// Single session enforcement service

import { createClient } from '@supabase/supabase-js'

class SessionManager {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for admin operations
    )
  }

  /**
   * Store active session info when user logs in
   */
  async trackUserSession(userId, sessionInfo = {}) {
    try {
      const sessionData = {
        user_id: userId,
        session_id: sessionInfo.access_token ? this.extractSessionId(sessionInfo.access_token) : null,
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        ip_address: sessionInfo.ip_address || null,
        user_agent: sessionInfo.user_agent || null,
        is_active: true
      }

      // First, deactivate all other sessions for this user
      await this.deactivateOtherSessions(userId, sessionData.session_id)

      // Store the new session
      const { data, error } = await this.supabase
        .from('user_sessions')
        .upsert(sessionData, {
          onConflict: 'user_id,session_id'
        })
        .select()

      if (error) throw error

      console.log(`Session tracked for user ${userId}:`, sessionData.session_id)
      return data[0]

    } catch (error) {
      console.error('Error tracking user session:', error)
      throw error
    }
  }

  /**
   * Deactivate other sessions for the same user
   */
  async deactivateOtherSessions(userId, currentSessionId) {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: 'new_login'
        })
        .eq('user_id', userId)
        .neq('session_id', currentSessionId)
        .eq('is_active', true)

      if (error) throw error

      console.log(`Deactivated other sessions for user ${userId}`)

      // Also invalidate sessions in Supabase Auth if we have session IDs
      await this.invalidateSupabaseSessions(userId, currentSessionId)

    } catch (error) {
      console.error('Error deactivating other sessions:', error)
      // Don't throw - this is not critical
    }
  }

  /**
   * Invalidate sessions in Supabase Auth
   */
  async invalidateSupabaseSessions(userId, keepSessionId) {
    try {
      // Get active sessions from our tracking table
      const { data: sessions, error } = await this.supabase
        .from('user_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .neq('session_id', keepSessionId)
        .eq('is_active', false) // Recently deactivated
        .gte('deactivated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes

      if (error || !sessions) return

      // Note: Supabase doesn't provide a direct API to invalidate specific sessions
      // The session tracking table serves as our source of truth
      console.log(`Found ${sessions.length} sessions to track as invalid`)

    } catch (error) {
      console.error('Error invalidating Supabase sessions:', error)
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(userId, sessionId) {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('is_active', true)

      if (error) throw error

    } catch (error) {
      console.error('Error updating session activity:', error)
      // Non-critical, don't throw
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(userId, sessionId) {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('is_active, last_activity')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .single()

      if (error || !data) return false

      // Check if session is active and not too old
      const lastActivity = new Date(data.last_activity)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      const isRecent = (Date.now() - lastActivity.getTime()) < maxAge

      return data.is_active && isRecent

    } catch (error) {
      console.error('Error checking session validity:', error)
      return false
    }
  }

  /**
   * Deactivate session on logout
   */
  async deactivateSession(userId, sessionId) {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: 'logout'
        })
        .eq('user_id', userId)
        .eq('session_id', sessionId)

      if (error) throw error

      console.log(`Session deactivated for user ${userId}:`, sessionId)

    } catch (error) {
      console.error('Error deactivating session:', error)
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('session_id, login_time, last_activity, ip_address, user_agent')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (error) throw error

      return data || []

    } catch (error) {
      console.error('Error getting active sessions:', error)
      return []
    }
  }

  /**
   * Extract session ID from access token
   */
  extractSessionId(accessToken) {
    try {
      // Simple hash of the token for identification
      const crypto = require('crypto')
      return crypto.createHash('sha256').update(accessToken).digest('hex').substring(0, 16)
    } catch (error) {
      return Math.random().toString(36).substring(2, 18) // Fallback
    }
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions() {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago

      const { error } = await this.supabase
        .from('user_sessions')
        .delete()
        .lt('last_activity', cutoffDate)

      if (error) throw error

      console.log('Old sessions cleaned up')

    } catch (error) {
      console.error('Error cleaning up old sessions:', error)
    }
  }
}

// Create and export singleton
const sessionManager = new SessionManager()
export default sessionManager