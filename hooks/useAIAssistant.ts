/**
 * useAIAssistant - React hook for form AI assistance
 */

import { useState, useCallback, useRef } from 'react'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  field_context?: string
  generated_text?: string
  field_suggestions?: any
  created_at: string
}

export interface AISession {
  id: string
  title: string
  created_at: string
  message_count: number
  last_message_at?: string
}

interface UseAIAssistantOptions {
  userId: string
  projectId?: string
  formAnalysisId?: string
  formData?: any
  userProfile?: any
}

export const useAIAssistant = (options: UseAIAssistantOptions) => {
  const [session, setSession] = useState<AISession | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(false)
  
  // Track current field context
  const [currentField, setCurrentField] = useState<string | null>(null)
  
  const abortController = useRef<AbortController | null>(null)

  const createSession = useCallback(async () => {
    if (!options.userId) return null
    
    setIsSessionLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/form/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          userId: options.userId,
          projectId: options.projectId,
          formAnalysisId: options.formAnalysisId,
          formData: options.formData
        })
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create session')
      }

      const newSession: AISession = {
        id: result.data.sessionId,
        title: result.data.title,
        created_at: result.data.created,
        message_count: 1,
        last_message_at: result.data.created
      }
      
      setSession(newSession)
      
      // Load initial messages (welcome message)
      await loadMessages(result.data.sessionId)
      
      return newSession
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create session'
      setError(errorMsg)
      console.error('AI Assistant session creation error:', err)
      return null
    } finally {
      setIsSessionLoading(false)
    }
  }, [options.userId, options.projectId, options.formAnalysisId, options.formData])

  const loadMessages = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || session?.id
    if (!targetSessionId) return
    
    try {
      const response = await fetch('/api/form/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_messages',
          sessionId: targetSessionId
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessages(result.data)
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [session?.id])

  const sendMessage = useCallback(async (message: string, fieldContext?: string) => {
    if (!session || !message.trim()) return null
    
    // Cancel any ongoing request
    if (abortController.current) {
      abortController.current.abort()
    }
    
    abortController.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    
    // Add user message immediately for better UX
    const userMessage: AIMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: message,
      field_context: fieldContext,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch('/api/form/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          sessionId: session.id,
          message,
          fieldContext: fieldContext || currentField,
          formData: options.formData,
          userProfile: options.userProfile
        }),
        signal: abortController.current.signal
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message')
      }

      // Replace temp user message and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== userMessage.id)
        return [
          ...filtered,
          {
            ...userMessage,
            id: `user-${result.data.messageId}-user`
          },
          {
            id: result.data.messageId,
            role: 'assistant' as const,
            content: result.data.content,
            field_context: fieldContext,
            generated_text: result.data.generatedText,
            field_suggestions: result.data.fieldSuggestions,
            created_at: new Date().toISOString()
          }
        ]
      })
      
      return result.data
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }
      
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMsg)
      
      // Remove temp user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
      
      console.error('AI Assistant message error:', err)
      return null
    } finally {
      setIsLoading(false)
      abortController.current = null
    }
  }, [session, currentField, options.formData, options.userProfile])

  const generateFieldContent = useCallback(async (fieldContext: string) => {
    if (!session || !fieldContext) return null
    
    // Cancel any ongoing request
    if (abortController.current) {
      abortController.current.abort()
    }
    
    abortController.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/form/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_field_content',
          sessionId: session.id,
          fieldContext,
          formData: options.formData,
          userProfile: options.userProfile
        }),
        signal: abortController.current.signal
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content')
      }

      // Add the generation result to messages
      const assistantMessage: AIMessage = {
        id: result.data.messageId,
        role: 'assistant',
        content: result.data.content,
        field_context: fieldContext,
        generated_text: result.data.generatedText,
        created_at: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      return {
        generatedText: result.data.generatedText,
        messageId: result.data.messageId
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }
      
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate content'
      setError(errorMsg)
      console.error('AI Assistant content generation error:', err)
      return null
    } finally {
      setIsLoading(false)
      abortController.current = null
    }
  }, [session, options.formData, options.userProfile])

  const setFieldContext = useCallback((fieldName: string | null) => {
    setCurrentField(fieldName)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
    setMessages([])
    setError(null)
    setCurrentField(null)
    
    if (abortController.current) {
      abortController.current.abort()
    }
  }, [])

  return {
    // State
    session,
    messages,
    isLoading,
    isSessionLoading,
    error,
    currentField,
    
    // Actions
    createSession,
    loadMessages,
    sendMessage,
    generateFieldContent,
    setFieldContext,
    clearError,
    clearSession,
    
    // Computed
    hasSession: !!session,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1] || null
  }
}