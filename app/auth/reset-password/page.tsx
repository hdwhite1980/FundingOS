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

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (!hash || !hash.includes('access_token')) {
      setError('Invalid or missing reset link. Please use the link from your email.')
      setLoading(false)
      return
    }

    // Remove leading '#'
    const code = hash.startsWith('#') ? hash.substring(1) : hash
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Reset your password</h1>
        {loading && (
          <p className="text-slate-600">Verifying your reset link…</p>
        )}
        {!loading && error && (
          <div className="text-red-600 text-sm mb-4">{error}</div>
        )}
        {!loading && !error && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
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
