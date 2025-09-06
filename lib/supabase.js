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

// Updated user profile service with session authentication
export const userProfileService = {
  async getProfile(userId) {
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

  async createProfile(profile) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
          ...profile,
          id: session.user.id
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createProfile error:', error)
      throw error
    }
  },

  async updateProfile(userId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
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

// Updated project service with better authentication handling
export const projectService = {
  async getProjects(userId) {
    try {
      const session = await authHelpers.ensureAuthenticated()

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

  async createProject(project) {
    try {
      const session = await authHelpers.ensureAuthenticated()

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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createProject error:', error)
      throw error
    }
  },

  async updateProject(projectId, updates) {
    try {
      const session = await authHelpers.ensureAuthenticated()

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
      const session = await authHelpers.ensureAuthenticated()

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

// Opportunity service (no authentication needed for public opportunities)
export const opportunityService = {
  async getOpportunities(filters = {}) {
    let query = supabase
      .from('opportunities')
      .select('*')

    // Apply filters only if they exist
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
      throw error
    }
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

// Updated project opportunity service with session authentication
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
          opportunities (*),
          projects!inner(user_id)
        `)
        .eq('project_id', projectId)
        .eq('projects.user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getProjectOpportunities error:', error)
      throw error
    }
  },

  async createProjectOpportunity(projectOpportunity) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createProjectOpportunity error:', error)
      throw error
    }
  },

  async updateProjectOpportunity(id, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProjectOpportunity error:', error)
      throw error
    }
  }
}

// Updated donor service with better authentication handling
export const donorService = {
  async getDonors(userId, filters = {}) {
    try {
      // Verify session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      let query = supabase
        .from('donors')
        .select('*')
        .eq('user_id', session.user.id) // Use session user ID
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

  async createDonor(donorData) {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      console.log('Creating donor with session user:', session.user.id)

      // Clean the data and ensure user_id matches session
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
        user_id: session.user.id, // Always use session user ID
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
        console.error('Supabase donor creation error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('Donor created successfully:', data)
      return data
    } catch (error) {
      console.error('createDonor error:', error)
      throw error
    }
  },

  async updateDonor(donorId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('donors')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', donorId)
        .eq('user_id', session.user.id) // Ensure user owns this donor
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateDonor error:', error)
      throw error
    }
  },

  async deleteDonor(donorId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { error } = await supabase
        .from('donors')
        .delete()
        .eq('id', donorId)
        .eq('user_id', session.user.id) // Ensure user owns this donor
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('deleteDonor error:', error)
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
        .select('total_donated, donation_count, donor_type, is_major_donor')
        .eq('user_id', session.user.id)

      if (error) throw error

      const stats = {
        totalDonors: data.length,
        totalRaised: data.reduce((sum, donor) => sum + (donor.total_donated || 0), 0),
        totalDonations: data.reduce((sum, donor) => sum + (donor.donation_count || 0), 0),
        majorDonors: data.filter(d => d.is_major_donor).length,
        avgDonationAmount: data.length > 0 ? 
          data.reduce((sum, donor) => sum + (donor.total_donated || 0), 0) / 
          data.reduce((sum, donor) => sum + (donor.donation_count || 0), 0) : 0,
        byType: data.reduce((acc, donor) => {
          acc[donor.donor_type] = (acc[donor.donor_type] || 0) + 1
          return acc
        }, {})
      }

      return stats
    } catch (error) {
      console.error('getDonorStats error:', error)
      throw error
    }
  }
}

// Updated donation service with session authentication
export const donationService = {
  async getDonations(userId, filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getDonations error:', error)
      throw error
    }
  },

  async createDonation(donation) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error

      // Update donor totals
      await this.updateDonorTotals(donation.donor_id)
      
      return data
    } catch (error) {
      console.error('createDonation error:', error)
      throw error
    }
  },

  async updateDonation(donationId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateDonation error:', error)
      throw error
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

      if (error) throw error

      if (donations.length > 0) {
        const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0)
        const donationCount = donations.length
        const firstDonationDate = donations.sort((a, b) => new Date(a.donation_date) - new Date(b.donation_date))[0].donation_date
        const lastDonationDate = donations.sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))[0].donation_date

        await supabase
          .from('donors')
          .update({
            total_donated: totalDonated,
            donation_count: donationCount,
            first_donation_date: firstDonationDate,
            last_donation_date: lastDonationDate,
            is_major_donor: totalDonated >= 1000, // $1000+ is major donor
            is_recurring_donor: donationCount >= 3,
            updated_at: new Date().toISOString()
          })
          .eq('id', donorId)
      }
    } catch (error) {
      console.error('updateDonorTotals error:', error)
      throw error
    }
  }
}

// Updated crowdfunding service with session authentication
export const crowdfundingService = {
  async getCampaigns(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .select(`
          *,
          project:projects(name, funding_needed)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getCampaigns error:', error)
      throw error
    }
  },

  async createCampaign(campaign) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createCampaign error:', error)
      throw error
    }
  },

  async updateCampaign(campaignId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateCampaign error:', error)
      throw error
    }
  },

  async syncCampaignData(campaignId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      // Get campaign details
      const { data: campaign, error } = await supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', session.user.id)
        .single()
      
      if (error) throw error

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
        
        if (updateError) throw updateError
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
        
        if (fallbackError) throw fallbackError
        return fallback
      }
    } catch (error) {
      console.error('syncCampaignData error:', error)
      throw error
    }
  }
}

// Updated application progress service with session authentication
export const applicationProgressService = {
  async getSubmissions(userId, filters = {}) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getSubmissions error:', error)
      throw error
    }
  },

  async createSubmission(submission) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error

      // Create initial status update
      await this.createStatusUpdate(data.id, submission.status || 'submitted', 'manual', 'Application created')
      
      return data
    } catch (error) {
      console.error('createSubmission error:', error)
      throw error
    }
  },

  async updateSubmission(submissionId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error

      // If status changed, create a status update record
      if (updates.status) {
        await this.createStatusUpdate(submissionId, updates.status, 'manual')
      }
      
      return data
    } catch (error) {
      console.error('updateSubmission error:', error)
      throw error
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createStatusUpdate error:', error)
      throw error
    }
  },

  async uploadDocument(submissionId, document) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('uploadDocument error:', error)
      throw error
    }
  },

  async createReport(submissionId, report) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
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
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createReport error:', error)
      throw error
    }
  },

  async getSubmissionStats(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No authenticated session')
      }

      const { data, error } = await supabase
        .from('application_submissions')
        .select('status, award_amount, requested_amount')
        .eq('user_id', session.user.id)

      if (error) throw error

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
      throw error
    }
  }
}