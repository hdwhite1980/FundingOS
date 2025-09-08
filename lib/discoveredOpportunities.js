// lib/discoveredOpportunities.js
// Utility functions for managing web-discovered funding opportunities

import { supabase } from './supabase'

export const discoveredOpportunityServices = {
  // Store discovered opportunities from web search
  async storeDiscoveredOpportunities(userId, opportunities) {
    try {
      const opportunitiesToStore = opportunities.map(opp => ({
        title: opp.title?.substring(0, 200) || 'Untitled Opportunity',
        description: opp.description?.substring(0, 1000) || 'No description available',
        source: opp.source || 'web_search',
        source_url: opp.source_url,
        discovered_by_user: userId,
        search_type: opp.search_type || 'internet',
        relevance_score: opp.relevance_score || 0,
        deadline_info: opp.deadline_info?.substring(0, 200),
        amount_info: opp.amount_info?.substring(0, 200),
        organization_type: opp.organization_type,
        project_type: opp.project_type,
        status: 'discovered',
        needs_review: true
      }))
      
      const { data, error } = await supabase
        .from('discovered_opportunities')
        .upsert(opportunitiesToStore, { 
          onConflict: 'source_url',
          ignoreDuplicates: true 
        })
        .select()
      
      if (error) {
        console.error('Error storing discovered opportunities:', error)
        throw error
      }
      
      return data || []
      
    } catch (error) {
      console.error('Error in storeDiscoveredOpportunities:', error)
      throw error
    }
  },

  // Get discovered opportunities for a user
  async getDiscoveredOpportunities(userId, filters = {}) {
    try {
      let query = supabase
        .from('discovered_opportunities')
        .select('*')
        .eq('discovered_by_user', userId)
        .order('discovered_at', { ascending: false })
      
      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.needsReview) {
        query = query.eq('needs_review', true)
      }
      
      if (filters.searchType) {
        query = query.eq('search_type', filters.searchType)
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error getting discovered opportunities:', error)
        throw error
      }
      
      return data || []
      
    } catch (error) {
      console.error('Error in getDiscoveredOpportunities:', error)
      return []
    }
  },

  // Update a discovered opportunity
  async updateDiscoveredOpportunity(userId, opportunityId, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      // If marking as reviewed, set reviewed timestamp
      if (updates.needs_review === false && !updates.reviewed_at) {
        updateData.reviewed_at = new Date().toISOString()
        updateData.reviewed_by = userId
      }
      
      const { data, error } = await supabase
        .from('discovered_opportunities')
        .update(updateData)
        .eq('id', opportunityId)
        .eq('discovered_by_user', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating discovered opportunity:', error)
        throw error
      }
      
      return data
      
    } catch (error) {
      console.error('Error in updateDiscoveredOpportunity:', error)
      throw error
    }
  },

  // Mark opportunity as reviewed
  async markAsReviewed(userId, opportunityId, userNotes = '') {
    return this.updateDiscoveredOpportunity(userId, opportunityId, {
      needs_review: false,
      status: 'reviewed',
      user_notes: userNotes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId
    })
  },

  // Update application status
  async updateApplicationStatus(userId, opportunityId, applicationStatus, notes = '') {
    const updates = {
      application_status: applicationStatus,
      user_notes: notes
    }
    
    if (applicationStatus === 'submitted') {
      updates.application_date = new Date().toISOString()
      updates.status = 'applied'
    }
    
    return this.updateDiscoveredOpportunity(userId, opportunityId, updates)
  },

  // Delete a discovered opportunity
  async deleteDiscoveredOpportunity(userId, opportunityId) {
    try {
      const { error } = await supabase
        .from('discovered_opportunities')
        .delete()
        .eq('id', opportunityId)
        .eq('discovered_by_user', userId)
      
      if (error) {
        console.error('Error deleting discovered opportunity:', error)
        throw error
      }
      
      return true
      
    } catch (error) {
      console.error('Error in deleteDiscoveredOpportunity:', error)
      throw error
    }
  },

  // Get discovery statistics for a user
  async getDiscoveryStats(userId) {
    try {
      const { data, error } = await supabase
        .from('discovered_opportunities')
        .select('status, search_type, application_status, discovered_at')
        .eq('discovered_by_user', userId)
      
      if (error) throw error
      
      const stats = {
        total: data.length,
        byStatus: {},
        bySearchType: {},
        byApplicationStatus: {},
        recentDiscoveries: 0, // Last 7 days
        needsReview: 0
      }
      
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      data.forEach(opp => {
        // Count by status
        stats.byStatus[opp.status] = (stats.byStatus[opp.status] || 0) + 1
        
        // Count by search type
        stats.bySearchType[opp.search_type] = (stats.bySearchType[opp.search_type] || 0) + 1
        
        // Count by application status
        if (opp.application_status) {
          stats.byApplicationStatus[opp.application_status] = (stats.byApplicationStatus[opp.application_status] || 0) + 1
        }
        
        // Count recent discoveries
        if (new Date(opp.discovered_at) > weekAgo) {
          stats.recentDiscoveries++
        }
        
        // Count needs review
        if (opp.status === 'discovered') {
          stats.needsReview++
        }
      })
      
      return stats
      
    } catch (error) {
      console.error('Error getting discovery stats:', error)
      return {
        total: 0,
        byStatus: {},
        bySearchType: {},
        byApplicationStatus: {},
        recentDiscoveries: 0,
        needsReview: 0
      }
    }
  },

  // Search within discovered opportunities
  async searchDiscoveredOpportunities(userId, searchTerm, filters = {}) {
    try {
      let query = supabase
        .from('discovered_opportunities')
        .select('*')
        .eq('discovered_by_user', userId)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,amount_info.ilike.%${searchTerm}%`)
        .order('relevance_score', { ascending: false })
      
      // Apply additional filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return data || []
      
    } catch (error) {
      console.error('Error searching discovered opportunities:', error)
      return []
    }
  }
}
