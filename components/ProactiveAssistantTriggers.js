/**
 * Proactive Assistant Triggers
 * 
 * Intelligent system that determines when the Wali-OS Assistant should appear
 * with contextual advice and assistance for funding, compliance, and grant writing.
 */

'use client'
import { useEffect, useState } from 'react'

export const useProactiveAssistantTriggers = ({ 
  user, 
  userProfile, 
  projects, 
  opportunities, 
  submissions 
}) => {
  const [assistantTrigger, setAssistantTrigger] = useState(null)
  
  useEffect(() => {
    if (!user || !userProfile) return
    
    // Run trigger analysis every 30 seconds
    const checkTriggers = () => {
      const trigger = analyzeProactiveTriggers({
        user,
        userProfile,
        projects: projects || [],
        opportunities: opportunities || [],
        submissions: submissions || []
      })
      
      if (trigger && trigger.priority >= 7) { // Only show high-priority triggers
        setAssistantTrigger(trigger)
      }
    }
    
    // Initial check
    checkTriggers()
    
    // Periodic checks
    const interval = setInterval(checkTriggers, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [user, userProfile, projects, opportunities, submissions])
  
  const dismissTrigger = () => {
    setAssistantTrigger(null)
  }
  
  return {
    assistantTrigger,
    dismissTrigger
  }
}

// Core trigger analysis logic
export const analyzeProactiveTriggers = ({ 
  user, 
  userProfile, 
  projects, 
  opportunities, 
  submissions 
}) => {
  const triggers = []
  const now = new Date()
  
  // 1. DEADLINE ALERTS - High Priority
  opportunities.forEach(opp => {
    if (opp.deadline_date || opp.deadline || opp.application_deadline) {
      const deadline = new Date(opp.deadline_date || opp.deadline || opp.application_deadline)
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
      
      if (daysLeft <= 7 && daysLeft > 0) {
        triggers.push({
          type: 'deadline_approaching',
          priority: 9,
          title: `Application Deadline in ${daysLeft} Days`,
          message: `Don't miss the ${opp.title} deadline!`,
          context: { 
            opportunity: opp, 
            daysLeft,
            urgency: daysLeft <= 3 ? 'critical' : 'high'
          }
        })
      }
    }
  })
  
  // 2. INCOMPLETE APPLICATIONS - Medium-High Priority  
  const incompleteProjects = projects.filter(p => 
    p.completion_percentage && p.completion_percentage < 80
  )
  
  if (incompleteProjects.length > 0) {
    const mostIncomplete = incompleteProjects.sort((a, b) => 
      (a.completion_percentage || 0) - (b.completion_percentage || 0)
    )[0]
    
    triggers.push({
      type: 'incomplete_application',
      priority: 7,
      title: 'Application Needs Completion',
      message: `${mostIncomplete.name} is ${mostIncomplete.completion_percentage || 0}% complete`,
      context: {
        project: mostIncomplete,
        completionPercentage: mostIncomplete.completion_percentage || 0
      }
    })
  }
  
  // 3. NEW FUNDING OPPORTUNITIES - Medium Priority
  const highFitOpportunities = opportunities.filter(opp => 
    opp.fit_score && opp.fit_score > 80
  )
  
  if (highFitOpportunities.length > 0) {
    triggers.push({
      type: 'new_opportunity',
      priority: 6,
      title: `${highFitOpportunities.length} High-Match Opportunities`,
      message: 'New funding opportunities match your projects perfectly!',
      context: {
        matchCount: highFitOpportunities.length,
        fitScore: Math.max(...highFitOpportunities.map(o => o.fit_score || 0)),
        opportunities: highFitOpportunities.slice(0, 3) // Top 3
      }
    })
  }
  
  // 4. COMPLIANCE ASSISTANCE - High Priority
  const projectsNeedingCompliance = projects.filter(p => 
    !p.compliance_status || p.compliance_status === 'incomplete'
  )
  
  if (projectsNeedingCompliance.length > 0) {
    triggers.push({
      type: 'compliance_issue',
      priority: 8,
      title: 'Compliance Requirements Need Attention',
      message: `${projectsNeedingCompliance.length} projects need compliance review`,
      context: {
        projectCount: projectsNeedingCompliance.length,
        projects: projectsNeedingCompliance,
        projectName: projectsNeedingCompliance[0]?.name
      }
    })
  }
  
  // 5. GRANT WRITING ASSISTANCE - Medium Priority
  const projectsNeedingNarratives = projects.filter(p => 
    !p.project_narrative || p.project_narrative.length < 500
  )
  
  if (projectsNeedingNarratives.length > 0) {
    triggers.push({
      type: 'grant_writing_assistance',
      priority: 6,
      title: 'Grant Writing Support Available',
      message: 'Let me help strengthen your project narratives',
      context: {
        projectCount: projectsNeedingNarratives.length,
        projects: projectsNeedingNarratives
      }
    })
  }
  
  // 6. SUCCESS RATE IMPROVEMENT - Medium Priority
  const successRate = submissions.length > 0 ? 
    (submissions.filter(s => s.status === 'approved').length / submissions.length * 100) : 0
  
  if (submissions.length >= 3 && successRate < 50) {
    triggers.push({
      type: 'success_rate_improvement',
      priority: 6,
      title: 'Application Success Rate Below 50%',
      message: 'Let me help improve your application strategy',
      context: {
        currentRate: successRate,
        totalSubmissions: submissions.length,
        suggestions: ['Improve project narratives', 'Better opportunity matching', 'Enhanced compliance']
      }
    })
  }
  
  // 7. ONBOARDING ASSISTANCE - Low-Medium Priority
  if (projects.length === 0 && !userProfile.onboarding_completed) {
    triggers.push({
      type: 'onboarding_assistance',
      priority: 5,
      title: 'Welcome! Let Me Help You Get Started',
      message: 'I can guide you through creating your first funding project',
      context: {
        isNewUser: true,
        nextSteps: ['Complete profile', 'Create first project', 'Discover opportunities']
      }
    })
  }
  
  // Return highest priority trigger
  return triggers.sort((a, b) => b.priority - a.priority)[0] || null
}

// Helper function to determine if trigger should be shown
export const shouldShowProactiveAssistant = (trigger, lastShown) => {
  if (!trigger) return false
  
  // Don't show same trigger type too frequently
  const timeSinceLastShown = lastShown ? (Date.now() - lastShown) : Infinity
  const minInterval = trigger.priority >= 8 ? 3600000 : 7200000 // 1-2 hours
  
  return timeSinceLastShown > minInterval
}

export default useProactiveAssistantTriggers