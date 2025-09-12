import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we're in a build context with placeholder values
const isPlaceholder = supabaseUrl?.includes('your_supabase_url_here') || 
                     supabaseAnonKey?.includes('your_supabase_anon_key_here');

if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== 'undefined') {
  throw new Error('Missing Supabase environment variables')
}

// Create a mock client for build time to prevent errors
const mockClient = {
  from: () => ({
    select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
  }),
  auth: {
    signUp: () => Promise.resolve({ data: null, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
};

export const supabase = (isPlaceholder || !supabaseUrl || !supabaseAnonKey) 
  ? mockClient 
  : createClient(supabaseUrl, supabaseAnonKey, {
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
            user_role: 'company', // default role
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

        // PROJECT TYPES: Make this more flexible to include SAM.gov contracts
        if (filters.projectTypes && filters.projectTypes.length > 0) {
          const projectType = filters.projectTypes[0] // Get the main project type
          
          // Create a more inclusive filter that includes SAM.gov contract types
          const inclusiveTypes = [...filters.projectTypes]
          
          // Map user project types to include relevant SAM.gov contract types
          const projectTypeMapping = {
            'technology': ['technology', 'contract', 'services', 'research'],
            'commercial_development': ['commercial_development', 'contract', 'services', 'development'],
            'infrastructure': ['infrastructure', 'contract', 'services', 'construction'],
            'research': ['research', 'contract', 'services', 'technology'],
            'healthcare': ['healthcare', 'contract', 'services', 'medical'],
            'education': ['education', 'contract', 'services', 'training'],
            'community_development': ['community_development', 'contract', 'services', 'development'],
            'environmental': ['environmental', 'contract', 'services', 'sustainability']
          }
          
          // Add related types for the main project type
          if (projectTypeMapping[projectType]) {
            inclusiveTypes.push(...projectTypeMapping[projectType])
          } else {
            // For unknown project types, include contracts and services as fallback
            inclusiveTypes.push('contract', 'services')
          }
          
          // Remove duplicates
          const uniqueTypes = [...new Set(inclusiveTypes)]
          
          console.log(`🔍 Searching for project types: ${uniqueTypes.join(', ')}`)
          
          // Use overlap operator to find opportunities that match any of these types
          query = query.overlaps('project_types', uniqueTypes)
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

        console.log(`📊 Found ${data?.length || 0} opportunities (including ${data?.filter(opp => opp.source === 'sam_gov').length || 0} SAM.gov contracts)`)

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
    },

    async getTotalAmountReceived(userId) {
      try {
        // Get total from awarded grants/funding
        const { data: applications, error: appError } = await supabase
          .from('submissions')
          .select('awarded_amount')
          .eq('user_id', userId)
          .eq('status', 'awarded')

        // Get total from donations
        const { data: donations, error: donationError } = await supabase
          .from('donations')
          .select('amount')
          .eq('user_id', userId)

        // Get total from campaigns (if you have a campaigns table)
        // For now, we'll just use donations and applications
        
        let totalAwarded = 0
        let totalDonations = 0

        if (!appError && applications) {
          totalAwarded = applications.reduce((sum, app) => sum + (app.awarded_amount || 0), 0)
        }

        if (!donationError && donations) {
          totalDonations = donations.reduce((sum, donation) => sum + (donation.amount || 0), 0)
        }

        return {
          totalAwarded,
          totalDonations,
          totalReceived: totalAwarded + totalDonations,
          breakdown: {
            funding: totalAwarded,
            donations: totalDonations,
            campaigns: 0 // TODO: Add campaigns when implemented
          }
        }
      } catch (error) {
        console.error('getTotalAmountReceived error:', error)
        return {
          totalAwarded: 0,
          totalDonations: 0,
          totalReceived: 0,
          breakdown: { funding: 0, donations: 0, campaigns: 0 }
        }
      }
    },

    async getFinancialInsights(userId) {
      try {
        // Get recent financial activity for insights
        const [recentDonations, recentAwards, monthlyStats] = await Promise.all([
          supabase
            .from('donations')
            .select('amount, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('submissions')
            .select('awarded_amount, status, created_at')
            .eq('user_id', userId)
            .eq('status', 'awarded')
            .order('created_at', { ascending: false })
            .limit(3),
          supabase
            .from('donations')
            .select('amount, created_at')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        ])

        // Calculate trends and insights
        const insights = []
        
        // Recent activity insight
        if (recentDonations.data?.length > 0) {
          const latestDonation = recentDonations.data[0]
          const daysAgo = Math.floor((new Date() - new Date(latestDonation.created_at)) / (1000 * 60 * 60 * 24))
          insights.push({
            type: 'recent_activity',
            title: 'Recent Donation',
            description: `$${latestDonation.amount.toLocaleString()} received ${daysAgo === 0 ? 'today' : `${daysAgo} days ago`}`,
            icon: 'heart',
            color: 'green'
          })
        }

        // Award success insight
        if (recentAwards.data?.length > 0) {
          const latestAward = recentAwards.data[0]
          insights.push({
            type: 'grant_success',
            title: 'Grant Awarded',
            description: `$${latestAward.awarded_amount.toLocaleString()} in funding secured`,
            icon: 'trophy',
            color: 'gold'
          })
        }

        // Monthly trend insight
        if (monthlyStats.data?.length > 0) {
          const monthlyTotal = monthlyStats.data.reduce((sum, d) => sum + d.amount, 0)
          insights.push({
            type: 'monthly_trend',
            title: 'This Month',
            description: `$${monthlyTotal.toLocaleString()} in donations received`,
            icon: 'trending-up',
            color: 'blue'
          })
        }

        return insights
      } catch (error) {
        console.error('getFinancialInsights error:', error)
        return []
      }
    }
  },

  campaigns: {
    async getCampaigns(userId, filters = {}) {
      try {
        let query = supabase
          .from('campaigns')
          .select(`
            *,
            project:projects(id, name)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.platform) {
          query = query.eq('platform', filters.platform)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }

        const { data, error } = await query
        
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

    async createCampaign(userId, campaignData) {
      try {
        const newCampaign = {
          ...campaignData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('campaigns')
          .insert([newCampaign])
          .select()
          .single()

        if (error) {
          console.error('Campaign creation error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('createCampaign error:', error)
        throw error
      }
    },

    async updateCampaign(userId, campaignId, updates) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Campaign update error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('updateCampaign error:', error)
        throw error
      }
    },

    async deleteCampaign(userId, campaignId) {
      try {
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .eq('id', campaignId)
          .eq('user_id', userId)

        if (error) {
          console.error('Campaign deletion error:', error)
          throw error
        }

        return true
      } catch (error) {
        console.error('deleteCampaign error:', error)
        throw error
      }
    },

    async getCampaignStats(userId) {
      try {
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('status, raised_amount, goal_amount, supporter_count')
          .eq('user_id', userId)

        if (error) {
          console.error('Campaign stats error:', error)
          return {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalRaised: 0,
            totalGoal: 0,
            totalSupporters: 0
          }
        }

        const stats = campaigns.reduce((acc, campaign) => {
          acc.totalCampaigns++
          if (campaign.status === 'active') acc.activeCampaigns++
          acc.totalRaised += parseFloat(campaign.raised_amount || 0)
          acc.totalGoal += parseFloat(campaign.goal_amount || 0)
          acc.totalSupporters += parseInt(campaign.supporter_count || 0)
          return acc
        }, {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalRaised: 0,
          totalGoal: 0,
          totalSupporters: 0
        })

        return stats
      } catch (error) {
        console.error('getCampaignStats error:', error)
        return {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalRaised: 0,
          totalGoal: 0,
          totalSupporters: 0
        }
      }
    }
  },

  investors: {
    async getInvestors(userId, filters = {}) {
      try {
        let query = supabase
          .from('investors')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (filters.status) {
          query = query.eq('status', filters.status)
        }

        if (filters.investorType) {
          query = query.eq('investor_type', filters.investorType)
        }

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,focus_areas.ilike.%${filters.search}%`)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Investors fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getInvestors error:', error)
        return []
      }
    },

    async createInvestor(userId, investorData) {
      try {
        const newInvestor = {
          ...investorData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('investors')
          .insert([newInvestor])
          .select()
          .single()

        if (error) {
          console.error('Investor creation error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('createInvestor error:', error)
        throw error
      }
    },

    async updateInvestor(userId, investorId, updates) {
      try {
        const { data, error } = await supabase
          .from('investors')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', investorId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) {
          console.error('Investor update error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('updateInvestor error:', error)
        throw error
      }
    },

    async deleteInvestor(userId, investorId) {
      try {
        const { error } = await supabase
          .from('investors')
          .delete()
          .eq('id', investorId)
          .eq('user_id', userId)

        if (error) {
          console.error('Investor deletion error:', error)
          throw error
        }

        return true
      } catch (error) {
        console.error('deleteInvestor error:', error)
        throw error
      }
    },

    async getInvestments(userId, filters = {}) {
      try {
        let query = supabase
          .from('investments')
          .select(`
            *,
            investor:investors(id, name, company),
            project:projects(id, name)
          `)
          .eq('user_id', userId)
          .order('investment_date', { ascending: false })

        if (filters.investorId) {
          query = query.eq('investor_id', filters.investorId)
        }

        if (filters.projectId) {
          query = query.eq('project_id', filters.projectId)
        }

        if (filters.investmentType) {
          query = query.eq('investment_type', filters.investmentType)
        }

        const { data, error } = await query
        
        if (error) {
          console.error('Investments fetch error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('getInvestments error:', error)
        return []
      }
    },

    async createInvestment(userId, investmentData) {
      try {
        const newInvestment = {
          ...investmentData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('investments')
          .insert([newInvestment])
          .select()
          .single()

        if (error) {
          console.error('Investment creation error:', error)
          throw error
        }

        return data
      } catch (error) {
        console.error('createInvestment error:', error)
        throw error
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
    },

    async getRecentActivity(userId, limit = 5) {
      try {
        if (!userId) {
          console.warn('getRecentActivity: No userId provided')
          return []
        }

        console.log('getRecentActivity: Using userId:', userId, 'limit:', limit)

        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            projects:project_id (name, description),
            opportunities:opportunity_id (title, sponsor)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Recent activity fetch error:', error)
          return []
        }

        // Format the data for dashboard use
        const formattedActivity = (data || []).map(submission => ({
          id: submission.id,
          project_name: submission.projects?.name || 'Unknown Project',
          grant_title: submission.opportunities?.title || 'Unknown Opportunity',
          created_at: submission.created_at,
          amount_requested: submission.submitted_amount,
          status: submission.status
        }))

        console.log('getRecentActivity result count:', formattedActivity.length)
        return formattedActivity
      } catch (error) {
        console.error('getRecentActivity error:', error)
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
          user_role: 'company',
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
        user_role: profile.user_role || 'company',
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

// ANGEL INVESTOR SERVICES - Direct user services for angel investor functionality
export const angelInvestorServices = {
  // Angel Investor Profile Management
  async getOrCreateAngelInvestor(userId, userEmail) {
    try {
      // Try to get existing angel investor profile
      const { data: existingInvestor, error: getError } = await supabase
        .from('angel_investors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (existingInvestor) {
        return existingInvestor
      }

      // If no profile exists, create one (handle 406 or no-row code)
      if (getError && (getError.code === 'PGRST116' || getError.code === '406')) {
        // Get user's full name from auth.users or user_profiles
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', userId)
          .single()

        const newInvestor = {
          user_id: userId,
          name: userProfile?.full_name || 'Angel Investor',
          email: userEmail,
          accredited_status: false,
          investment_preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: createError } = await supabase
          .from('angel_investors')
          .insert([newInvestor])

        if (createError && createError.code !== '23505') { // ignore unique violation race
          throw createError
        }

        // Re-select after insert
        const { data: inserted, error: reselectError } = await supabase
          .from('angel_investors')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (reselectError) throw reselectError
        return inserted
      }

      throw getError
    } catch (error) {
      console.error('getOrCreateAngelInvestor error:', error)
      throw error
    }
  },

  async updateAngelInvestor(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('angel_investors')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateAngelInvestor error:', error)
      throw error
    }
  },

  // Merge investment_preferences JSON with new values
  async updateInvestmentPreferences(userId, partialPreferences) {
    try {
      // Fetch current preferences
      const { data: existing, error: fetchError } = await supabase
        .from('angel_investors')
        .select('investment_preferences')
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        console.error('updateInvestmentPreferences fetch error:', fetchError)
      }

      const merged = {
        ...(existing?.investment_preferences || {}),
        ...partialPreferences
      }

      // Prepare update data - include both JSON and individual completion flags
      const updateData = { 
        investment_preferences: merged, 
        updated_at: new Date().toISOString() 
      }

      // Also update individual completion flag columns based on the flags in the JSON
      const flags = merged.flags || {}
      if (flags.core_completed) updateData.core_completed = true
      if (flags.preferences_completed) updateData.preferences_completed = true  
      if (flags.enhancement_completed) updateData.enhancement_completed = true

      const { data, error } = await supabase
        .from('angel_investors')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateInvestmentPreferences error:', error)
      throw error
    }
  },

  // Investment Opportunities
  async getInvestmentOpportunities(filters = {}) {
    try {
      let query = supabase
        .from('investment_opportunities')
        .select('*')

      if (filters.featured) {
        query = query.eq('featured', true)
      }

      if (filters.funding_stage) {
        query = query.eq('funding_stage', filters.funding_stage)
      }

      if (filters.min_investment) {
        query = query.gte('minimum_investment', filters.min_investment)
      }

      if (filters.max_investment) {
        query = query.lte('minimum_investment', filters.max_investment)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('featured', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getInvestmentOpportunities error:', error)
      return []
    }
  },

  async getInvestmentOpportunity(projectId) {
    try {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('getInvestmentOpportunity error:', error)
      throw error
    }
  },

  // Investment Management
  async createInvestment(userId, investmentData) {
    try {
      // First get the investor's ID
      const { data: investor } = await supabase
        .from('angel_investors')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!investor) {
        throw new Error('Angel investor profile not found')
      }

      const newInvestment = {
        investor_id: investor.id,
        project_id: investmentData.project_id,
        investment_amount: investmentData.investment_amount,
        investment_type: investmentData.investment_type || 'equity',
        investment_date: investmentData.investment_date || new Date().toISOString(),
        status: 'active',
        notes: investmentData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('angel_investments')
        .insert([newInvestment])
        .select(`
          *,
          project:projects(id, name, description),
          investor:angel_investors(id, name, email)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('createInvestment error:', error)
      throw error
    }
  },

  async getInvestorPortfolio(userId) {
    try {
      // Look up investor id first (avoids unsupported nested filters causing 400)
      const { data: investorRow, error: investorErr } = await supabase
        .from('angel_investors')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (investorErr) {
        if (investorErr.code === 'PGRST116') return [] // no profile yet
        throw investorErr
      }

      const investorId = investorRow.id

      const { data, error } = await supabase
        .from('angel_investments')
        .select(`
          *,
          project:projects(id, name, description, amount_raised, funding_goal),
          investor:angel_investors(id, name, total_invested, portfolio_value, active_investments)
        `)
        .eq('investor_id', investorId)
        .order('investment_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('getInvestorPortfolio error:', error)
      return []
    }
  },

  async updateInvestment(userId, investmentId, updates) {
    try {
      // Verify the investment belongs to this user
      const { data: investment } = await supabase
        .from('angel_investments')
        .select(`
          id,
          investor:angel_investors!inner(user_id)
        `)
        .eq('id', investmentId)
        .eq('investor.user_id', userId)
        .single()

      if (!investment) {
        throw new Error('Investment not found or access denied')
      }

      const { data, error } = await supabase
        .from('angel_investments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', investmentId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateInvestment error:', error)
      throw error
    }
  },

  // Dashboard Stats
  async getAngelInvestorStats(userId) {
    try {
      const { data: investorRow, error: investorErr } = await supabase
        .from('angel_investors')
        .select('id,total_invested, portfolio_value, active_investments')
        .eq('user_id', userId)
        .single()

      if (investorErr) {
        if (investorErr.code === 'PGRST116') {
          return {
            totalInvested: 0,
            portfolioValue: 0,
            activeInvestments: 0,
            totalReturn: 0,
            avgROI: 0,
            stageDistribution: {},
            recentInvestments: []
          }
        }
        throw investorErr
      }

      const { data: investmentsData, error: invErr } = await supabase
        .from('angel_investments')
        .select(`
          investment_amount,
          current_value,
          roi_percentage,
          status,
          project:projects(name, funding_stage)
        `)
        .eq('investor_id', investorRow.id)
        .eq('status', 'active')

      if (invErr) throw invErr

      const investor = investorRow || { total_invested: 0, portfolio_value: 0, active_investments: 0 }
      const investments = investmentsData || []

      // Calculate additional metrics
      const avgROI = investments.length > 0 
        ? investments.reduce((sum, inv) => sum + (inv.roi_percentage || 0), 0) / investments.length
        : 0

      const totalReturn = investor.portfolio_value - investor.total_invested

      const stageDistribution = investments.reduce((acc, inv) => {
        const stage = inv.project?.funding_stage || 'unknown'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {})

      return {
        totalInvested: investor.total_invested,
        portfolioValue: investor.portfolio_value,
        activeInvestments: investor.active_investments,
        totalReturn,
        avgROI,
        stageDistribution,
        recentInvestments: investments.slice(0, 5)
      }
    } catch (error) {
      console.error('getAngelInvestorStats error:', error)
      return {
        totalInvested: 0,
        portfolioValue: 0,
        activeInvestments: 0,
        totalReturn: 0,
        avgROI: 0,
        stageDistribution: {},
        recentInvestments: []
      }
    }
  },

  // Project Management for Entrepreneurs
  async updateProjectForInvestment(userId, projectId, investmentData) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          seeking_investment: investmentData.seeking_investment,
          funding_goal: investmentData.funding_goal,
          minimum_investment: investmentData.minimum_investment,
          maximum_investment: investmentData.maximum_investment,
          funding_stage: investmentData.funding_stage,
          investment_deadline: investmentData.investment_deadline,
          highlights: investmentData.highlights,
          pitch_deck_url: investmentData.pitch_deck_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('updateProjectForInvestment error:', error)
      throw error
    }
  }
}

// Export the supabase client for direct use if needed
export default supabase

export const companiesServices = {
  async listCompanies(userId, filters = {}) {
    try {
      const { search, featured, limit = 30, offset = 0 } = filters;
      let query = supabase.from('companies').select('*', { count: 'exact' }).eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (featured) query = query.eq('featured', true);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (e) { console.error('listCompanies error', e); return { data: [], count: 0 }; }
  },
  async createCompany(userId, payload) {
    try {
      const newCompany = { user_id: userId, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from('companies').insert([newCompany]).select().single();
      if (error) throw error;
      return data;
    } catch (e) { console.error('createCompany error', e); throw e; }
  },
  async updateCompany(userId, companyId, updates) {
    try {
      const { data, error } = await supabase.from('companies')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', companyId).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    } catch (e) { console.error('updateCompany error', e); throw e; }
  },
  async deleteCompany(userId, companyId) {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyId).eq('user_id', userId);
      if (error) throw error;
      return true;
    } catch (e) { console.error('deleteCompany error', e); throw e; }
  },
  async getCompanyProjects(userId, companyId) {
    try {
      const { data, error } = await supabase.from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error; return data || [];
    } catch (e) { console.error('getCompanyProjects error', e); return []; }
  },
  async attachProject(userId, projectId, companyId) {
    try {
      const { data, error } = await supabase.from('projects')
        .update({ company_id: companyId, updated_at: new Date().toISOString() })
        .eq('id', projectId).eq('user_id', userId).select().single();
      if (error) throw error; return data;
    } catch (e) { console.error('attachProject error', e); throw e; }
  },
  async listCompanyOverviews(userId, filters = {}) {
    try {
      const { industry, stage, seeking_investment, search, limit = 30, offset = 0 } = filters;
      let query = supabase.from('company_portfolio_overview').select('*', { count: 'exact' });
      if (userId) query = query.eq('user_id', userId);
      if (industry) query = query.eq('industry', industry);
      if (stage) query = query.eq('stage', stage);
      if (seeking_investment !== undefined) query = query.eq('seeking_investment', seeking_investment);
      if (search) query = query.ilike('name', `%${search}%`);
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data, error, count } = await query;
      if (error) throw error; return { data: data || [], count: count || 0 };
    } catch (e) { console.error('listCompanyOverviews error', e); return { data: [], count: 0 }; }
  },
  async listUnassignedProjects(userId) {
    try {
      const { data, error } = await supabase.from('projects')
        .select('id,name,funding_goal,amount_raised,seeking_investment')
        .eq('user_id', userId)
        .is('company_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error; return data || [];
    } catch (e) { console.error('listUnassignedProjects error', e); return []; }
  },
  async createProjectForCompany(userId, companyId, payload) {
    try {
      const newProject = { user_id: userId, company_id: companyId, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from('projects').insert([newProject]).select().single();
      if (error) throw error; return data;
    } catch (e) { console.error('createProjectForCompany error', e); throw e; }
  }
};