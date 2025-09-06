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

// Enhanced auth helpers that work with session manager
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

// Updated user profile service that works with session manager
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

  // Safe method that handles all cases
  async getOrCreateProfile(defaultData = {}) {
    try {
      // Wait for session to be ready
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

// Project service with session awareness
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

// Opportunity service (no auth needed)
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

// Donor service with session awareness
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

// Hook to use in components for session-aware data loading
export const useSessionAwareEffect = (callback, dependencies = []) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  
  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      try {
        // Wait for session to be ready
        await sessionManager.waitForSession()
        
        if (mounted) {
          const result = await callback()
          setData(result)
          setLoading(false)
        }
      } catch (error) {
        console.error('Session-aware effect error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, dependencies)
  
  return { data, loading }
}

// Simple hook for components
export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const session = await sessionManager.waitForSession()
        
        if (mounted) {
          setIsAuthenticated(!!session?.user)
          setUser(session?.user || null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth state check error:', error)
        if (mounted) {
          setIsAuthenticated(false)
          setUser(null)
          setLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  return { isAuthenticated, loading, user }
}