// pages/api/webhooks/mailgun.js
import crypto from 'crypto'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Verify webhook signature
    const signature = crypto
      .createHmac('sha256', process.env.MAILGUN_WEBHOOK_SIGNING_KEY)
      .update(req.body.timestamp + req.body.token)
      .digest('hex')

    if (signature !== req.body.signature) {
      return res.status(401).json({ message: 'Invalid signature' })
    }

    const eventData = req.body['event-data']
    const campaignId = eventData.tags?.find(tag => tag.startsWith('campaign-'))?.split('-')[1]

    if (campaignId) {
      // Update email campaign status based on event
      const updateData = {}
      
      switch (eventData.event) {
        case 'delivered':
          updateData.status = 'delivered'
          break
        case 'opened':
          updateData.opened_at = new Date().toISOString()
          break
        case 'clicked':
          updateData.clicked_at = new Date().toISOString()
          break
        case 'unsubscribed':
          updateData.status = 'unsubscribed'
          // Also update user preferences
          await supabase
            .from('user_ai_preferences')
            .update({ email_notifications_enabled: false })
            .eq('user_id', eventData['user-variables']?.user_id)
          break
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('email_campaigns')
          .update(updateData)
          .eq('id', campaignId)
      }
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Mailgun webhook error:', error)
    res.status(500).json({ error: error.message })
  }
}

// Export the email service
export { MailgunEmailService }