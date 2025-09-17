# Supabase Redirect URLs

Configure password reset and magic link redirects so emails land on the correct domain (Vercel, not localhost).

## 1) Set site URL env in your app

- `NEXT_PUBLIC_SITE_URL`: The absolute origin of your deployed app (no trailing slash).
  - Production example: `https://your-app.vercel.app` or `https://your.custom.domain`
  - Preview example: set per-environment if desired (e.g., Git branch previews)

Where to set it:
- Vercel → Project → Settings → Environment Variables
  - Add to Production and Preview (and optionally Development)

## 2) Allowed Redirect URLs in Supabase

Supabase → Project → Authentication → URL Configuration → Allowed Redirect URLs

Add these exact URLs (adjust domain accordingly):
- Local development: `http://localhost:3000/auth/reset-password`
- Production: `https://your-app.vercel.app/auth/reset-password` (or your custom domain)
- Preview (optional): add specific preview domains if you use them, e.g.
  - `https://your-branch-slug-your-team.vercel.app/auth/reset-password`

Notes:
- Some Supabase plans don’t support wildcard entries for Allowed Redirect URLs; prefer explicit entries.
- Keep the path `/auth/reset-password` consistent with the page in this repo.

## 3) How the app computes `redirectTo`

Our API routes build `redirectTo` as follows (in order):
1. `NEXT_PUBLIC_SITE_URL`
2. Request `Origin` header
3. `https://${VERCEL_URL}` (Vercel-provided)
4. Fallback `http://localhost:3000`

Resulting `redirectTo` is `${siteUrl}/auth/reset-password`.

## 4) Troubleshooting

- Email still points to `localhost`:
  - Ensure `NEXT_PUBLIC_SITE_URL` is set in Vercel and the function is running on Vercel (not locally).
  - Confirm your route logs or add a temporary log to verify `siteUrl` selection.
  - Verify the domains are listed in Supabase Allowed Redirect URLs.

- Link lands on `/` with a long `#access_token` hash:
  - The home page now forwards `#access_token`, `error=`, or `type=recovery` hashes to `/auth/reset-password` automatically.

- Expired/invalid link:
  - The reset page shows a friendly message and lets users resend the email.
