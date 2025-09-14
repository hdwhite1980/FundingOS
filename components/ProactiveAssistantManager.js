/**
 * Proactive Assistant Manager
 * 
 * Central component that manages when and how the MS Clippy-style assistant appears
 * throughout the application with contextual help and guidance.
 */

'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ClippyAssistant from './ClippyAssistant'
import { useProactiveAssistantTriggers, shouldShowProactiveAssistant } from './ProactiveAssistantTriggers'

export default function ProactiveAssistantManager({ 
  user, 
  userProfile, 
  projects, 
  opportunities, 
  submissions 
}) {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [lastShownTimestamp, setLastShownTimestamp] = useState(null)
  const [currentTriggerContext, setCurrentTriggerContext] = useState(null)
  
  const { assistantTrigger, dismissTrigger } = useProactiveAssistantTriggers({
    user,
    userProfile,
    projects,
    opportunities,
    submissions
  })

  useEffect(() => {
    // Check if we should show the proactive assistant
    if (assistantTrigger && shouldShowProactiveAssistant(assistantTrigger, lastShownTimestamp)) {
      setCurrentTriggerContext({
        trigger: assistantTrigger.type,
        context: assistantTrigger.context
      })
      setIsAssistantOpen(true)
      setLastShownTimestamp(Date.now())
    }
  }, [assistantTrigger, lastShownTimestamp])

  const handleCloseAssistant = () => {
    setIsAssistantOpen(false)
    setCurrentTriggerContext(null)
    dismissTrigger()
  }

  const handleFormUpdate = async (formData) => {
    try {
      console.log('Form updated by assistant:', formData)
      
      if (formData.projectId && formData.updates) {
        // Update project data in real database
        const { directUserServices } = await import('../lib/supabase')
        const result = await directUserServices.projects.updateProject(formData.projectId, formData.updates)
        console.log('Project successfully updated:', result)
        
        // Show success feedback
        const toast = (await import('react-hot-toast')).default
        toast.success(`Project updated: ${formData.updates.name || 'Changes saved'}`)
        
        // Refresh local data
        window.location.reload()
      } else if (formData.submissionId && formData.updates) {
        // Update submission data
        const { directUserServices } = await import('../lib/supabase')
        await directUserServices.applications.updateSubmission(formData.submissionId, formData.updates)
        console.log('Submission updated:', formData.submissionId)
        
        const toast = (await import('react-hot-toast')).default
        toast.success('Application updated successfully')
      }
    } catch (error) {
      console.error('Form update error:', error)
      const toast = (await import('react-hot-toast')).default
      toast.error('Update failed. Please try again.')
    }
  }

  const handleSuggestionApply = async (suggestion) => {
    try {
      console.log('Applying suggestion:', suggestion)
      const toast = (await import('react-hot-toast')).default
      
      if (suggestion.type === 'deadline_reminder') {
        // Create actual calendar reminder
        const reminder = {
          title: suggestion.title,
          description: suggestion.message,
          deadline: suggestion.context?.deadline,
          userId: user.id,
          created_at: new Date().toISOString()
        }
        
        // Store reminder in browser storage for now
        const reminders = JSON.parse(localStorage.getItem('funding_reminders') || '[]')
        reminders.push(reminder)
        localStorage.setItem('funding_reminders', JSON.stringify(reminders))
        
        toast.success('Deadline reminder created!')
        console.log('Deadline reminder created:', reminder)
        
      } else if (suggestion.type === 'compliance_fix') {
        // Apply compliance suggestions to project
        if (suggestion.projectId && suggestion.complianceUpdates) {
          const { directUserServices } = await import('../lib/supabase')
          await directUserServices.projects.updateProject(suggestion.projectId, {
            compliance_status: 'updated',
            ...suggestion.complianceUpdates
          })
          toast.success('Compliance suggestions applied!')
        }
        
      } else if (suggestion.type === 'narrative_improvement') {
        // Apply narrative improvements
        if (suggestion.projectId && suggestion.improvedNarrative) {
          const { directUserServices } = await import('../lib/supabase')
          await directUserServices.projects.updateProject(suggestion.projectId, {
            project_narrative: suggestion.improvedNarrative
          })
          toast.success('Project narrative improved!')
        }
        
      } else {
        // Generic suggestion application
        toast.success('Suggestion applied successfully!')
      }
      
    } catch (error) {
      console.error('Suggestion application error:', error)
      const toast = (await import('react-hot-toast')).default
      toast.error('Failed to apply suggestion. Please try again.')
    }
  }

  if (!user || !userProfile) {
    return null // Don't show assistant if user is not fully loaded
  }

  return (
    <ClippyAssistant
      isVisible={isAssistantOpen}
      onClose={handleCloseAssistant}
      userProfile={userProfile}
      allProjects={projects || []}
      opportunities={opportunities || []}
      submissions={submissions || []}
      isProactiveMode={true}
      triggerContext={currentTriggerContext || {}}
      onFormUpdate={handleFormUpdate}
      onSuggestionApply={handleSuggestionApply}
    />
  )
}

/**
 * Hook to manually trigger the assistant for specific contexts
 */
export const useManualAssistantTrigger = () => {
  const [manualTrigger, setManualTrigger] = useState(null)

  const triggerAssistant = (triggerType, context = {}) => {
    setManualTrigger({
      type: triggerType,
      context,
      timestamp: Date.now()
    })
  }

  const clearTrigger = () => {
    setManualTrigger(null)
  }

  return {
    manualTrigger,
    triggerAssistant,
    clearTrigger
  }
}

/**
 * Floating trigger button for manual assistant access (Clippy-style)
 */
export const FloatingAssistantButton = ({ onClick, disabled = false }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Open Your Funding Assistant"
    >
      {/* Clippy-like character */}
      <div className="relative">
        <div className="w-8 h-10 bg-white rounded-lg relative">
          {/* Eyes */}
          <div className="absolute top-2 left-1 right-1 flex justify-between">
            <div className="w-2 h-2 bg-gray-800 rounded-full" />
            <div className="w-2 h-2 bg-gray-800 rounded-full" />
          </div>
          {/* Mouth */}
          <div className="absolute top-5 left-2 right-2 h-1 bg-gray-800 rounded-full" />
          {/* Arms */}
          <div className="absolute top-4 -left-1 w-2 h-1 bg-white rounded rotate-45"></div>
          <div className="absolute top-4 -right-1 w-2 h-1 bg-white rounded -rotate-45"></div>
        </div>
      </div>
    </motion.button>
  )
}

// Main export is at the top of the file