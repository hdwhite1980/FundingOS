import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Existing services (keeping your current implementations)
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
  },

  async deleteProject(projectId) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (error) throw error
    return true
  }
}

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

// NEW SERVICES - Add these to your existing file

// Donor Management Service
export const donorService = {
  async getDonors(userId, filters = {}) {
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
    if (error) throw error
    return data || []
  },

  async createDonor(donor) {
    const { data, error } = await supabase
      .from('donors')
      .insert([donor])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateDonor(donorId, updates) {
    const { data, error } = await supabase
      .from('donors')
      .update(updates)
      .eq('id', donorId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteDonor(donorId) {
    const { error } = await supabase
      .from('donors')
      .delete()
      .eq('id', donorId)
    
    if (error) throw error
    return true
  },

  async getDonorStats(userId) {
    const { data, error } = await supabase
      .from('donors')
      .select('total_donated, donation_count, donor_type, is_major_donor')
      .eq('user_id', userId)

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
  }
}

// Donation Management Service
export const donationService = {
  async getDonations(userId, filters = {}) {
    let query = supabase
      .from('donations')
      .select(`
        *,
        donor:donors(*),
        project:projects(name)
      `)
      .eq('user_id', userId)
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
  },

  async createDonation(donation) {
    const { data, error } = await supabase
      .from('donations')
      .insert([donation])
      .select()
      .single()
    
    if (error) throw error

    // Update donor totals
    await this.updateDonorTotals(donation.donor_id)
    
    return data
  },

  async updateDonation(donationId, updates) {
    const { data, error } = await supabase
      .from('donations')
      .update(updates)
      .eq('id', donationId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateDonorTotals(donorId) {
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
  }
}

// Crowdfunding Campaign Service
export const crowdfundingService = {
  async getCampaigns(userId) {
    const { data, error } = await supabase
      .from('crowdfunding_campaigns')
      .select(`
        *,
        project:projects(name, funding_needed)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createCampaign(campaign) {
    const { data, error } = await supabase
      .from('crowdfunding_campaigns')
      .insert([campaign])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateCampaign(campaignId, updates) {
    const { data, error } = await supabase
      .from('crowdfunding_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async syncCampaignData(campaignId) {
    // Get campaign details
    const { data: campaign, error } = await supabase
      .from('crowdfunding_campaigns')
      .select('*')
      .eq('id', campaignId)
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
        .select()
        .single()
      
      if (fallbackError) throw fallbackError
      return fallback
    }
  }
}

// Application Progress Service
export const applicationProgressService = {
  async getSubmissions(userId, filters = {}) {
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
      .eq('user_id', userId)
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
  },

  async createSubmission(submission) {
    const { data, error } = await supabase
      .from('application_submissions')
      .insert([submission])
      .select()
      .single()
    
    if (error) throw error

    // Create initial status update
    await this.createStatusUpdate(data.id, submission.status || 'submitted', 'manual', 'Application created')
    
    return data
  },

  async updateSubmission(submissionId, updates) {
    const { data, error } = await supabase
      .from('application_submissions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', submissionId)
      .select()
      .single()
    
    if (error) throw error

    // If status changed, create a status update record
    if (updates.status) {
      await this.createStatusUpdate(submissionId, updates.status, 'manual')
    }
    
    return data
  },

  async createStatusUpdate(submissionId, newStatus, source = 'manual', notes = '') {
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
        notes: notes
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async uploadDocument(submissionId, document) {
    const { data, error } = await supabase
      .from('application_documents')
      .insert([{
        submission_id: submissionId,
        ...document
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async createReport(submissionId, report) {
    const { data, error } = await supabase
      .from('grant_reports')
      .insert([{
        submission_id: submissionId,
        ...report
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getSubmissionStats(userId) {
    const { data, error } = await supabase
      .from('application_submissions')
      .select('status, award_amount, requested_amount')
      .eq('user_id', userId)

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
  }
}