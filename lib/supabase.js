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

// Session manager that waits for session to be ready
class SessionManager {
  constructor() {
    this.sessionReady = false
    this.currentSession = null
    this.initPromise = this.initialize()
  }

  async initialize() {
    try {
      // Wait for initial session
      const { data: { session } } = await supabase.auth.getSession()
      this.currentSession = session
      this.sessionReady = true
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event)
        this.currentSession = session
        this.sessionReady = true
      })
      
      return session
    } catch (error) {
      console.error('Session initialization error:', error)
      this.sessionReady = true // Mark as ready even if failed
      return null
    }
  }

  async waitForSession() {
    if (!this.sessionReady) {
      await this.initPromise
    }
    return this.currentSession
  }

  async getCurrentSession() {
    return await this.waitForSession()
  }

  isAuthenticated() {
    return !!this.currentSession?.user
  }
}

// Create global session manager
const sessionManager = new SessionManager()

// Auth helpers
export const authHelpers = {
  async getCurrentSession() {
    return await sessionManager.getCurrentSession()
  },

  async isAuthenticated() {
    const session = await this.getCurrentSession()
    return !!session?.user
  },

  async waitForAuth() {
    return await sessionManager.waitForSession()
  }
}

// User Profile Service
export const userProfileService = {
  async getProfile(userId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getProfile')
        return null
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Profile fetch error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('getProfile error:', error)
      return null
    }
  },

  async createProfile(profile) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createProfile')
        return null
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

      if (error) {
        console.error('Profile creation error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createProfile error:', error)
      return null
    }
  },

  async updateProfile(userId, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateProfile')
        return null
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

      if (error) {
        console.error('Profile update error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('updateProfile error:', error)
      return null
    }
  },

  async getOrCreateProfile(defaultData = {}) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session available for getOrCreateProfile')
        return null
      }

      // Try to get existing profile
      const existingProfile = await this.getProfile()
      if (existingProfile) {
        return existingProfile
      }

      // No profile found, create one
      console.log('Creating new profile for user:', session.user.id)
      const newProfile = await this.createProfile(defaultData)
      return newProfile
    } catch (error) {
      console.error('getOrCreateProfile error:', error)
      return null
    }
  }
}

// Project Service
export const projectService = {
  async getProjects(userId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getProjects')
        return []
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
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

  async createProject(project) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createProject')
        return null
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...project,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
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

  async updateProject(projectId, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateProject')
        return null
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

  async deleteProject(projectId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for deleteProject')
        return false
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', session.user.id)

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
}

// Opportunity Service
export const opportunityService = {
  async getOpportunities(filters = {}) {
    try {
      let query = supabase.from('opportunities').select('*')

      if (filters.projectTypes && filters.projectTypes.length > 0) {
        query = query.overlaps('project_types', filters.projectTypes)
      }
      
      if (filters.organizationType) {
        query = query.contains('organization_types', [filters.organizationType])
      }
      
      if (filters.amountMin && !isNaN(filters.amountMin)) {
        query = query.gte('amount_max', filters.amountMin)
      }
      
      if (filters.amountMax && !isNaN(filters.amountMax)) {
        query = query.lte('amount_min', filters.amountMax)
      }

      query = query.order('deadline_date', { ascending: true, nullsLast: true })
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching opportunities:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('getOpportunities error:', error)
      return []
    }
  },

  async getOpportunity(opportunityId) {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single()
      
      if (error) {
        console.error('Opportunity fetch error:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('getOpportunity error:', error)
      return null
    }
  }
}

// Project Opportunity Service
export const projectOpportunityService = {
  async getProjectOpportunities(projectId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getProjectOpportunities')
        return []
      }

      const { data, error } = await supabase
        .from('project_opportunities')
        .select(`
          *,
          opportunities (*),
          projects!inner(user_id)
        `)
        .eq('project_id', projectId)
        .eq('projects.user_id', session.user.id)
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

  async createProjectOpportunity(projectOpportunity) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createProjectOpportunity')
        return null
      }

      const { data, error } = await supabase
        .from('project_opportunities')
        .insert([{
          ...projectOpportunity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Project opportunity creation error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createProjectOpportunity error:', error)
      return null
    }
  },

  async updateProjectOpportunity(id, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateProjectOpportunity')
        return null
      }

      const { data, error } = await supabase
        .from('project_opportunities')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
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
  }
}

// Donor Service
export const donorService = {
  async getDonors(userId, filters = {}) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getDonors')
        return []
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

      if (error) {
        console.error('Donors fetch error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('getDonors error:', error)
      return []
    }
  },

  async createDonor(donorData) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createDonor')
        return null
      }

      const cleanData = {
        name: donorData.name,
        email: donorData.email || null,
        phone: donorData.phone || null,
        address_line1: donorData.address_line1 || null,
        address_line2: donorData.address_line2 || null,
        city: donorData.city || null,
        state: donorData.state || null,
        zip_code: donorData.zip_code || null,
        donor_type: donorData.donor_type || 'individual',
        notes: donorData.notes || null,
        tags: donorData.tags || [],
        user_id: session.user.id,
        total_donated: 0,
        donation_count: 0,
        is_major_donor: false,
        is_recurring_donor: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('donors')
        .insert([cleanData])
        .select()
        .single()

      if (error) {
        console.error('Donor creation error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createDonor error:', error)
      return null
    }
  },

  async updateDonor(donorId, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateDonor')
        return null
      }

      const { data, error } = await supabase
        .from('donors')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', donorId)
        .eq('user_id', session.user.id)
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

  async deleteDonor(donorId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for deleteDonor')
        return false
      }

      const { error } = await supabase
        .from('donors')
        .delete()
        .eq('id', donorId)
        .eq('user_id', session.user.id)

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
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getDonorStats')
        return {
          totalDonors: 0,
          totalRaised: 0,
          totalDonations: 0,
          majorDonors: 0,
          avgDonationAmount: 0,
          byType: {}
        }
      }

      const { data, error } = await supabase
        .from('donors')
        .select('total_donated, donation_count, donor_type, is_major_donor')
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Donor stats error:', error)
        return {
          totalDonors: 0,
          totalRaised: 0,
          totalDonations: 0,
          majorDonors: 0,
          avgDonationAmount: 0,
          byType: {}
        }
      }

      const stats = {
        totalDonors: data.length,
        totalRaised: data.reduce((sum, donor) => sum + (donor.total_donated || 0), 0),
        totalDonations: data.reduce((sum, donor) => sum + (donor.donation_count || 0), 0),
        majorDonors: data.filter(d => d.is_major_donor).length,
        avgDonationAmount: data.length > 0 ? 
          data.reduce((sum, donor) => sum + (donor.total_donated || 0), 0) / 
          Math.max(data.reduce((sum, donor) => sum + (donor.donation_count || 0), 0), 1) : 0,
        byType: data.reduce((acc, donor) => {
          acc[donor.donor_type] = (acc[donor.donor_type] || 0) + 1
          return acc
        }, {})
      }

      return stats
    } catch (error) {
      console.error('getDonorStats error:', error)
      return {
        totalDonors: 0,
        totalRaised: 0,
        totalDonations: 0,
        majorDonors: 0,
        avgDonationAmount: 0,
        byType: {}
      }
    }
  }
}

// Donation Service
export const donationService = {
  async getDonations(userId, filters = {}) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getDonations')
        return []
      }

      let query = supabase
        .from('donations')
        .select(`
          *,
          donor:donors(*),
          project:projects(name)
        `)
        .eq('user_id', session.user.id)
        .order('donation_date', { ascending: false })

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.donorId) {
        query = query.eq('donor_id', filters.donorId)
      }

      if (filters.platform) {
        query = query.eq('external_platform', filters.platform)
      }

      if (filters.dateFrom) {
        query = query.gte('donation_date', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('donation_date', filters.dateTo)
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

  async createDonation(donation) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createDonation')
        return null
      }

      const { data, error } = await supabase
        .from('donations')
        .insert([{
          ...donation,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Donation creation error:', error)
        return null
      }

      // Update donor totals
      await this.updateDonorTotals(donation.donor_id)

      return data
    } catch (error) {
      console.error('createDonation error:', error)
      return null
    }
  },

  async updateDonation(donationId, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateDonation')
        return null
      }

      const { data, error } = await supabase
        .from('donations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', donationId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) {
        console.error('Donation update error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('updateDonation error:', error)
      return null
    }
  },

  async updateDonorTotals(donorId) {
    try {
      // Get all donations for this donor
      const { data: donations, error } = await supabase
        .from('donations')
        .select('amount, donation_date')
        .eq('donor_id', donorId)
        .eq('status', 'completed')

      if (error) {
        console.error('Donor totals fetch error:', error)
        return
      }

      if (donations.length > 0) {
        const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0)
        const donationCount = donations.length
        const firstDonationDate = donations.sort((a, b) => new Date(a.donation_date) - new Date(b.donation_date))[0].donation_date
        const lastDonationDate = donations.sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))[0].donation_date

        const { error: updateError } = await supabase
          .from('donors')
          .update({
            total_donated: totalDonated,
            donation_count: donationCount,
            first_donation_date: firstDonationDate,
            last_donation_date: lastDonationDate,
            is_major_donor: totalDonated >= 1000,
            is_recurring_donor: donationCount >= 3,
            updated_at: new Date().toISOString()
          })
          .eq('id', donorId)

        if (updateError) {
          console.error('Donor totals update error:', updateError)
        }
      }
    } catch (error) {
      console.error('updateDonorTotals error:', error)
    }
  }
}

// Crowdfunding Service
export const crowdfundingService = {
  async getCampaigns(userId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getCampaigns')
        return []
      }

      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .select(`
          *,
          project:projects(name, funding_needed)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Campaigns fetch error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('getCampaigns error:', error)
      return []
    }
  },

  async createCampaign(campaign) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createCampaign')
        return null
      }

      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .insert([{
          ...campaign,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Campaign creation error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createCampaign error:', error)
      return null
    }
  },

  async updateCampaign(campaignId, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateCampaign')
        return null
      }

      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) {
        console.error('Campaign update error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('updateCampaign error:', error)
      return null
    }
  },

  async syncCampaignData(campaignId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for syncCampaignData')
        return null
      }

      // Get campaign details
      const { data: campaign, error } = await supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        console.error('Campaign fetch error:', error)
        return null
      }

      try {
        // Call platform-specific sync API
        const response = await fetch(`/api/crowdfunding/${campaign.platform}/${campaign.campaign_id}`)
        if (!response.ok) throw new Error('Failed to sync campaign data')

        const updatedData = await response.json()

        // Update campaign with new data
        const { data: updated, error: updateError } = await supabase
          .from('crowdfunding_campaigns')
          .update({
            raised_amount: updatedData.raised_amount,
            supporter_count: updatedData.supporter_count,
            last_sync: new Date().toISOString()
          })
          .eq('id', campaignId)
          .eq('user_id', session.user.id)
          .select()
          .single()

        if (updateError) {
          console.error('Campaign sync update error:', updateError)
          return null
        }

        return updated
      } catch (syncError) {
        // Fallback: just update timestamp
        const { data: fallback, error: fallbackError } = await supabase
          .from('crowdfunding_campaigns')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', campaignId)
          .eq('user_id', session.user.id)
          .select()
          .single()

        if (fallbackError) {
          console.error('Campaign fallback update error:', fallbackError)
          return null
        }

        return fallback
      }
    } catch (error) {
      console.error('syncCampaignData error:', error)
      return null
    }
  }
}

// Application Progress Service
export const applicationProgressService = {
  async getSubmissions(userId, filters = {}) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getSubmissions')
        return []
      }

      let query = supabase
        .from('application_submissions')
        .select(`
          *,
          project:projects(name, funding_needed),
          opportunity:opportunities(title, sponsor),
          documents:application_documents(*),
          status_updates:application_status_updates(*),
          reports:grant_reports(*)
        `)
        .eq('user_id', session.user.id)
        .order('submission_date', { ascending: false })

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
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
  },

  async createSubmission(submission) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createSubmission')
        return null
      }

      const { data, error } = await supabase
        .from('application_submissions')
        .insert([{
          ...submission,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Submission creation error:', error)
        return null
      }

      // Create initial status update
      await this.createStatusUpdate(data.id, submission.status || 'submitted', 'manual', 'Application created')

      return data
    } catch (error) {
      console.error('createSubmission error:', error)
      return null
    }
  },

  async updateSubmission(submissionId, updates) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for updateSubmission')
        return null
      }

      const { data, error } = await supabase
        .from('application_submissions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) {
        console.error('Submission update error:', error)
        return null
      }

      // If status changed, create a status update record
      if (updates.status) {
        await this.createStatusUpdate(submissionId, updates.status, 'manual')
      }

      return data
    } catch (error) {
      console.error('updateSubmission error:', error)
      return null
    }
  },

  async createStatusUpdate(submissionId, newStatus, source = 'manual', notes = '') {
    try {
      // Get current status first
      const { data: current } = await supabase
        .from('application_submissions')
        .select('status')
        .eq('id', submissionId)
        .single()

      const { data, error } = await supabase
        .from('application_status_updates')
        .insert([{
          submission_id: submissionId,
          previous_status: current?.status,
          new_status: newStatus,
          update_source: source,
          notes: notes,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Status update creation error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createStatusUpdate error:', error)
      return null
    }
  },

  async uploadDocument(submissionId, document) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for uploadDocument')
        return null
      }

      const { data, error } = await supabase
        .from('application_documents')
        .insert([{
          submission_id: submissionId,
          ...document,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Document upload error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('uploadDocument error:', error)
      return null
    }
  },

  async createReport(submissionId, report) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for createReport')
        return null
      }

      const { data, error } = await supabase
        .from('grant_reports')
        .insert([{
          submission_id: submissionId,
          ...report,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Report creation error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('createReport error:', error)
      return null
    }
  },

  async getSubmissionStats(userId) {
    try {
      const session = await authHelpers.getCurrentSession()
      if (!session?.user) {
        console.log('No session found for getSubmissionStats')
        return {
          totalSubmissions: 0,
          totalRequested: 0,
          totalAwarded: 0,
          successRate: 0,
          byStatus: {}
        }
      }

      const { data, error } = await supabase
        .from('application_submissions')
        .select('status, award_amount, requested_amount')
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Submission stats error:', error)
        return {
          totalSubmissions: 0,
          totalRequested: 0,
          totalAwarded: 0,
          successRate: 0,
          byStatus: {}
        }
      }

      const stats = {
        totalSubmissions: data.length,
        totalRequested: data.reduce((sum, s) => sum + (s.requested_amount || 0), 0),
        totalAwarded: data.reduce((sum, s) => sum + (s.award_amount || 0), 0),
        successRate: data.length > 0 ? (data.filter(s => s.status === 'approved').length / data.length * 100) : 0,
        byStatus: data.reduce((acc, submission) => {
          acc[submission.status] = (acc[submission.status] || 0) + 1
          return acc
        }, {})
      }

      return stats
    } catch (error) {
      console.error('getSubmissionStats error:', error)
      return {
        totalSubmissions: 0,
        totalRequested: 0,
        totalAwarded: 0,
        successRate: 0,
        byStatus: {}
      }
    }
  }
}

// Utility Functions
export const checkAuthStatus = async () => {
  try {
    const session = await sessionManager.getCurrentSession()
    return {
      authenticated: !!session?.user,
      user: session?.user || null,
      session,
      error: null
    }
  } catch (error) {
    console.error('Auth status check failed:', error)
    return { authenticated: false, user: null, error }
  }
}