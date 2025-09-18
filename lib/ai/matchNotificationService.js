import { supabase } from '../supabase'
import { sendNewMatchesNotification } from '@/lib/email'

// Trigger after new matches computed (placeholder integration point)
export async function notifyNewMatches({ userId, projectId, matches }) {
  if (!matches || !matches.length) return
  const { data: prefs } = await supabase
    .from('user_notification_preferences')
    .select('new_match_found, match_threshold')
    .eq('user_id', userId)
    .maybeSingle()
  if (!prefs?.new_match_found) return
  const threshold = Number(prefs.match_threshold) || 0.75
  const filtered = matches.filter(m => m.score/100 >= threshold)
  if (!filtered.length) return
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .maybeSingle()
  const { data: userRec } = await supabase.auth.getUser()
  const email = userRec?.data?.user?.email
  if (!email) return
  await sendNewMatchesNotification(email, project?.name || 'Project', filtered.map(m => ({
    opportunityTitle: m.opportunityTitle || 'Opportunity',
    score: m.score,
    factors: m.factors || []
  })))
}
