// Simple Node test to verify assistantManager behavior
const assistantManager = require('../utils/assistantManager').default || require('../utils/assistantManager')

console.log('Starting assistantManager test')

// Mock instance with basic methods
const mockInstance = {
  show: (context) => console.log('mockInstance.show called with', context),
  hide: () => console.log('mockInstance.hide called'),
  close: () => console.log('mockInstance.close called'),
  setFieldContext: (ctx) => console.log('mockInstance.setFieldContext', ctx),
  updateData: (data) => console.log('mockInstance.updateData', Object.keys(data))
}

// Set instance
assistantManager.setInstance(mockInstance)

// Update customer data
assistantManager.updateCustomerData({ userProfile: { id: 'user1', organization_name: 'Test Org', ein: '12-345' }, allProjects: [{ id: 1, name: 'Test Project' }], submissions: [] })

// Open assistant with field context
assistantManager.openAssistant({ fieldContext: { fieldName: 'project_description' } })

// Trigger field help
assistantManager.triggerContextualAssistant('field_help', { fieldName: 'project_description' })

// Close assistant
assistantManager.closeAssistant()

console.log('assistantManager test completed')
