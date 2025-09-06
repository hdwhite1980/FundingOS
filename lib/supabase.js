import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// DIRECT USER SERVICES - These bypass session checks and work with user IDs directly
// Use these in your Dashboard.js component to avoid "No session found" errors
export const directUserServices = {
  profile: {
    async getOrCreateProfile(userId, userEmail) {
      try {
        // First try to get existing profile
        const { data: existingProfile, error: getError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (existingProfile) {
          return existingProfile
        }

        // If no profile exists, create one
        if (getError && getError.code === 'PGRST116') {
          const newProfile = {
            id: userId,
            email: userEmail,
            full_name: '',
            organization_name: '',
            organization_type: 'nonprofit',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: createdProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([newProfile])
            .select()
            .single()

          if (createError) {
            console.error('Failed to create profile:', createError)
            return null
          }

          return createdProfile
        }

        console.error('Profile fetch error:', getError)
        return null
      } catch (error) {
        console.error('getOrCreateProfile error:', error)
        return null
      }
    },

    async updateProfile(userId, updates) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()

        if (error) {
          console.error('Profile update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateProfile error:', error)
        return null
      }
    }
  },

  projects: {
    async getProjects(userId) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Projects fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getProjects error:', error)
        return []
      }
    },

    async createProject(userId, projectData) {
      try {
        const newProject = {
          ...projectData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('projects')
          .insert([newProject])
          .select()
          .single()

        if (error) {
          console.error('Project creation error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('createProject error:', error)
        return null
      }
    },

    async updateProject(userId, projectId, updates) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Project update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateProject error:', error)
        return null
      }
    },

    async deleteProject(projectId, userId) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', userId)

        if (error) {
          console.error('Project deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('deleteProject error:', error)
        return false
      }
    }
  },

  opportunities: {
    async getOpportunities(filters = {}) {
      try {
        let query = supabase
          .from('opportunities')
          .select('*')
          .order('created_at', { ascending: false })

        // Apply filters using your actual column names
        if (filters.organizationType) {
          query = query.contains('organization_types', [filters.organizationType])
        }

        if (filters.minAmount) {
          query = query.gte('amount_max', filters.minAmount)
        }

        if (filters.maxAmount) {
          query = query.lte('amount_min', filters.maxAmount)
        }

        const { data, error } = await query.limit(200)

        if (error) {
          console.error('Opportunities fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getOpportunities error:', error)
        return []
      }
    }
  },

  donors: {
    async getDonors(userId, filters = {}) {
      try {
        let query = supabase
          .from('donors')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }

        if (filters.donorType) {
          query = query.eq('donor_type', filters.donorType)
        }

        if (filters.majorDonor !== undefined) {
          query = query.eq('is_major_donor', filters.majorDonor)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Donors fetch error:', error)
          // Check if it's an authentication error
          if (error.code === '401' || error.message?.includes('401')) {
            console.error('Authentication error - check RLS policies for donors table')
            throw new Error('Authentication failed. Please check your login status.')
          }
          return []
        }

        return data || []
      } catch (error) {
        console.error('getDonors error:', error)
        if (error.message?.includes('Authentication failed')) {
          throw error
        }
        return []
      }
    },

    async createDonor(userId, donorData) {
      try {
        const newDonor = {
          ...donorData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('donors')
          .insert([newDonor])
          .select()
          .single()

        if (error) {
          console.error('Donor creation error:', error)
          // Check if it's an authentication error
          if (error.code === '401' || error.message?.includes('401')) {
            console.error('Authentication error - check RLS policies for donors table')
            throw new Error('Authentication failed. Please check your login status.')
          }
          throw error
        }

        return data
      } catch (error) {
        console.error('createDonor error:', error)
        throw error
      }
    },

    async updateDonor(userId, donorId, updates) {
      try {
        const { data, error } = await supabase
          .from('donors')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', donorId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Donor update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateDonor error:', error)
        return null
      }
    },

    async deleteDonor(userId, donorId) {
      try {
        const { error } = await supabase
          .from('donors')
          .delete()
          .eq('id', donorId)
          .eq('user_id', userId)

        if (error) {
          console.error('Donor deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('deleteDonor error:', error)
        return false
      }
    },

    async getDonorStats(userId) {
      try {
        const { data, error } = await supabase
          .from('donors')
          .select('total_donated, is_major_donor')
          .eq('user_id', userId)

        if (error) {
          console.error('Donor stats error:', error)
          return {
            totalDonors: 0,
            totalRaised: 0,
            avgDonationAmount: 0,
            majorDonors: 0
          }
        }

        const donors = data || []
        const totalDonors = donors.length
        const totalRaised = donors.reduce((sum, donor) => sum + (donor.total_donated || 0), 0)
        const avgDonationAmount = totalDonors > 0 ? Math.round(totalRaised / totalDonors) : 0
        const majorDonors = donors.filter(donor => donor.is_major_donor).length

        return {
          totalDonors,
          totalRaised,
          avgDonationAmount,
          majorDonors
        }
      } catch (error) {
        console.error('getDonorStats error:', error)
        return {
          totalDonors: 0,
          totalRaised: 0,
          avgDonationAmount: 0,
          majorDonors: 0
        }
      }
    },

    async getDonations(userId, filters = {}) {
      try {
        let query = supabase
          .from('donations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.donorId) {
          query = query.eq('donor_id', filters.donorId)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate)
        }

        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Donations fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getDonations error:', error)
        return []
      }
    },

    async createDonation(userId, donationData) {
      try {
        const newDonation = {
          ...donationData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('donations')
          .insert([newDonation])
          .select()
          .single()

        if (error) {
          console.error('Donation creation error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('createDonation error:', error)
        return null
      }
    }
  },

  applications: {
    async getApplications(userId, filters = {}) {
      try {
        let query = supabase
          .from('submissions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Applications fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getApplications error:', error)
        return []
      }
    },

    async createApplication(userId, applicationData) {
      try {
        const newApplication = {
          ...applicationData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('submissions')
          .insert([newApplication])
          .select()
          .single()

        if (error) {
          console.error('Application creation error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('createApplication error:', error)
        return null
      }
    },

    async updateApplication(userId, applicationId, updates) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Application update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateApplication error:', error)
        return null
      }
    },

    async deleteApplication(userId, applicationId) {
      try {
        const { error } = await supabase
          .from('submissions')
          .delete()
          .eq('id', applicationId)
          .eq('user_id', userId)

        if (error) {
          console.error('Application deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('deleteApplication error:', error)
        return false
      }
    },

    async getSubmissionStats(userId) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('status, submitted_amount')
          .eq('user_id', userId)

        if (error) {
          console.error('Application stats error:', error)
          return {
            totalSubmissions: 0,
            totalRequested: 0,
            totalAwarded: 0,
            successRate: 0
          }
        }

        const applications = data || []
        const totalSubmissions = applications.length
        const totalRequested = applications.reduce((sum, app) => sum + (app.submitted_amount || 0), 0)
        const approvedApps = applications.filter(app => app.status === 'approved').length
        const successRate = totalSubmissions > 0 ? Math.round((approvedApps / totalSubmissions) * 100) : 0

        return {
          totalSubmissions,
          totalRequested,
          totalAwarded: 0, // You'd need to add an awarded_amount column for this
          successRate
        }
      } catch (error) {
        console.error('getSubmissionStats error:', error)
        return {
          totalSubmissions: 0,
          totalRequested: 0,
          totalAwarded: 0,
          successRate: 0
        }
      }
    },

    async getSubmissions(userId, filters = {}) {
      try {
        let query = supabase
          .from('submissions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.opportunityId) {
          query = query.eq('opportunity_id', filters.opportunityId)
        }

        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom)
        }

        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Submissions fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getSubmissions error:', error)
        return []
      }
    }
  },

  projectOpportunities: {
    // NOTE: Your project_opportunities table is missing user_id column
    // This may cause RLS policy issues
    
    async getProjectOpportunities(projectId, userId) {
      try {
        const { data, error } = await supabase
          .from('project_opportunities')
          .select(`
            *,
            opportunities:opportunity_id (*)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Project opportunities fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getProjectOpportunities error:', error)
        return []
      }
    },

    async addProjectOpportunity(userId, projectId, opportunityId, matchData = {}) {
      try {
        const newMatch = {
          project_id: projectId,
          opportunity_id: opportunityId,
          fit_score: matchData.aiScore || 0, // Using fit_score instead of ai_fit_score
          status: 'identified',
          ai_analysis: matchData, // Store additional data in ai_analysis JSONB field
          ...matchData
        }

        const { data, error } = await supabase
          .from('project_opportunities')
          .insert([newMatch])
          .select()
          .single()

        if (error) {
          console.error('Project opportunity creation error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('addProjectOpportunity error:', error)
        return null
      }
    },

    async updateProjectOpportunity(userId, id, updates) {
      try {
        const { data, error } = await supabase
          .from('project_opportunities')
          .update({
            ...updates,
            // No updated_at column in your table
          })
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Project opportunity update error:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('updateProjectOpportunity error:', error)
        return null
      }
    },

    async removeProjectOpportunity(userId, id) {
      try {
        const { error } = await supabase
          .from('project_opportunities')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Project opportunity deletion error:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('removeProjectOpportunity error:', error)
        return false
      }
    }
  }
}

// LEGACY SESSION-BASED SERVICES (Keep for backward compatibility, but prefer directUserServices)
// These may cause "No session found" errors in some timing scenarios

export const userProfileService = {
  async getProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data
    } catch (error) {
      console.error('getProfile error:', error)
      throw error
    }
  },

  async getOrCreateProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      // Try to get existing profile
      let { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const newProfile = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || '',
          organization_name: '',
          organization_type: 'nonprofit',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single()

        if (createError) throw createError
        return createdProfile
      }

      if (error) throw error
      return profile
    } catch (error) {
      console.error('getOrCreateProfile error:', error)
      throw error
    }
  },

  async createProfile(profile) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const profileData = {
        id: session.user.id,
        email: session.user.email,
        full_name: profile.full_name || session.user.user_metadata?.full_name || '',
        organization_name: profile.organization_name || '',
        organization_type: profile.organization_type || 'nonprofit',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...profile
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createProfile error:', error)
      throw error
    }
  },

  async updateProfile(updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProfile error:', error)
      throw error
    }
  }
}

export const projectService = {
  async getProjects(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getProjects error:', error)
      throw error
    }
  },

  async createProject(projectData) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const newProject = {
        ...projectData,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('createProject error:', error)
      throw error
    }
  },

  async updateProject(projectId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProject error:', error)
      throw error
    }
  },

  async deleteProject(projectId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', session.user.id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('deleteProject error:', error)
      throw error
    }
  }
}

export const opportunityService = {
  async getOpportunities(filters = {}) {
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.organizationType) {
        query = query.contains('organization_types', [filters.organizationType])
      }

        if (filters.minAmount) {
          query = query.gte('amount_max', filters.minAmount)
        }

        if (filters.maxAmount) {
          query = query.lte('amount_min', filters.maxAmount)
        }      const { data, error } = await query.limit(200)
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getOpportunities error:', error)
      throw error
    }
  },

  async getEligibleOpportunities(userProfile, filters = {}) {
    try {
      // Get base opportunities
      const opportunities = await this.getOpportunities(filters)
      
      // Import eligibility service
      const { GrantEligibilityService } = await import('./eligibility/grantEligibilityService.js')
      const eligibilityService = new GrantEligibilityService()
      
      // Apply eligibility filtering
      const eligibleOpportunities = await eligibilityService.filterEligibleOpportunities(
        userProfile, 
        opportunities
      )
      
      // Apply user's filter preferences
      let filtered = eligibleOpportunities
      
      if (filters.onlyEligible) {
        filtered = filtered.filter(opp => opp.eligibility?.eligible)
      }
      
      if (filters.excludeWarnings) {
        filtered = filtered.filter(opp => 
          opp.eligibility?.eligible && (!opp.eligibility.warnings || opp.eligibility.warnings.length === 0)
        )
      }
      
      if (filters.minConfidence) {
        filtered = filtered.filter(opp => opp.eligibilityScore >= filters.minConfidence)
      }
      
      return filtered
    } catch (error) {
      console.error('getEligibleOpportunities error:', error)
      // Fallback to basic opportunities if eligibility service fails
      return await this.getOpportunities(filters)
    }
  },

  async getProfileCompletionSuggestions(userProfile) {
    try {
      // Import eligibility service  
      const { GrantEligibilityService } = await import('./eligibility/grantEligibilityService.js')
      const eligibilityService = new GrantEligibilityService()
      
      // Get profile completion requirements
      const suggestions = eligibilityService.getProfileCompletionRequirements(userProfile)
      
      return suggestions
    } catch (error) {
      console.error('getProfileCompletionSuggestions error:', error)
      return []
    }
  }
}

export const donorService = {
  async getDonors(userId, filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      let query = supabase
        .from('donors')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      if (filters.donorType) {
        query = query.eq('donor_type', filters.donorType)
      }

      if (filters.majorDonor !== undefined) {
        query = query.eq('is_major_donor', filters.majorDonor)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getDonors error:', error)
      throw error
    }
  },

  async getDonorStats(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('donors')
        .select('total_donated, is_major_donor')
        .eq('user_id', session.user.id)

      if (error) throw error

      const donors = data || []
      const totalDonors = donors.length
      const totalRaised = donors.reduce((sum, donor) => sum + (donor.total_donated || 0), 0)
      const avgDonationAmount = totalDonors > 0 ? Math.round(totalRaised / totalDonors) : 0
      const majorDonors = donors.filter(donor => donor.is_major_donor).length

      return {
        totalDonors,
        totalRaised,
        avgDonationAmount,
        majorDonors
      }
    } catch (error) {
      console.error('getDonorStats error:', error)
      throw error
    }
  },

  async getDonations(filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      let query = supabase
        .from('donations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (filters.donorId) {
        query = query.eq('donor_id', filters.donorId)
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getDonations error:', error)
      throw error
    }
  }
}

export const applicationProgressService = {
  async getSubmissionStats(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('status, requested_amount, awarded_amount')
        .eq('user_id', session.user.id)

      if (error) throw error

      const applications = data || []
      const totalSubmissions = applications.length
      const totalRequested = applications.reduce((sum, app) => sum + (app.requested_amount || 0), 0)
      const totalAwarded = applications.reduce((sum, app) => sum + (app.awarded_amount || 0), 0)
      const successfulApps = applications.filter(app => app.status === 'awarded').length
      const successRate = totalSubmissions > 0 ? Math.round((successfulApps / totalSubmissions) * 100) : 0

      return {
        totalSubmissions,
        totalRequested,
        totalAwarded,
        successRate
      }
    } catch (error) {
      console.error('getSubmissionStats error:', error)
      throw error
    }
  },

  async getSubmissions(filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      let query = supabase
        .from('submissions')
        .select(`
          *,
          projects:project_id (name, description),
          opportunities:opportunity_id (title, sponsor, deadline_date)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.opportunityId) {
        query = query.eq('opportunity_id', filters.opportunityId)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getSubmissions error:', error)
      throw error
    }
  }
}

export const projectOpportunityService = {
  async getProjectOpportunities(projectId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('project_opportunities')
        .select(`
          *,
          opportunities:opportunity_id (*)
        `)
        .eq('project_id', projectId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getProjectOpportunities error:', error)
      throw error
    }
  }
}

// Export the supabase client for direct use if needed
export default supabase