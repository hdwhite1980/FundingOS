/**
 * Global WALI-OS Assistant Manager
 * Ensures only one assistant instance is open at a time
 * Manages field context transfer and state persistence
 * Enhanced with real data validation and better state management
 */

class AssistantManager {
  constructor() {
    this.instance = null
    this.isOpen = false
    this.fieldContext = null
    this.currentData = {
      userProfile: null,
      allProjects: [],
      opportunities: [],
      submissions: [],
      settings: {},
      compliance: null
    }
    this.lastDataUpdate = null
    this.dataValidation = {
      hasEIN: false,
      hasProjects: false,
      hasApplications: false,
      hasOpportunities: false,
      hasComplianceData: false,
      orgName: null
    }
  }

  // Set the active assistant instance
  setInstance(instance) {
    if (this.instance && this.instance !== instance) {
      // Close existing instance
      console.log('🔄 Closing existing WALI-OS Assistant instance')
      if (this.instance.close) {
        this.instance.close()
      }
    }
    
    console.log('📋 Setting new WALI-OS Assistant instance')
    this.instance = instance
    
    // If we have existing data, update the new instance
    if (this.currentData.userProfile) {
      this.updateInstanceData()
    }
  }

  // Open assistant with optional field context
  openAssistant(context = {}) {
    console.log('🚀 Opening WALI-OS Assistant with context:', context)
    
    if (this.instance) {
      // If assistant exists, just show it and set context
      this.instance.show(context)
      this.isOpen = true
      
      if (context.fieldContext) {
        this.setFieldContext(context.fieldContext)
      }
      
      // Trigger a data refresh if data is stale
      if (this.isDataStale()) {
        console.log('📊 Data appears stale, requesting refresh')
        this.requestDataRefresh()
      }
      
      return this.instance
    }
    
    console.log('⚠️ No assistant instance available')
    // No instance exists, caller should create one
    return null
  }

  // Set field context for targeted help
  setFieldContext(fieldContext) {
    console.log('🎯 Setting field context:', fieldContext)
    this.fieldContext = fieldContext
    
    if (this.instance && this.instance.setFieldContext) {
      this.instance.setFieldContext(fieldContext)
    }
  }

  // Enhanced data update with validation
  updateCustomerData(data) {
    console.log('📊 Updating customer data:', {
      hasUserProfile: !!data.userProfile,
      projectsCount: data.allProjects?.length || 0,
      opportunitiesCount: data.opportunities?.length || 0,
      submissionsCount: data.submissions?.length || 0
    })
    
    // Merge new data with existing
    this.currentData = { 
      ...this.currentData, 
      ...data,
      // Ensure arrays are always arrays
      allProjects: data.allProjects || this.currentData.allProjects || [],
      opportunities: data.opportunities || this.currentData.opportunities || [],
      submissions: data.submissions || this.currentData.submissions || [],
      compliance: data.compliance || this.currentData.compliance || null
    }
    
    // Update validation flags
    this.updateDataValidation()
    
    // Update timestamp
    this.lastDataUpdate = new Date()
    
    // Update the instance if available
    this.updateInstanceData()
  }

  // Update data validation flags
  updateDataValidation() {
    const profile = this.currentData.userProfile
    
    this.dataValidation = {
      hasEIN: !!(profile?.ein || profile?.tax_id),
      hasProjects: (this.currentData.allProjects?.length || 0) > 0,
      hasApplications: (this.currentData.submissions?.length || 0) > 0,
      hasOpportunities: (this.currentData.opportunities?.length || 0) > 0,
      hasComplianceData: !!this.currentData.compliance,
      orgName: profile?.organization_name || profile?.full_name || null,
      userId: profile?.user_id || profile?.id || null
    }
    
    console.log('✅ Data validation updated:', this.dataValidation)
  }

  // Update instance with current data
  updateInstanceData() {
    if (this.instance && this.instance.updateData) {
      console.log('🔄 Updating instance with current data')
      this.instance.updateData(this.currentData)
    }
  }

  // Check if data is stale (older than 5 minutes)
  isDataStale() {
    if (!this.lastDataUpdate) return true
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return this.lastDataUpdate < fiveMinutesAgo
  }

  // Request data refresh from parent components
  requestDataRefresh() {
    if (this.instance && this.instance.requestDataRefresh) {
      console.log('🔄 Requesting data refresh from instance')
      this.instance.requestDataRefresh()
    }
  }

  // Enhanced assistant opening with smart context
  openAssistantSmart(options = {}) {
    const {
      proactiveMode = false,
      fieldContext = null,
      triggerContext = {},
      forceRefresh = false
    } = options
    
    console.log('🧠 Opening assistant with smart context:', options)
    
    // Force data refresh if requested
    if (forceRefresh) {
      this.requestDataRefresh()
    }
    
    // Build enhanced context based on current data
    const enhancedContext = {
      fieldContext,
      triggerContext,
      proactiveMode,
      dataContext: {
        validation: this.dataValidation,
        lastUpdate: this.lastDataUpdate,
        isStale: this.isDataStale()
      }
    }
    
    return this.openAssistant(enhancedContext)
  }

  // Close assistant
  closeAssistant() {
    console.log('❌ Closing WALI-OS Assistant')
    
    if (this.instance) {
      this.instance.hide()
    }
    
    this.fieldContext = null
    this.isOpen = false
  }

  // Get current data
  getCurrentData() {
    return {
      ...this.currentData,
      meta: {
        lastUpdate: this.lastDataUpdate,
        validation: this.dataValidation,
        isStale: this.isDataStale()
      }
    }
  }

  // Get field context
  getFieldContext() {
    return this.fieldContext
  }

  // Get data validation status
  getDataValidation() {
    return this.dataValidation
  }

  // Check if assistant is available
  isAssistantAvailable() {
    return this.instance !== null
  }

  // Check if assistant is currently open
  isAssistantOpen() {
    return this.isOpen && this.instance
  }

  // Get assistant status for debugging
  getStatus() {
    return {
      hasInstance: !!this.instance,
      isOpen: this.isOpen,
      hasFieldContext: !!this.fieldContext,
      dataValidation: this.dataValidation,
      lastDataUpdate: this.lastDataUpdate,
      isDataStale: this.isDataStale(),
      currentDataSummary: {
        hasUserProfile: !!this.currentData.userProfile,
        projectsCount: this.currentData.allProjects?.length || 0,
        opportunitiesCount: this.currentData.opportunities?.length || 0,
        submissionsCount: this.currentData.submissions?.length || 0
      }
    }
  }

  // Smart assistant triggering based on data context
  triggerContextualAssistant(trigger, context = {}) {
    console.log(`🎯 Triggering contextual assistant: ${trigger}`, context)
    
    const triggerMap = {
      'deadline_approaching': this.handleDeadlineApproaching,
      'incomplete_application': this.handleIncompleteApplication,
      'new_opportunity': this.handleNewOpportunity,
      'missing_ein': this.handleMissingEIN,
      'empty_profile': this.handleEmptyProfile,
      'field_help': this.handleFieldHelp
    }
    
    const handler = triggerMap[trigger]
    if (handler) {
      return handler.call(this, context)
    } else {
      console.warn(`⚠️ Unknown trigger: ${trigger}`)
      return this.openAssistant({ triggerContext: { trigger, context } })
    }
  }

  // Handler for deadline approaching
  handleDeadlineApproaching(context) {
    return this.openAssistantSmart({
      proactiveMode: true,
      triggerContext: {
        trigger: 'deadline_approaching',
        context
      }
    })
  }

  // Handler for incomplete application
  handleIncompleteApplication(context) {
    return this.openAssistantSmart({
      proactiveMode: true,
      triggerContext: {
        trigger: 'incomplete_application',
        context
      }
    })
  }

  // Handler for new opportunity
  handleNewOpportunity(context) {
    return this.openAssistantSmart({
      proactiveMode: true,
      triggerContext: {
        trigger: 'new_opportunity',
        context
      }
    })
  }

  // Handler for missing EIN
  handleMissingEIN(context) {
    return this.openAssistantSmart({
      proactiveMode: true,
      triggerContext: {
        trigger: 'missing_ein',
        context: {
          ...context,
          message: "I notice you don't have an EIN on file. This is required for most grant applications."
        }
      }
    })
  }

  // Handler for empty profile
  handleEmptyProfile(context) {
    return this.openAssistantSmart({
      proactiveMode: true,
      triggerContext: {
        trigger: 'empty_profile',
        context: {
          ...context,
          message: "Let's get your organization profile set up to unlock better funding recommendations."
        }
      }
    })
  }

  // Handler for field-specific help
  handleFieldHelp(fieldContext) {
    return this.openAssistantSmart({
      fieldContext,
      triggerContext: {
        trigger: 'field_help',
        context: fieldContext
      }
    })
  }

  // Auto-trigger assistant based on data state
  autoTriggerIfNeeded() {
    if (!this.dataValidation.hasEIN && this.dataValidation.userId) {
      console.log('🔔 Auto-triggering: Missing EIN')
      setTimeout(() => this.triggerContextualAssistant('missing_ein'), 2000)
      return true
    }
    
    if (!this.dataValidation.orgName && this.dataValidation.userId) {
      console.log('🔔 Auto-triggering: Empty profile')
      setTimeout(() => this.triggerContextualAssistant('empty_profile'), 3000)
      return true
    }
    
    // Check for approaching deadlines
    const urgentDeadlines = this.findUrgentDeadlines()
    if (urgentDeadlines.length > 0) {
      console.log('🔔 Auto-triggering: Urgent deadlines')
      setTimeout(() => this.triggerContextualAssistant('deadline_approaching', {
        deadlines: urgentDeadlines
      }), 1000)
      return true
    }
    
    return false
  }

  // Find urgent deadlines (within 7 days)
  findUrgentDeadlines() {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const urgentDeadlines = []
    
    // Check opportunities
    this.currentData.opportunities?.forEach(opp => {
      if (opp.deadline && new Date(opp.deadline) <= sevenDaysFromNow) {
        urgentDeadlines.push({
          type: 'opportunity',
          title: opp.title,
          deadline: opp.deadline,
          daysLeft: Math.ceil((new Date(opp.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        })
      }
    })
    
    // Check submissions
    this.currentData.submissions?.forEach(sub => {
      if (sub.deadline && new Date(sub.deadline) <= sevenDaysFromNow) {
        urgentDeadlines.push({
          type: 'submission',
          title: sub.title,
          deadline: sub.deadline,
          daysLeft: Math.ceil((new Date(sub.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        })
      }
    })
    
    return urgentDeadlines.sort((a, b) => a.daysLeft - b.daysLeft)
  }

  // Debug method to log current state
  debugLog() {
    console.log('🐛 WALI-OS Assistant Manager Debug:', this.getStatus())
  }
}

// Global singleton instance
const assistantManager = new AssistantManager()

// Auto-debug in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.waliAssistantManager = assistantManager
  console.log('🔧 WALI-OS Assistant Manager available as window.waliAssistantManager')
}

export default assistantManager