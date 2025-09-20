/**
 * Global WALI-OS Assistant Manager
 * Ensures only one assistant instance is open at a time
 * Manages field context transfer and state persistence
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
      settings: {}
    }
  }

  // Set the active assistant instance
  setInstance(instance) {
    if (this.instance && this.instance !== instance) {
      // Close existing instance
      console.log('Closing existing WALI-OS Assistant instance')
      if (this.instance.close) {
        this.instance.close()
      }
    }
    this.instance = instance
  }

  // Open assistant with optional field context
  openAssistant(context = {}) {
    if (this.instance) {
      // If assistant exists, just show it and set context
      this.instance.show(context)
      if (context.fieldContext) {
        this.setFieldContext(context.fieldContext)
      }
      return this.instance
    }
    
    // No instance exists, caller should create one
    return null
  }

  // Set field context for targeted help
  setFieldContext(fieldContext) {
    this.fieldContext = fieldContext
    if (this.instance && this.instance.setFieldContext) {
      this.instance.setFieldContext(fieldContext)
    }
  }

  // Update customer data
  updateCustomerData(data) {
    this.currentData = { ...this.currentData, ...data }
    if (this.instance && this.instance.updateData) {
      this.instance.updateData(this.currentData)
    }
  }

  // Close assistant
  closeAssistant() {
    if (this.instance) {
      this.instance.hide()
    }
    this.fieldContext = null
    this.isOpen = false
  }

  // Get current data
  getCurrentData() {
    return this.currentData
  }

  // Get field context
  getFieldContext() {
    return this.fieldContext
  }

  // Check if assistant is available
  isAssistantAvailable() {
    return this.instance !== null
  }
}

// Global singleton instance
const assistantManager = new AssistantManager()

export default assistantManager