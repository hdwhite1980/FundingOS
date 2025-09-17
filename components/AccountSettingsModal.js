'use client'
import { useEffect, useMemo, useState } from 'react'
import { X, User, Building2, Bell, ShieldCheck, Settings, Mail, Smartphone, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import ActiveSessionsManager from './ActiveSessionsManager'
import TwoFactorAuth from './TwoFactorAuth'
import DeviceManager from './DeviceManager'

const ORG_TYPES = [
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'for_profit', label: 'For-Profit Business' },
  { value: 'government', label: 'Government Entity' },
  { value: 'individual', label: 'Individual' },
  { value: 'minority_owned', label: 'Minority-Owned' },
  { value: 'women_owned', label: 'Women-Owned' },
  { value: 'veteran_owned', label: 'Veteran-Owned' },
  { value: 'small_business', label: 'Small Business' },
]

const USER_ROLES = [
  { value: 'company', label: 'Company' },
  { value: 'grant_writer', label: 'Grant Writer' },
  { value: 'angel', label: 'Angel Investor' },
]

export default function AccountSettingsModal({ user, userProfile, onUpdated, onClose }) {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'preferences' | 'notifications' | 'security'
  const [saving, setSaving] = useState(false)

  const existingKeys = useMemo(() => Object.keys(userProfile || {}), [userProfile])
  const hasColumn = (key) => existingKeys.includes(key)

  const [form, setForm] = useState({
    full_name: userProfile?.full_name || '',
    email: user?.email || userProfile?.email || '',
    organization_name: userProfile?.organization_name || '',
    organization_type: userProfile?.organization_type || 'nonprofit',
    organization_types: userProfile?.organization_types || (userProfile?.organization_type ? [userProfile.organization_type] : []),
    user_role: userProfile?.user_role || 'company',
  })

  const [notifications, setNotifications] = useState(() => {
    const np = userProfile?.notification_preferences || { email: true, app: true, sms: false, digest: 'weekly' }
    return {
      email: np.email !== false,
      app: np.app !== false,
      sms: !!np.sms,
      digest: np.digest || 'weekly',
    }
  })

  useEffect(() => {
    setForm((f) => ({
      ...f,
      full_name: userProfile?.full_name || '',
      email: user?.email || userProfile?.email || '',
      organization_name: userProfile?.organization_name || '',
      organization_type: userProfile?.organization_type || 'nonprofit',
      organization_types: userProfile?.organization_types || (userProfile?.organization_type ? [userProfile.organization_type] : []),
      user_role: userProfile?.user_role || 'company',
    }))
    setNotifications(() => {
      const np = userProfile?.notification_preferences || { email: true, app: true, sms: false, digest: 'weekly' }
      return {
        email: np.email !== false,
        app: np.app !== false,
        sms: !!np.sms,
        digest: np.digest || 'weekly',
      }
    })
  }, [userProfile, user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleOrgType = (value) => {
    setForm((prev) => {
      const current = Array.isArray(prev.organization_types) ? prev.organization_types : []
      let updated
      if (current.includes(value)) {
        updated = current.filter(v => v !== value)
      } else {
        updated = [...current, value]
      }
      const primary = updated[0] || ''
      return { ...prev, organization_types: updated, organization_type: primary }
    })
  }

  const toggleNotif = (key) => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))

  const prepareUpdates = () => {
    // Only send keys that exist on the profile to avoid DB errors on missing columns
    const allowed = {}
    const candidates = {
      full_name: form.full_name,
      organization_name: form.organization_name,
      organization_type: form.organization_type,
      organization_types: form.organization_types,
      user_role: form.user_role,
    }
    for (const [k, v] of Object.entries(candidates)) {
      if (hasColumn(k) && v !== userProfile?.[k]) allowed[k] = v
    }

    // Merge notification_preferences JSONB if column exists
    if (hasColumn('notification_preferences')) {
      const merged = {
        ...(userProfile?.notification_preferences || {}),
        email: notifications.email,
        app: notifications.app,
        sms: notifications.sms,
        digest: notifications.digest,
      }
      allowed.notification_preferences = merged
    }
    return allowed
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updates = prepareUpdates()

      const hasNotif = hasColumn('notification_preferences')
      const { notification_preferences, ...profileUpdates } = updates

      let updatedProfile = null

      if (Object.keys(profileUpdates).length > 0) {
        const res = await fetch('/api/account/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, updates: profileUpdates })
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Profile update failed')
        }
        const j = await res.json()
        updatedProfile = j.profile
      }

      if (hasNotif) {
        const res = await fetch('/api/account/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            preferences: {
              email: notifications.email,
              app: notifications.app,
              sms: notifications.sms,
              digest: notifications.digest
            }
          })
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Notification update failed')
        }
        const j = await res.json()
        updatedProfile = j.profile || updatedProfile
      }

      if (!updatedProfile) {
        toast('No changes to save')
        return
      }

      toast.success('Account settings updated')
      onUpdated && onUpdated(updatedProfile)
      onClose && onClose()
    } catch (e) {
      console.error('Account settings save error:', e)
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900">Account Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${activeTab==='profile' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${activeTab==='preferences' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Building2 className="w-4 h-4" />
              <span>Organization</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${activeTab==='notifications' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${activeTab==='security' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  className="w-full form-input"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  value={form.email}
                  readOnly
                  className="w-full form-input bg-slate-50 text-slate-500"
                />
              </div>
              {hasColumn('user_role') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    name="user_role"
                    value={form.user_role}
                    onChange={handleChange}
                    className="w-full form-input"
                  >
                    {USER_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                <input
                  name="organization_name"
                  value={form.organization_name}
                  onChange={handleChange}
                  className="w-full form-input"
                  placeholder="Organization Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Type (Select all that apply)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ORG_TYPES.map(t => (
                    <label key={t.value} className="flex items-center p-2 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        className="mr-3"
                        checked={form.organization_types?.includes(t.value) || false}
                        onChange={() => toggleOrgType(t.value)}
                      />
                      <span className="text-sm">{t.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Primary type is set to your first selection.</p>
              </div>
              {!hasColumn('organization_type') && (
                <p className="text-xs text-amber-600">Organization fields not available on your profile schema yet.</p>
              )}
              {!hasColumn('organization_types') && (
                <p className="text-xs text-amber-600">Multi-select org types not available until database migration is applied.</p>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {!hasColumn('notification_preferences') && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  Notification preferences column not found. Saving will be skipped unless the database migration has been applied.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => toggleNotif('email')}
                  className={`flex items-center justify-between border rounded-lg p-3 ${notifications.email ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                >
                  <span className="flex items-center space-x-2 text-sm text-slate-700">
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </span>
                  <span className={`text-xs font-medium ${notifications.email ? 'text-emerald-700' : 'text-slate-400'}`}>{notifications.email ? 'On' : 'Off'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleNotif('app')}
                  className={`flex items-center justify-between border rounded-lg p-3 ${notifications.app ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                >
                  <span className="flex items-center space-x-2 text-sm text-slate-700">
                    <MessageSquare className="w-4 h-4" />
                    <span>In-App</span>
                  </span>
                  <span className={`text-xs font-medium ${notifications.app ? 'text-emerald-700' : 'text-slate-400'}`}>{notifications.app ? 'On' : 'Off'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleNotif('sms')}
                  className={`flex items-center justify-between border rounded-lg p-3 ${notifications.sms ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                >
                  <span className="flex items-center space-x-2 text-sm text-slate-700">
                    <Smartphone className="w-4 h-4" />
                    <span>SMS</span>
                  </span>
                  <span className={`text-xs font-medium ${notifications.sms ? 'text-emerald-700' : 'text-slate-400'}`}>{notifications.sms ? 'On' : 'Off'}</span>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Digest Frequency</label>
                <select
                  value={notifications.digest}
                  onChange={(e) => setNotifications((p) => ({ ...p, digest: e.target.value }))}
                  className="w-full form-input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="high_priority_only">High-priority only</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <TwoFactorAuth />
              
              <div className="border-t pt-8">
                <ActiveSessionsManager />
              </div>
              
              <div className="border-t pt-8">
                <DeviceManager />
              </div>
              
              <div className="border-t pt-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Password Management</h3>
                  <p className="text-sm text-slate-600">
                    Manage your account password and recovery options
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        // You can integrate the password reset flow here
                        window.location.href = '/auth/reset-password'
                      }}
                      className="px-4 py-2 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors text-center"
                    >
                      Change Password
                    </a>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/auth/forgot-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user?.email })
                          })
                          if (response.ok) {
                            toast.success('Password reset instructions sent to your email')
                          }
                        } catch (error) {
                          toast.error('Failed to send reset email')
                        }
                      }}
                      className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Send Reset Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
