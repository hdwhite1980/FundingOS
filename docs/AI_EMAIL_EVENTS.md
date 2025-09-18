# AI Email Event Documentation

## Overview
The Wali-OS platform sends automated email notifications for AI-driven events to keep users informed about project analysis, funding matches, and system activities.

## Email Event Types

### 1. Password Reset
**Trigger**: User requests password reset via code-based flow
**Template**: Dynamic SendGrid template or HTML fallback
**Recipients**: Requesting user only
**Variables**:
- `{{first_name}}` - User's first name from profile
- `{{email_address}}` - User's email address
- `{{reset_code}}` - 6-digit verification code
- `{{ttl_minutes}}` - Code expiration time (default: 15 minutes)

**Example Subject**: "Your Password Reset Code"
**Category**: `password_reset`

### 2. AI Project Analysis Completion
**Trigger**: AI analysis of uploaded project documents completes
**Template**: HTML email with analysis insights
**Recipients**: Project owner (if opted in to notifications)
**Variables**:
- Project name
- Top 5 analysis insights
- Link to full dashboard

**Example Subject**: "AI Analysis Complete: [Project Name]"
**Category**: `ai_analysis`
**Opt-in Required**: Yes (via user notification preferences)

### 3. New Funding Matches
**Trigger**: AI finds new funding opportunities above match threshold
**Template**: HTML email with match summaries
**Recipients**: Project owner (if opted in to notifications)
**Variables**:
- Project name
- Top 5 funding matches with scores
- Match factors and compatibility reasons
- Link to view all matches

**Example Subject**: "New Funding Matches: [Project Name]"
**Category**: `ai_matches`
**Opt-in Required**: Yes (via user notification preferences)

### 4. Investment Confirmation (Angel Platform)
**Trigger**: Angel investor completes investment transaction
**Template**: Branded HTML email with investment details
**Recipients**: Investing user
**Variables**:
- Company name
- Investment amount
- Transaction ID
- Date and portfolio link

**Example Subject**: "Investment Confirmation - [Company Name]"
**Category**: `investment_confirmation`

### 5. New Investment Opportunity Alert
**Trigger**: New companies added to angel platform
**Template**: HTML email with opportunity details
**Recipients**: Angel investors (if subscribed to alerts)
**Variables**:
- Company details
- Funding goals and minimums
- Industry and stage information

**Example Subject**: "New Investment Opportunity - [Company Name]"
**Category**: `investment_opportunity`

### 6. Conversation Summary
**Trigger**: User logs out after chat session with AI assistant
**Template**: Structured email with conversation history
**Recipients**: Session user
**Variables**:
- User name
- Conversation summary
- Key insights or action items
- Session duration

**Example Subject**: "Your Wali-OS Conversation Summary"
**Category**: `conversation_summary`

## Email Preferences System

### Database Schema
```sql
-- User notification preferences
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_analysis_emails BOOLEAN DEFAULT true,
  funding_match_emails BOOLEAN DEFAULT true,
  investment_alerts BOOLEAN DEFAULT true,
  conversation_summaries BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Opt-in Management
Users can control email preferences via:
1. Account Settings Modal (`/components/AccountSettingsModal.js`)
2. Email footer unsubscribe links
3. API endpoints for preference updates

### Default Settings
- **AI Analysis**: Enabled by default
- **Funding Matches**: Enabled by default  
- **Investment Alerts**: Enabled by default
- **Conversation Summaries**: Enabled by default
- **Frequency**: Immediate delivery

## Technical Implementation

### Email Service Architecture
```
Event Trigger → Email Service → SendGrid API → User Inbox
              ↓
         Preference Check
              ↓
         Template Render
              ↓
         Delivery Tracking
```

### Service Files
- `lib/email.ts` - Core email sending with SendGrid
- `lib/email-service.js` - Legacy email service with Mailgun
- `utils/emailNotifications.js` - Angel investor email templates
- `lib/chatSessionService.js` - Conversation summary emails

### API Endpoints
- `POST /api/auth/password-reset/request` - Triggers password reset email
- `POST /api/chat/logout` - Triggers conversation summary email
- Email preference updates via user profile endpoints

## Rate Limiting & Throttling

### Current Limits
- Password reset: 5 requests per 15 minutes per email
- AI notifications: Max 1 per analysis/match event
- Conversation summaries: 1 per logout session

### Planned Enhancements
- Daily digest options for frequent notifications
- Email batching for multiple funding matches
- Suppression list management for bounced emails

## Testing & Debugging

### Debug Endpoint
```
GET /api/debug/sendgrid?to=test@example.com&mode=password
```
Returns environment status and test send results.

### SendGrid Activity Monitoring
1. SendGrid Dashboard → Email Activity
2. Filter by recipient or category
3. Track delivery, opens, and clicks

### Email Template Testing
Templates support test variables:
- Use placeholder data for development
- Test with actual user data in staging
- Verify rendering across email clients

## Compliance & Privacy

### Data Usage
- Email addresses stored securely in Supabase
- Templates use only necessary user data
- No tracking pixels in transactional emails

### Opt-out Requirements
- All marketing emails include unsubscribe links
- Transactional emails (password reset) cannot be disabled
- Clear preference management in user settings

### GDPR Compliance
- User consent recorded in notification preferences
- Email data deleted when user account is removed
- Export capabilities for user data requests

## Future Enhancements

### Planned Features
- Email analytics and engagement tracking
- A/B testing for email templates  
- Advanced personalization based on user behavior
- Integration with additional email providers
- Mobile push notification alternatives

### Template Improvements
- Responsive design for all email templates
- Dark mode support
- Multilingual template support
- Brand customization options