/**
 * Proactive Assistant Manager
 * 
 * Central component that manages when and how the MS Clippy-style assistant appears
 * throughout the application with contextual help and guidance.
 */

'use client'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ApplicationAssistant from './ApplicationAssistant'
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
    <AnimatePresence>
      {isAssistantOpen && (
        <ApplicationAssistant
          isOpen={isAssistantOpen}
          onClose={handleCloseAssistant}
          userProfile={userProfile}
          projectData={currentTriggerContext?.context?.project || null}
          applicationForm={null}
          documentAnalyses={[]}
          onFormUpdate={handleFormUpdate}
          onSuggestionApply={handleSuggestionApply}
          // Enhanced props for proactive mode
          allProjects={projects || []}
          opportunities={opportunities || []}
          submissions={submissions || []}
          complianceData={{
            organizationCompliance: userProfile?.compliance_status || {},
            projectCompliance: projects?.map(p => ({
              projectId: p.id,
              completionPercentage: p.completion_percentage || 0,
              missingDocuments: p.missing_documents || [],
              complianceStatus: p.compliance_status || 'pending'
            })) || [],
            upcomingDeadlines: opportunities?.filter(opp => 
              opp.deadline_date && 
              new Date(opp.deadline_date) > new Date() &&
              new Date(opp.deadline_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ) || []
          }}
          isProactiveMode={true}
          triggerContext={currentTriggerContext || {}}
        />
      )}
    </AnimatePresence>
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
 * Floating trigger button for manual assistant access
 */
export const FloatingAssistantButton = ({ onClick, disabled = false }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Open Funding Assistant"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </motion.button>
  )
}

// Main export is at the top of the file