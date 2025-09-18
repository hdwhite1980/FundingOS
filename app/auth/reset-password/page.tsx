"use client"
import { useEffect, useState } from 'react'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>("")
  const [accessToken, setAccessToken] = useState<string>("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [hashParams, setHashParams] = useState<Record<string, string>>({})

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const raw = hash.startsWith('#') ? hash.substring(1) : hash
    const params = new URLSearchParams(raw)
    const err = params.get('error')
    const errorDescription = params.get('error_description')
    const access = params.get('access_token')
    const refresh = params.get('refresh_token')
    const type = params.get('type')
    const hp: Record<string, string> = {}
    params.forEach((v, k) => { hp[k] = v })
    setHashParams(hp)

    // Handle errors from Supabase (expired/invalid links)
    if (err) {
      setError(decodeURIComponent(errorDescription || 'The reset link is invalid or has expired.'))
      setLoading(false)
      return
    }

    if (!access) {
      // For recovery flow, Supabase sometimes sets type=recovery and tokens in hash
      if (type !== 'recovery') {
        setError('Invalid or missing reset link. Please use the link from your email.')
        setLoading(false)
        return
      }
    }

    const code = raw
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'exchange', code })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to verify reset link')
        setAccessToken(data.access_token)
        setEmail(data.user?.email || '')
      } catch (e: any) {
        setError(e.message || 'Failed to verify reset link')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code: accessToken, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update password')
      setSuccess('Password updated. You can now sign in with your new password.')
    } catch (e: any) {
      setError(e.message || 'Failed to update password')
    }
  }

  const resendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!email) {
      setError('Please enter your email to resend the reset link.')
      return
    }
    try {
      setResendLoading(true)
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email')
      setSuccess('Reset code sent. Please check your inbox.')
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Reset your password</h1>
        {loading && (
          <p className="text-slate-600">Verifying your reset link…</p>
        )}
        {!loading && error && (
          <div>
            <div className="text-red-600 text-sm mb-4">{error}</div>
            <form onSubmit={resendEmail} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="you@example.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-2.5 rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50"
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending…' : 'Resend reset email'}
              </button>
            </form>
          </div>
        )}
        {!loading && !error && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled={!error}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-2.5 rounded-md font-medium hover:bg-emerald-700"
            >
              Update password
            </button>
            {success && (
              <div className="text-emerald-700 text-sm mt-2">{success}</div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
