/**
 * AIAssistantWindow - Interactive AI assistant for form completion
 */

import React, { useState, useRef, useEffect } from 'react'
import { useAIAssistant } from '../hooks/useAIAssistant'

const AIAssistantWindow = ({ 
  userId, 
  projectId, 
  formAnalysisId, 
  formData, 
  userProfile,
  currentFieldName,
  onFieldContentGenerated,
  isOpen,
  onClose,
  onToggle 
}) => {
  const {
    session,
    messages,
    isLoading,
    isSessionLoading,
    error,
    createSession,
    sendMessage,
    generateFieldContent,
    clearError,
    hasSession
  } = useAIAssistant({
    userId,
    projectId,
    formAnalysisId,
    formData,
    userProfile
  })

  const [inputMessage, setInputMessage] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Create session on first open
  useEffect(() => {
    if (isOpen && userId && !hasSession && !isSessionLoading) {
      createSession()
    }
  }, [isOpen, userId, hasSession, isSessionLoading, createSession])

  // Focus input when window opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const message = inputMessage.trim()
    setInputMessage('')
    setShowQuickActions(false)

    await sendMessage(message, currentFieldName)
  }

  const handleQuickAction = async (action) => {
    setShowQuickActions(false)
    
    switch (action) {
      case 'explain-field':
        if (currentFieldName) {
          await sendMessage(`What does the "${currentFieldName}" field mean and what should I include?`, currentFieldName)
        } else {
          await sendMessage("Can you explain what the current field is asking for?")
        }
        break
        
      case 'generate-content':
        if (currentFieldName) {
          const result = await generateFieldContent(currentFieldName)
          if (result?.generatedText && onFieldContentGenerated) {
            onFieldContentGenerated(currentFieldName, result.generatedText)
          }
        } else {
          await sendMessage("I'd like to generate content for a form field. Which field should I help with?")
        }
        break
        
      case 'review-form':
        await sendMessage("Can you review my current form responses and suggest improvements?")
        break
        
      case 'compliance-check':
        await sendMessage("Are there any compliance or requirement issues I should be aware of for this form?")
        break
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
          title="Open AI Form Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          <h3 className="font-semibold">AI Form Assistant</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggle}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Current Field Context */}
      {currentFieldName && (
        <div className="bg-blue-50 px-4 py-2 border-b text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <span>Helping with: <strong>{currentFieldName}</strong></span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isSessionLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Starting AI assistant...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Welcome! I'm ready to help with your form.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white ml-4' 
                  : 'bg-gray-100 text-gray-800 mr-4'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Show generated text with copy button */}
                {message.generated_text && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Generated Content:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.generated_text)
                          // Could show a toast here
                        }}
                        className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-white/10 p-2 rounded text-sm">
                      {message.generated_text}
                    </div>
                    {onFieldContentGenerated && message.field_context && (
                      <button
                        onClick={() => onFieldContentGenerated(message.field_context, message.generated_text)}
                        className="mt-2 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Use This Content
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg mr-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuickActions && messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="text-xs text-gray-600 mb-2">Quick actions:</div>
          <div className="flex flex-wrap gap-2">
            {currentFieldName && (
              <>
                <button
                  onClick={() => handleQuickAction('explain-field')}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                >
                  Explain Field
                </button>
                <button
                  onClick={() => handleQuickAction('generate-content')}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
                >
                  Generate Content
                </button>
              </>
            )}
            <button
              onClick={() => handleQuickAction('review-form')}
              className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded"
            >
              Review Form
            </button>
            <button
              onClick={() => handleQuickAction('compliance-check')}
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded"
            >
              Compliance Check
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-red-800 text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 ml-2"
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentFieldName ? `Ask about "${currentFieldName}"...` : "Ask me anything about your form..."}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading || isSessionLoading}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || isSessionLoading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        {messages.length === 0 && !isSessionLoading && (
          <div className="text-xs text-gray-500 mt-2">
            💡 Try: "Explain this field" • "Generate content" • "Review my answers"
          </div>
        )}
      </div>
    </div>
  )
}

export default AIAssistantWindow