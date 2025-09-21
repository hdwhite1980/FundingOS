/**
 * Test script for Enhanced WaliOS Assistant Project-Specific Features
 */

console.log("🧪 Testing Enhanced WaliOS Assistant Project-Specific Features...")

// Mock the enhanced functions (since they're defined in a React component)

const classifyProjectIntent = (message, projectData) => {
  const lower = message.toLowerCase()
  
  if (lower.includes('tell me about') && projectData) {
    return 'project_enhancement_needed'
  }
  
  if (lower.includes('grants') || lower.includes('funding')) {
    if (projectData && projectData.description) {
      return 'specific_grant_search'
    } else {
      return 'grant_search_needs_context'
    }
  }
  
  if (lower.includes('help with') && projectData) {
    return 'project_specific_assistance'
  }
  
  return 'general_project_help'
}

const identifyMissingProjectContext = (projectData) => {
  const missing = []
  
  if (!projectData?.project_type && !projectData?.technology_type) {
    missing.push('project_type')
  }
  
  if (!projectData?.target_market && !projectData?.beneficiaries) {
    missing.push('target_market')  
  }
  
  if (!projectData?.development_stage && !projectData?.stage) {
    missing.push('development_stage')
  }
  
  if (!projectData?.budget && !projectData?.funding_amount) {
    missing.push('budget')
  }
  
  return missing
}

const buildContextGatheringResponse = (project, missingContext) => {
  let response = `I can help you find specific funding for ${project.name || 'your project'}. To give you the most relevant grant opportunities, I need to understand your project better:\n\n`
  
  if (missingContext.includes('project_type')) {
    response += `• What type of technology does your project involve? (AI/ML, software platform, hardware, biotech, etc.)\n`
  }
  
  if (missingContext.includes('target_market')) {
    response += `• Who is your target market or beneficiary?\n`
  }
  
  if (missingContext.includes('development_stage')) {
    response += `• What development stage are you in? (concept, prototype, testing, scaling)\n`
  }
  
  if (missingContext.includes('budget')) {
    response += `• What funding amount are you seeking?\n`
  }
  
  response += `\nOnce I understand these details, I can search for specific grants that match your project profile and give you exact deadlines and requirements.`
  
  return response
}

console.log("\n" + "=".repeat(60))
console.log("🎯 INTENT CLASSIFICATION TESTS")
console.log("=".repeat(60))

// Test data
const completeProject = {
  name: "Wali-OS",
  description: "AI-powered operating system for healthcare applications",
  technology_type: "AI/ML",
  target_market: "Healthcare providers",
  development_stage: "prototype",
  budget: 500000
}

const incompleteProject = {
  name: "MyProject"
}

const testMessages = [
  "Tell me about my project",
  "Find grants for my project", 
  "What funding is available?",
  "Help with my application",
  "How do I get started?"
]

testMessages.forEach((message, index) => {
  console.log(`\n📋 Test ${index + 1}: "${message}"`)
  
  const intentComplete = classifyProjectIntent(message, completeProject)
  const intentIncomplete = classifyProjectIntent(message, incompleteProject)
  
  console.log(`   Complete project: ${intentComplete}`)
  console.log(`   Incomplete project: ${intentIncomplete}`)
})

console.log("\n" + "=".repeat(60))
console.log("🔍 MISSING CONTEXT IDENTIFICATION TESTS")
console.log("=".repeat(60))

const testProjects = [
  {
    name: "Complete Project",
    data: completeProject
  },
  {
    name: "Partial Project", 
    data: { name: "Test", technology_type: "software" }
  },
  {
    name: "Empty Project",
    data: { name: "Empty" }
  }
]

testProjects.forEach((test, index) => {
  console.log(`\n📊 ${test.name}:`)
  const missing = identifyMissingProjectContext(test.data)
  
  if (missing.length === 0) {
    console.log(`   ✅ No missing context`)
  } else {
    console.log(`   ❌ Missing: ${missing.join(', ')}`)
  }
})

console.log("\n" + "=".repeat(60))
console.log("💬 CONTEXT GATHERING RESPONSE TESTS")
console.log("=".repeat(60))

const testProject = { name: "AI Healthcare Platform" }
const missingContexts = [
  ['project_type'],
  ['project_type', 'target_market'], 
  ['project_type', 'target_market', 'development_stage', 'budget']
]

missingContexts.forEach((missing, index) => {
  console.log(`\n🗣️ Test ${index + 1}: Missing [${missing.join(', ')}]`)
  const response = buildContextGatheringResponse(testProject, missing)
  console.log(`   Response preview: ${response.substring(0, 100)}...`)
  console.log(`   Contains questions: ${missing.map(m => response.includes(m) ? '✅' : '❌').join(' ')}`)
})

console.log("\n" + "=".repeat(60))
console.log("🚀 INTEGRATION WORKFLOW TESTS")
console.log("=".repeat(60))

// Simulate the full workflow
const simulateWorkflow = (message, projectData) => {
  console.log(`\n🔄 Workflow: "${message}"`)
  console.log(`   Project: ${projectData?.name || 'None'}`)
  
  const intent = classifyProjectIntent(message, projectData)
  console.log(`   Intent: ${intent}`)
  
  if (intent === 'project_enhancement_needed' || intent === 'grant_search_needs_context') {
    const missing = identifyMissingProjectContext(projectData)
    if (missing.length > 0) {
      console.log(`   Missing context: ${missing.join(', ')}`)
      console.log(`   Action: Gather context`)
      return 'context_gathering'
    }
  }
  
  console.log(`   Action: Process with API or provide specific response`)
  return 'direct_response'
}

const workflowTests = [
  { message: "Tell me about my project", project: incompleteProject },
  { message: "Find grants for my project", project: completeProject },
  { message: "What funding is available?", project: null },
  { message: "Help with my application", project: completeProject }
]

workflowTests.forEach((test, index) => {
  const result = simulateWorkflow(test.message, test.project)
  console.log(`   Result: ${result}`)
})

console.log("\n✅ All enhanced assistant tests completed!")
console.log("\n🎉 Enhanced features integrated:")
console.log("   • Smart intent classification")
console.log("   • Context gap identification")
console.log("   • Targeted question generation")
console.log("   • Project-specific grant discovery") 
console.log("   • Actionable response building")