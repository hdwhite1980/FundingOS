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
        // Get donors data for basic stats
        const { data: donors, error: donorError } = await supabase
          .from('donors')
          .select('total_donated, is_major_donor')
          .eq('user_id', userId)

        // Get donations data for accurate total donations count and fallback calculations
        const { data: donations, error: donationError } = await supabase
          .from('donations')
          .select('amount, donor_id')
          .eq('user_id', userId)

        if (donorError && donationError) {
          console.error('Both donor and donation stats errors:', donorError, donationError)
          return {
            totalDonors: 0,
            totalRaised: 0,
            totalDonations: 0,
            avgDonationAmount: 0,
            majorDonors: 0,
            thisYearRaised: 0
          }
        }

        // Calculate from donations table (most accurate)
        const donationsList = donations || []
        const totalDonations = donationsList.length
        const totalRaisedFromDonations = donationsList.reduce((sum, donation) => sum + (donation.amount || 0), 0)

        // Calculate from donors table for comparison and fallback
        const donorsList = donors || []
        const totalDonors = donorsList.length
        const totalRaisedFromDonors = donorsList.reduce((sum, donor) => sum + (donor.total_donated || 0), 0)
        const majorDonors = donorsList.filter(donor => donor.is_major_donor).length

        // Use donations table data as primary source (more accurate)
        const totalRaised = totalRaisedFromDonations > 0 ? totalRaisedFromDonations : totalRaisedFromDonors
        const avgDonationAmount = totalDonations > 0 ? Math.round(totalRaised / totalDonations) : 0

        // Calculate this year's donations
        const currentYear = new Date().getFullYear()
        const thisYearDonations = donationsList.filter(donation => {
          const donationYear = new Date(donation.created_at || donation.donation_date).getFullYear()
          return donationYear === currentYear
        })
        const thisYearRaised = thisYearDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0)

        return {
          totalDonors,
          totalRaised,
          totalDonations,
          avgDonationAmount,
          majorDonors,
          thisYearRaised
        }
      } catch (error) {
        console.error('getDonorStats error:', error)
        return {
          totalDonors: 0,
          totalRaised: 0,
          totalDonations: 0,
          avgDonationAmount: 0,
          majorDonors: 0,
          thisYearRaised: 0
        }
      }
    },

    async getDonations(userId, filters = {}) {
      try {
        let query = supabase
          .from('donations')
          .select(`
            *,
            donor:donors(id, name, email, donor_type),
            project:projects(id, name)
          `)
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

        // Insert the donation
        const { data: donation, error: donationError } = await supabase
          .from('donations')
          .insert([newDonation])
          .select()
          .single()

        if (donationError) {
          console.error('Donation creation error:', donationError)
          return null
        }

        // Update donor statistics if donor_id is provided
        if (donation.donor_id) {
          await this.updateDonorStats(userId, donation.donor_id)
        }

        return donation
      } catch (error) {
        console.error('createDonation error:', error)
        return null
      }
    },

    async updateDonorStats(userId, donorId) {
      try {
        // Get all donations for this donor
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, donation_date')
          .eq('user_id', userId)
          .eq('donor_id', donorId)

        if (donationsError) {
          console.error('Error fetching donations for donor stats:', donationsError)
          return
        }

        const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0)
        const donationCount = donations.length
        const lastDonationDate = donations.length > 0 ? 
          donations.sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))[0].donation_date : 
          null
        const isMajorDonor = totalDonated >= 1000

        // Update donor record
        const { error: updateError } = await supabase
          .from('donors')
          .update({
            total_donated: totalDonated,
            donation_count: donationCount,
            last_donation_date: lastDonationDate,
            is_major_donor: isMajorDonor,
            updated_at: new Date().toISOString()
          })
          .eq('id', donorId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating donor stats:', updateError)
        }
      } catch (error) {
        console.error('updateDonorStats error:', error)
      }
    },

    async refreshAllDonorStats(userId) {
      try {
        // Get all donors for the user
        const { data: donors, error: donorsError } = await supabase
          .from('donors')
          .select('id')
          .eq('user_id', userId)

        if (donorsError) {
          console.error('Error fetching donors for refresh:', donorsError)
          return false
        }

        // Update stats for each donor
        for (const donor of donors || []) {
          await this.updateDonorStats(userId, donor.id)
        }

        return true
      } catch (error) {
        console.error('refreshAllDonorStats error:', error)
        return false
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
        console.log('Creating application with data:', applicationData)
        console.log('User ID:', userId)
        
        const newApplication = {
          ...applicationData,
          user_id: userId,
          status: applicationData.status || 'submitted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Remove any undefined or null values
        Object.keys(newApplication).forEach(key => {
          if (newApplication[key] === undefined || newApplication[key] === '') {
            delete newApplication[key]
          }
        })

        console.log('Final application data to insert:', newApplication)

        const { data, error } = await supabase
          .from('submissions')
          .insert([newApplication])
          .select()
          .single()

        if (error) {
          console.error('Application creation error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          throw error // Throw the error instead of returning null
        }

        console.log('Application created successfully:', data)
        return data
      } catch (error) {
        console.error('createApplication error:', error)
        throw error // Re-throw to let the component handle it
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
        if (!userId) {
          console.warn('getSubmissionStats: No userId provided')
          console.trace('getSubmissionStats called without userId') // Add stack trace
          return {
            totalSubmissions: 0,
            totalRequested: 0,
            totalAwarded: 0,
            successRate: 0
          }
        }

        console.log('getSubmissionStats: Using userId:', userId) // Debug log

        const { data, error } = await supabase
          .from('submissions')
          .select('status, submitted_amount, awarded_amount')
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
        const totalAwarded = applications.reduce((sum, app) => sum + (app.awarded_amount || 0), 0)
        const successfulApps = applications.filter(app => app.status === 'awarded').length
        const successRate = totalSubmissions > 0 ? Math.round((successfulApps / totalSubmissions) * 100) : 0

        console.log('getSubmissionStats result:', { totalSubmissions, totalRequested, totalAwarded, successRate }) // Debug log

        return {
          totalSubmissions,
          totalRequested,
          totalAwarded,
          successRate
        }
      } catch (error) {
        console.error('getSubmissionStats error:', error)
        console.trace('getSubmissionStats error stack trace') // Add stack trace
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
        if (!userId) {
          console.warn('getSubmissions: No userId provided')
          console.trace('getSubmissions called without userId') // Add stack trace
          return []
        }

        console.log('getSubmissions: Using userId:', userId) // Debug log

        let query = supabase
          .from('submissions')
          .select(`
            *,
            projects:project_id (name, description),
            opportunities:opportunity_id (title, sponsor, deadline_date)
          `)
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

        console.log('getSubmissions result count:', data?.length || 0) // Debug log
        return data || []
      } catch (error) {
        console.error('getSubmissions error:', error)
        console.trace('getSubmissions error stack trace') // Add stack trace
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
    },

    async createProjectOpportunity(userId, projectOpportunityData) {
      try {
        if (!userId) {
          throw new Error('User ID is required for createProjectOpportunity')
        }

        const dataToInsert = {
          ...projectOpportunityData,
          user_id: userId,
          created_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('project_opportunities')
          .insert([dataToInsert])
          .select()
          .single()

        if (error) {
          console.error('Project opportunity creation error:', error)
          throw error
        }

        console.log('Project opportunity created successfully:', data)
        return data
      } catch (error) {
        console.error('createProjectOpportunity error:', error)
        throw error
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
        console.warn('createProject: No authenticated session')
        throw new Error('Please log in to create projects')
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

      // Get donors data for basic stats
      const { data: donors, error: donorError } = await supabase
        .from('donors')
        .select('total_donated, is_major_donor')
        .eq('user_id', session.user.id)

      // Get donations data for accurate total donations count and fallback calculations
      const { data: donations, error: donationError } = await supabase
        .from('donations')
        .select('amount, donor_id, created_at, donation_date')
        .eq('user_id', session.user.id)

      if (donorError && donationError) {
        console.error('Both donor and donation stats errors:', donorError, donationError)
        return {
          totalDonors: 0,
          totalRaised: 0,
          totalDonations: 0,
          avgDonationAmount: 0,
          majorDonors: 0,
          thisYearRaised: 0
        }
      }

      // Calculate from donations table (most accurate)
      const donationsList = donations || []
      const totalDonations = donationsList.length
      const totalRaisedFromDonations = donationsList.reduce((sum, donation) => sum + (donation.amount || 0), 0)

      // Calculate from donors table for comparison and fallback
      const donorsList = donors || []
      const totalDonors = donorsList.length
      const totalRaisedFromDonors = donorsList.reduce((sum, donor) => sum + (donor.total_donated || 0), 0)
      const majorDonors = donorsList.filter(donor => donor.is_major_donor).length

      // Use donations table data as primary source (more accurate)
      const totalRaised = totalRaisedFromDonations > 0 ? totalRaisedFromDonations : totalRaisedFromDonors
      const avgDonationAmount = totalDonations > 0 ? Math.round(totalRaised / totalDonations) : 0

      // Calculate this year's donations
      const currentYear = new Date().getFullYear()
      const thisYearDonations = donationsList.filter(donation => {
        const donationYear = new Date(donation.created_at || donation.donation_date).getFullYear()
        return donationYear === currentYear
      })
      const thisYearRaised = thisYearDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0)

      return {
        totalDonors,
        totalRaised,
        totalDonations,
        avgDonationAmount,
        majorDonors,
        thisYearRaised
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
  async getSubmissionStats() {
    console.error('❌ DEPRECATED: applicationProgressService.getSubmissionStats called - Use directUserServices.applications.getSubmissionStats(userId) instead')
    console.trace('Deprecated service called from:')
    throw new Error('This service is deprecated. Use directUserServices.applications.getSubmissionStats(userId) instead.')
  },

  async getSubmissions(filters = {}) {
    console.error('❌ DEPRECATED: applicationProgressService.getSubmissions called - Use directUserServices.applications.getSubmissions(userId, filters) instead')
    console.trace('Deprecated service called from:')
    throw new Error('This service is deprecated. Use directUserServices.applications.getSubmissions(userId, filters) instead.')
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