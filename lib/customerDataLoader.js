/**
 * Comprehensive Customer Data Loader for WALI-OS Assistant
 * Fetches ALL customer information for context-aware assistance
 */

export async function loadCompleteCustomerData(userId) {
  if (!userId) {
    console.error('❌ No userId provided to loadCompleteCustomerData')
    return getEmptyData()
  }

  const data = {
    userProfile: null,
    companySettings: null,
    userSettings: null,
    allProjects: [],
    submissions: [],
    opportunities: [],
    certifications: [],
    statistics: {}
  }

  try {
    // Load user profile data
    const profileResponse = await fetch(`/api/account/profile?userId=${encodeURIComponent(userId)}`)
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      data.userProfile = profileData.profile
    }

    // Load company settings
    try {
      const companyResponse = await fetch(`/api/company-settings?userId=${encodeURIComponent(userId)}`)
      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        data.companySettings = companyData.settings
      }
    } catch (e) {
      console.log('Company settings not available yet')
    }

    // Load user settings/preferences
    try {
      const userSettingsResponse = await fetch(`/api/user-settings?userId=${encodeURIComponent(userId)}`)
      if (userSettingsResponse.ok) {
        const userSettingsData = await userSettingsResponse.json()
        data.userSettings = userSettingsData.settings
      }
    } catch (e) {
      console.log('User settings not available yet')
    }

    // Load all projects with detailed information
    const projectsResponse = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`)
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json()
      data.allProjects = projectsData.projects || []
    }

    // Load all submissions
    const submissionsResponse = await fetch(`/api/complete-submissions?userId=${encodeURIComponent(userId)}`)
    if (submissionsResponse.ok) {
      const submissionsData = await submissionsResponse.json()
      data.submissions = submissionsData.submissions || []
      data.statistics = submissionsData.stats || {}
    }

    // Load opportunities
    try {
      const opportunitiesResponse = await fetch(`/api/project-opportunities?userId=${encodeURIComponent(userId)}`)
      if (opportunitiesResponse.ok) {
        const opportunitiesData = await opportunitiesResponse.json()
        data.opportunities = opportunitiesData.opportunities || []
      }
    } catch (e) {
      console.log('Opportunities not available yet')
    }

    // Load certifications and capabilities
    try {
      const certsResponse = await fetch(`/api/certifications?userId=${encodeURIComponent(userId)}`)
      if (certsResponse.ok) {
        const certsData = await certsResponse.json()
        data.certifications = certsData.certifications || []
      }
    } catch (e) {
      console.log('Certifications not available yet')
    }

    console.log('✅ Loaded complete customer data:', {
      userId: userId.substring(0, 8) + '...',
      profile: !!data.userProfile,
      company: !!data.companySettings,  
      userSettings: !!data.userSettings,
      projects: data.allProjects.length,
      submissions: data.submissions.length,
      opportunities: data.opportunities.length,
      certifications: data.certifications.length
    })

    return data

  } catch (error) {
    console.error('❌ Error loading complete customer data:', error)
    return data
  }
}

function getEmptyData() {
  return {
    userProfile: null,
    companySettings: null,
    userSettings: null,
    allProjects: [],
    submissions: [],
    opportunities: [],
    certifications: [],
    statistics: {}
  }
}

export function buildComprehensiveContext(customerData, fieldContext = null) {
  const context = {
    customer: {
      name: customerData.userProfile?.full_name || 'Customer',
      email: customerData.userProfile?.email,
      company: customerData.userProfile?.company || customerData.companySettings?.organization_name,
      title: customerData.userProfile?.title,
      profile: customerData.userProfile,
      companySettings: customerData.companySettings,
      userSettings: customerData.userSettings
    },
    projects: {
      total: customerData.allProjects.length,
      active: customerData.allProjects.filter(p => p.status === 'active').length,
      completed: customerData.allProjects.filter(p => p.status === 'completed').length,
      details: customerData.allProjects
    },
    submissions: {
      total: customerData.submissions.length,
      pending: customerData.submissions.filter(s => s.status === 'pending').length,
      submitted: customerData.submissions.filter(s => s.status === 'submitted').length,
      details: customerData.submissions
    },
    opportunities: {
      total: customerData.opportunities.length,
      available: customerData.opportunities.filter(o => o.status === 'open').length,
      details: customerData.opportunities
    },
    capabilities: {
      certifications: customerData.certifications,
      organizationType: customerData.companySettings?.organization_type,
      einNumber: customerData.companySettings?.ein,
      dunsNumber: customerData.companySettings?.duns_number,
      cageCode: customerData.companySettings?.cage_code
    },
    fieldContext: fieldContext,
    statistics: customerData.statistics
  }

  return context
}