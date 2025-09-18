# Environment Variables Configuration

## Required Environment Variables

### Core Application
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

### Authentication & Security
- `NEXTAUTH_SECRET` - NextAuth.js secret for JWT signing
- `NEXTAUTH_URL` - Your application's base URL

### Email Configuration (SendGrid)
- `SENDGRID_API_KEY` - SendGrid API key with Mail Send permission
- `SENDGRID_PASSWORD_RESET_TEMPLATE_ID` - (Optional) Dynamic template ID for password reset emails
- `EMAIL_FROM` - Verified sender email address (e.g., `no-reply@yourdomain.com`)

### AI Services
- `ANTHROPIC_API_KEY` - Anthropic Claude API key for AI assistance
- `OPENAI_API_KEY` - OpenAI API key for alternative AI models

### Optional Services
- `MAILGUN_API_KEY` - Mailgun API key (if using Mailgun instead of SendGrid)
- `MAILGUN_DOMAIN` - Mailgun domain

## Environment-Specific Settings

### Development
Create a `.env.local` file in your project root:

```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Auth
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=dev@yourdomain.com

# AI
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
```

### Production (Vercel)
Set environment variables in Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable with appropriate values
4. Ensure variables are set for the correct environment (Production/Preview)
5. Redeploy after adding new variables

## Email Configuration Details

### SendGrid Setup
1. Create a SendGrid account and verify your domain
2. Create an API key with "Mail Send" permission
3. Set `SENDGRID_API_KEY` to your API key
4. Set `EMAIL_FROM` to a verified sender (e.g., `no-reply@yourdomain.com`)
5. (Optional) Create a dynamic template for password reset emails and set `SENDGRID_PASSWORD_RESET_TEMPLATE_ID`

### Email Template Variables
If using dynamic templates, ensure your SendGrid template includes these variables:
- `{{first_name}}` - User's first name
- `{{email_address}}` - User's email address  
- `{{reset_code}}` - 6-digit password reset code
- `{{ttl_minutes}}` - Code expiration time in minutes

## Security Notes

### API Key Permissions
- **SendGrid API Key**: Requires "Mail Send" permission only
- **Supabase Service Role**: Has admin access - keep secure
- **Anthropic/OpenAI**: Standard API access

### Domain Verification
- Ensure `EMAIL_FROM` uses a domain you own and have verified with SendGrid
- Avoid using placeholder domains like `@wali-os.local` in production

## Debugging Email Issues

Use the debug endpoint to test email configuration:
```
GET /api/debug/sendgrid?to=your@email.com&mode=password
```

This will return:
- Environment variable status
- SendGrid API response
- Error details if sending fails

## Testing

Run this command to verify all required environment variables are set:
```bash
node -e "
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SENDGRID_API_KEY', 'EMAIL_FROM'];
const missing = required.filter(key => !process.env[key]);
console.log(missing.length ? 'Missing: ' + missing.join(', ') : 'All required vars set');
"
```