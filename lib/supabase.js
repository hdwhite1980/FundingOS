import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common database operations
export const userProfileService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data
  },

  async createProfile(profile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profile])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export const projectService = {
  async getProjects(userId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createProject(project) {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateProject(projectId, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export const opportunityService = {
  async getOpportunities(filters = {}) {
    let query = supabase
      .from('opportunities')
      .select('*')

    // Apply filters
    if (filters.projectTypes && filters.projectTypes.length > 0) {
      query = query.overlaps('project_types', filters.projectTypes)
    }
    
    if (filters.organizationType) {
      query = query.contains('organization_types', [filters.organizationType])
    }
    
    if (filters.amountMin) {
      query = query.gte('amount_max', filters.amountMin)
    }
    
    if (filters.amountMax) {
      query = query.lte('amount_min', filters.amountMax)
    }

    query = query.order('deadline_date', { ascending: true, nullsLast: true })
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  },

  async getOpportunity(opportunityId) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()
    
    if (error) throw error
    return data
  }
}

export const projectOpportunityService = {
  async getProjectOpportunities(projectId) {
    const { data, error } = await supabase
      .from('project_opportunities')
      .select(`
        *,
        opportunities (*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createProjectOpportunity(projectOpportunity) {
    const { data, error } = await supabase
      .from('project_opportunities')
      .insert([projectOpportunity])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateProjectOpportunity(id, updates) {
    const { data, error } = await supabase
      .from('project_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}