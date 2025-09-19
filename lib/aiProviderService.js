// lib/aiProviderService.js
// Hybrid AI Provider Service - Strategically routes to OpenAI or Anthropic based on task requirements

import { OpenAI } from 'openai'
import Anthropic from '@anthropic-ai/sdk'

class AIProviderService {
  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Provider strategy configuration
    this.providerStrategy = {
      // Document analysis - use GPT-4o for reliable processing
      'document-analysis': {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'Excellent at document processing and structured extraction with high reliability'
      },
      
      // Form completion - use GPT-4o for complex form mapping
      'smart-form-completion': {
        provider: 'openai', 
        model: 'gpt-4o',
        reason: 'Superior instruction following and complex reasoning for form field mapping'
      },
      
      // Enhanced scoring - use GPT-4o-mini for cost-effective scoring
      'enhanced-scoring': {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Cost-effective analytical reasoning with good performance'
      },
      
      // Basic scoring - OpenAI is cost-effective and fast
      'basic-scoring': {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Cost-effective and fast for simple scoring'
      },
      
      // Conversations - GPT-4o excels at conversational AI
      'conversation': {
        provider: 'openai',
        model: 'gpt-4o',
        reason: 'Excellent conversational abilities and response quality'
      },
      
      // Categorization - OpenAI is efficient for classification
      'categorization': {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Efficient and accurate for classification tasks'
      }
    }

    // Environment variable overrides
    this.loadEnvironmentOverrides()
  }

  loadEnvironmentOverrides() {
    // Allow environment variables to override default strategy
    // Format: AI_PROVIDER_DOCUMENT_ANALYSIS=openai:gpt-4o
    const taskTypes = Object.keys(this.providerStrategy)
    
    taskTypes.forEach(taskType => {
      const envKey = `AI_PROVIDER_${taskType.toUpperCase().replace('-', '_')}`
      const override = process.env[envKey]
      
      if (override) {
        const [provider, model] = override.split(':')
        if (provider && model) {
          this.providerStrategy[taskType] = {
            ...this.providerStrategy[taskType],
            provider,
            model,
            reason: 'Environment variable override'
          }
        }
      }
    })
  }

  getProviderConfig(taskType) {
    const config = this.providerStrategy[taskType]
    if (!config) {
      // Default fallback
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Default fallback'
      }
    }
    return config
  }

  async generateCompletion(taskType, messages, options = {}) {
    const config = this.getProviderConfig(taskType)
    const maxRetries = options.maxRetries || 2
    
    console.log(`🤖 Using ${config.provider}:${config.model} for ${taskType} - ${config.reason}`)

    // Add JSON formatting instructions to system message for tasks that need JSON
    const needsJson = ['document-analysis', 'enhanced-scoring', 'smart-form-completion', 'categorization']
    if (needsJson.includes(taskType)) {
      messages = this.ensureJsonInstructions(messages)
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (config.provider === 'openai') {
          return await this.callOpenAI(config.model, messages, options)
        } else if (config.provider === 'anthropic') {
          return await this.callAnthropic(config.model, messages, options)
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${config.provider}:`, error.message)
        
        if (attempt === maxRetries) {
          // Final attempt - try fallback provider
          console.log(`🔄 Falling back to alternative provider for ${taskType}`)
          return await this.callFallbackProvider(taskType, messages, options)
        }
      }
    }
  }

  ensureJsonInstructions(messages) {
    const jsonInstructions = `

CRITICAL: You MUST respond with valid JSON only. Do not include any conversational text, explanations, or markdown formatting. Just return the raw JSON object.`

    return messages.map(message => {
      if (message.role === 'system') {
        return {
          ...message,
          content: message.content + jsonInstructions
        }
      }
      return message
    })
  }

  async callOpenAI(model, messages, options = {}) {
    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.1,
      response_format: options.responseFormat ? { type: options.responseFormat } : undefined
    })

    return {
      content: completion.choices[0]?.message?.content,
      usage: completion.usage,
      provider: 'openai',
      model
    }
  }

  async callAnthropic(model, messages, options = {}) {
    // Convert OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')

    const completion = await this.anthropic.messages.create({
      model,
      system: systemMessage?.content || '',
      messages: userMessages,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.1
    })

    return {
      content: completion.content[0]?.text,
      usage: completion.usage,
      provider: 'anthropic',
      model
    }
  }

  async callFallbackProvider(taskType, messages, options = {}) {
    const config = this.getProviderConfig(taskType)
    
    // Switch to opposite provider as fallback
    const fallbackProvider = config.provider === 'openai' ? 'anthropic' : 'openai'
    const fallbackModel = fallbackProvider === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307'

    console.log(`🚨 Using fallback: ${fallbackProvider}:${fallbackModel}`)

    try {
      if (fallbackProvider === 'openai') {
        return await this.callOpenAI(fallbackModel, messages, options)
      } else {
        return await this.callAnthropic(fallbackModel, messages, options)
      }
    } catch (error) {
      console.error('Fallback provider also failed:', error)
      throw new Error(`All AI providers failed for task: ${taskType}`)
    }
  }

  // Utility method for JSON parsing with error handling
  safeParseJSON(content) {
    if (!content) throw new Error('No content received from AI provider')
    
    // If content starts with conversational response, throw specific error
    if (content.trim().startsWith("I'm sorry") || content.trim().startsWith("I can't") || content.trim().startsWith("I apologize")) {
      throw new Error(`AI provider returned a conversational response instead of JSON. Response: ${content.substring(0, 100)}...`)
    }
    
    try {
      return JSON.parse(content)
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1])
        } catch (e) {
          throw new Error(`Failed to parse JSON from markdown block: ${e.message}. Content: ${content.substring(0, 200)}...`)
        }
      }
      
      // Try to find any JSON-like structure in the response
      const jsonStart = content.indexOf('{')
      const jsonEnd = content.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          const extractedJson = content.substring(jsonStart, jsonEnd + 1)
          return JSON.parse(extractedJson)
        } catch (e) {
          // Continue to original error
        }
      }
      
      throw new Error(`Failed to parse JSON from AI response: ${error.message}. Content: ${content.substring(0, 200)}...`)
    }
  }

  // Get provider status for debugging
  getProviderStatus() {
    return {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        model: 'Available'
      },
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        model: 'Available'
      },
      strategy: this.providerStrategy
    }
  }

  // Test connection to both providers
  async testConnections() {
    const results = {}

    // Test OpenAI
    try {
      await this.callOpenAI('gpt-4o-mini', [
        { role: 'user', content: 'Test connection - respond with "OK"' }
      ], { maxTokens: 10 })
      results.openai = { status: 'connected', error: null }
    } catch (error) {
      results.openai = { status: 'failed', error: error.message }
    }

    // Test Anthropic
    try {
      await this.callAnthropic('claude-3-haiku-20240307', [
        { role: 'user', content: 'Test connection - respond with "OK"' }
      ], { maxTokens: 10 })
      results.anthropic = { status: 'connected', error: null }
    } catch (error) {
      results.anthropic = { status: 'failed', error: error.message }
    }

    return results
  }
}

// Export singleton instance
const aiProviderService = new AIProviderService()
export default aiProviderService