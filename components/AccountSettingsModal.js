'use client'
import { useEffect, useMemo, useState } from 'react'
import { X, User, Building2, Bell, ShieldCheck, Settings, Mail, Smartphone, MessageSquare, MapPin, Users, Target, Award, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import ActiveSessionsManager from './ActiveSessionsManager'
import TwoFactorAuth from './TwoFactorAuth'
import DeviceManager from './DeviceManager'
import DeleteAccount from './DeleteAccount'

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

const SERVICE_AREAS = [
  { value: 'education', label: 'Education & Training' },
  { value: 'healthcare', label: 'Healthcare & Mental Health' },
  { value: 'housing', label: 'Housing & Homelessness' },
  { value: 'economic_development', label: 'Economic Development' },
  { value: 'environment', label: 'Environmental Conservation' },
  { value: 'arts_culture', label: 'Arts & Culture' },
  { value: 'youth_development', label: 'Youth Development' },
  { value: 'senior_services', label: 'Senior Services' },
  { value: 'food_nutrition', label: 'Food & Nutrition' },
  { value: 'public_safety', label: 'Public Safety' },
  { value: 'community_development', label: 'Community Development' },
  { value: 'research', label: 'Research & Innovation' },
]

const TARGET_DEMOGRAPHICS = [
  { value: 'children_youth', label: 'Children & Youth' },
  { value: 'seniors', label: 'Seniors (65+)' },
  { value: 'veterans', label: 'Veterans' },
  { value: 'persons_with_disabilities', label: 'Persons with Disabilities' },
  { value: 'low_income', label: 'Low-Income Individuals' },
  { value: 'minorities', label: 'Racial/Ethnic Minorities' },
  { value: 'women', label: 'Women' },
  { value: 'immigrants', label: 'Immigrants & Refugees' },
  { value: 'rural_communities', label: 'Rural Communities' },
  { value: 'urban_communities', label: 'Urban Communities' },
  { value: 'general_public', label: 'General Public' },
]

export default function AccountSettingsModal({ user, userProfile, onUpdated, onClose }) {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'preferences' | 'notifications' | 'security'
  const [saving, setSaving] = useState(false)

  const existingKeys = useMemo(() => Object.keys(userProfile || {}), [userProfile])
  const hasColumn = (key) => existingKeys.includes(key)

  const [form, setForm] = useState({
    // Basic Profile
    full_name: userProfile?.full_name || '',
    email: user?.email || userProfile?.email || '',
    organization_name: userProfile?.organization_name || '',
    organization_type: userProfile?.organization_type || (Array.isArray(userProfile?.organization_types) && userProfile.organization_types.length > 0 ? userProfile.organization_types[0] : ''),
    organization_types: Array.isArray(userProfile?.organization_types)
      ? userProfile.organization_types
      : (userProfile?.organization_type ? [userProfile.organization_type] : []),
    user_role: userProfile?.user_role || 'company',
    
    // Legal Foundation
    tax_id: userProfile?.tax_id || '',
    date_incorporated: userProfile?.date_incorporated || '',
    state_incorporated: userProfile?.state_incorporated || '',
    sam_gov_status: userProfile?.sam_gov_status || '',
    grants_gov_status: userProfile?.grants_gov_status || '',
    duns_uei_number: userProfile?.duns_uei_number || '',
    compliance_history: userProfile?.compliance_history || '',
    
    // Address & Contact
    address_line1: userProfile?.address_line1 || '',
    address_line2: userProfile?.address_line2 || '',
    city: userProfile?.city || '',
    state: userProfile?.state || '',
    zip_code: userProfile?.zip_code || '',
    phone: userProfile?.phone || '',
    website: userProfile?.website || '',
    service_radius: userProfile?.service_radius || '',
    
    // Organizational Capacity
    annual_budget: userProfile?.annual_budget || '',
    full_time_staff: userProfile?.full_time_staff || '',
    board_size: userProfile?.board_size || '',
    years_in_operation: userProfile?.years_in_operation || '',
    grant_experience: userProfile?.grant_experience || '',
    largest_grant: userProfile?.largest_grant || '',
    grant_writing_capacity: userProfile?.grant_writing_capacity || '',
    data_collection_capacity: userProfile?.data_collection_capacity || '',
    partnership_approach: userProfile?.partnership_approach || '',
    
    // Mission & Focus
    mission_statement: userProfile?.mission_statement || '',
    primary_service_areas: userProfile?.primary_service_areas || [],
    target_demographics: userProfile?.target_demographics || [],
    unique_differentiators: userProfile?.unique_differentiators || ['', '', ''],
    key_outcomes: userProfile?.key_outcomes || '',
    
    // Financial Systems
    audit_status: userProfile?.audit_status || '',
    financial_systems: userProfile?.financial_systems || '',
    indirect_cost_rate: userProfile?.indirect_cost_rate || '',
    
    // Certifications
    minority_owned: userProfile?.minority_owned || false,
    woman_owned: userProfile?.woman_owned || false,
    veteran_owned: userProfile?.veteran_owned || false,
    small_business: userProfile?.small_business || false,
    hubzone_certified: userProfile?.hubzone_certified || false,
    eight_a_certified: userProfile?.eight_a_certified || false,
    disadvantaged_business: userProfile?.disadvantaged_business || false,
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
      // Basic Profile
      full_name: userProfile?.full_name || '',
      email: user?.email || userProfile?.email || '',
      organization_name: userProfile?.organization_name || '',
      organization_type: userProfile?.organization_type || (Array.isArray(userProfile?.organization_types) && userProfile.organization_types.length > 0 ? userProfile.organization_types[0] : ''),
      organization_types: Array.isArray(userProfile?.organization_types)
        ? userProfile.organization_types
        : (userProfile?.organization_type ? [userProfile.organization_type] : []),
      user_role: userProfile?.user_role || 'company',
      
      // Legal Foundation
      tax_id: userProfile?.tax_id || '',
      date_incorporated: userProfile?.date_incorporated || '',
      state_incorporated: userProfile?.state_incorporated || '',
      sam_gov_status: userProfile?.sam_gov_status || '',
      grants_gov_status: userProfile?.grants_gov_status || '',
      duns_uei_number: userProfile?.duns_uei_number || '',
      compliance_history: userProfile?.compliance_history || '',
      
      // Address & Contact
      address_line1: userProfile?.address_line1 || '',
      address_line2: userProfile?.address_line2 || '',
      city: userProfile?.city || '',
      state: userProfile?.state || '',
      zip_code: userProfile?.zip_code || '',
      phone: userProfile?.phone || '',
      website: userProfile?.website || '',
      service_radius: userProfile?.service_radius || '',
      
      // Organizational Capacity
      annual_budget: userProfile?.annual_budget || '',
      full_time_staff: userProfile?.full_time_staff || '',
      board_size: userProfile?.board_size || '',
      years_in_operation: userProfile?.years_in_operation || '',
      grant_experience: userProfile?.grant_experience || '',
      largest_grant: userProfile?.largest_grant || '',
      grant_writing_capacity: userProfile?.grant_writing_capacity || '',
      data_collection_capacity: userProfile?.data_collection_capacity || '',
      partnership_approach: userProfile?.partnership_approach || '',
      
      // Mission & Focus
      mission_statement: userProfile?.mission_statement || '',
      primary_service_areas: userProfile?.primary_service_areas || [],
      target_demographics: userProfile?.target_demographics || [],
      unique_differentiators: userProfile?.unique_differentiators || ['', '', ''],
      key_outcomes: userProfile?.key_outcomes || '',
      
      // Financial Systems
      audit_status: userProfile?.audit_status || '',
      financial_systems: userProfile?.financial_systems || '',
      indirect_cost_rate: userProfile?.indirect_cost_rate || '',
      
      // Certifications
      minority_owned: userProfile?.minority_owned || false,
      woman_owned: userProfile?.woman_owned || false,
      veteran_owned: userProfile?.veteran_owned || false,
      small_business: userProfile?.small_business || false,
      hubzone_certified: userProfile?.hubzone_certified || false,
      eight_a_certified: userProfile?.eight_a_certified || false,
      disadvantaged_business: userProfile?.disadvantaged_business || false,
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
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleArrayChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleArray = (fieldName, value) => {
    const current = form[fieldName] || []
    if (current.includes(value)) {
      handleArrayChange(fieldName, current.filter(v => v !== value))
    } else {
      handleArrayChange(fieldName, [...current, value])
    }
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
    // Collect all form fields that have changed
    const updates = {}
    const candidates = {
      // Basic Profile
      full_name: form.full_name,
      organization_name: form.organization_name,
      organization_type: form.organization_type,
      organization_types: form.organization_types,
      user_role: form.user_role,
      
      // Legal Foundation - these are standard schema fields
      tax_id: form.tax_id,
      date_incorporated: form.date_incorporated,
      state_incorporated: form.state_incorporated,
      sam_gov_status: form.sam_gov_status,
      grants_gov_status: form.grants_gov_status,
      duns_uei_number: form.duns_uei_number,
      compliance_history: form.compliance_history,
      
      // Address & Contact
      address_line1: form.address_line1,
      address_line2: form.address_line2,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      phone: form.phone,
      website: form.website,
      service_radius: form.service_radius,
      
      // Organizational Capacity
      annual_budget: form.annual_budget === '' ? null : form.annual_budget,
      full_time_staff: form.full_time_staff === '' ? null : form.full_time_staff,
      board_size: form.board_size === '' ? null : form.board_size,
      years_in_operation: form.years_in_operation === '' ? null : form.years_in_operation,
      grant_experience: form.grant_experience,
      largest_grant: form.largest_grant === '' ? null : form.largest_grant,
      grant_writing_capacity: form.grant_writing_capacity,
      data_collection_capacity: form.data_collection_capacity,
      partnership_approach: form.partnership_approach,
      
      // Mission & Focus
      mission_statement: form.mission_statement,
      primary_service_areas: form.primary_service_areas,
      target_demographics: form.target_demographics,
      unique_differentiators: form.unique_differentiators,
      key_outcomes: form.key_outcomes,
      
      // Financial Systems
      audit_status: form.audit_status,
      financial_systems: form.financial_systems,
      indirect_cost_rate: form.indirect_cost_rate === '' ? null : form.indirect_cost_rate,
      
      // Certifications
      minority_owned: form.minority_owned,
      woman_owned: form.woman_owned,
      veteran_owned: form.veteran_owned,
      small_business: form.small_business,
      hubzone_certified: form.hubzone_certified,
      eight_a_certified: form.eight_a_certified,
      disadvantaged_business: form.disadvantaged_business,
    }
    
    // Include all fields that have changed, regardless of whether they exist in current profile
    // The API will handle fields that don't exist in the schema
    for (const [k, v] of Object.entries(candidates)) {
      if (v !== userProfile?.[k]) {
        updates[k] = v
      }
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
      updates.notification_preferences = merged
    }
    
    return updates
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
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='profile' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('organization')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='organization' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Building2 className="w-4 h-4" />
              <span>Organization</span>
            </button>
            <button
              onClick={() => setActiveTab('address')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='address' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <MapPin className="w-4 h-4" />
              <span>Address</span>
            </button>
            <button
              onClick={() => setActiveTab('capacity')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='capacity' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Users className="w-4 h-4" />
              <span>Capacity</span>
            </button>
            <button
              onClick={() => setActiveTab('mission')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='mission' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Target className="w-4 h-4" />
              <span>Mission</span>
            </button>
            <button
              onClick={() => setActiveTab('certifications')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='certifications' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Award className="w-4 h-4" />
              <span>Certifications</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='notifications' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 whitespace-nowrap ${activeTab==='security' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-6">
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

              {/* Legal Foundation */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Legal Foundation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID/EIN</label>
                    <input
                      name="tax_id"
                      value={form.tax_id}
                      onChange={handleChange}
                      className="w-full form-input"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date Incorporated</label>
                    <input
                      type="date"
                      name="date_incorporated"
                      value={form.date_incorporated}
                      onChange={handleChange}
                      className="w-full form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State Incorporated</label>
                    <input
                      name="state_incorporated"
                      value={form.state_incorporated}
                      onChange={handleChange}
                      className="w-full form-input"
                      placeholder="Delaware, California, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">DUNS/UEI Number</label>
                    <input
                      name="duns_uei_number"
                      value={form.duns_uei_number}
                      onChange={handleChange}
                      className="w-full form-input"
                      placeholder="Unique Entity Identifier"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SAM.gov Status</label>
                    <select
                      name="sam_gov_status"
                      value={form.sam_gov_status}
                      onChange={handleChange}
                      className="w-full form-input"
                    >
                      <option value="">Select status</option>
                      <option value="active">Active and current</option>
                      <option value="needs_renewal">Needs renewal</option>
                      <option value="not_registered">Not registered</option>
                      <option value="dont_know">Don't know</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grants.gov Status</label>
                    <select
                      name="grants_gov_status"
                      value={form.grants_gov_status}
                      onChange={handleChange}
                      className="w-full form-input"
                    >
                      <option value="">Select status</option>
                      <option value="active">Active and current</option>
                      <option value="needs_setup">Needs setup</option>
                      <option value="not_registered">Not registered</option>
                      <option value="dont_know">Don't know</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Compliance History</label>
                  <select
                    name="compliance_history"
                    value={form.compliance_history}
                    onChange={handleChange}
                    className="w-full form-input"
                  >
                    <option value="">Select compliance status</option>
                    <option value="clean">Clean record - no compliance issues</option>
                    <option value="minor_resolved">Minor issues resolved</option>
                    <option value="addressing_issues">Currently addressing compliance issues</option>
                    <option value="major_violations">Major compliance violations</option>
                  </select>
                </div>
              </div>
            </div>
          )}          {activeTab === 'organization' && (
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
              
              {/* Financial Systems */}
              {(hasColumn('audit_status') || hasColumn('financial_systems') || hasColumn('indirect_cost_rate')) && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Financial Systems</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasColumn('audit_status') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Audit Status</label>
                        <select
                          name="audit_status"
                          value={form.audit_status}
                          onChange={handleChange}
                          className="w-full form-input"
                        >
                          <option value="">Select audit status</option>
                          <option value="current_audit">Current independent audit</option>
                          <option value="audit_in_progress">Audit in progress</option>
                          <option value="needs_audit">Needs audit</option>
                          <option value="reviewed_financial">Reviewed financial statements</option>
                          <option value="compiled_financial">Compiled financial statements</option>
                          <option value="no_formal_audit">No formal audit</option>
                        </select>
                      </div>
                    )}
                    {hasColumn('financial_systems') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Financial Management System</label>
                        <select
                          name="financial_systems"
                          value={form.financial_systems}
                          onChange={handleChange}
                          className="w-full form-input"
                        >
                          <option value="">Select system</option>
                          <option value="quickbooks">QuickBooks</option>
                          <option value="sage">Sage Intacct</option>
                          <option value="netsuite">NetSuite</option>
                          <option value="blackbaud">Blackbaud Financial Edge</option>
                          <option value="spreadsheet">Spreadsheet-based</option>
                          <option value="other">Other system</option>
                        </select>
                      </div>
                    )}
                    {hasColumn('indirect_cost_rate') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Indirect Cost Rate (%)</label>
                        <input
                          type="number"
                          name="indirect_cost_rate"
                          value={form.indirect_cost_rate}
                          onChange={handleChange}
                          className="w-full form-input"
                          placeholder="10"
                          step="0.01"
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Primary Address</h4>
                <div className="space-y-4">
                  {hasColumn('address_line1') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                      <input
                        name="address_line1"
                        value={form.address_line1}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Street address"
                      />
                    </div>
                  )}
                  {hasColumn('address_line2') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                      <input
                        name="address_line2"
                        value={form.address_line2}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="Apartment, suite, etc."
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {hasColumn('city') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input
                          name="city"
                          value={form.city}
                          onChange={handleChange}
                          className="w-full form-input"
                          placeholder="City"
                        />
                      </div>
                    )}
                    {hasColumn('state') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                        <input
                          name="state"
                          value={form.state}
                          onChange={handleChange}
                          className="w-full form-input"
                          placeholder="State"
                        />
                      </div>
                    )}
                    {hasColumn('zip_code') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                        <input
                          name="zip_code"
                          value={form.zip_code}
                          onChange={handleChange}
                          className="w-full form-input"
                          placeholder="ZIP"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasColumn('phone') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full form-input"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                )}
                {hasColumn('website') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input
                      type="url"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      className="w-full form-input"
                      placeholder="https://example.com"
                    />
                  </div>
                )}
              </div>

              {/* Service Geography */}
              {hasColumn('service_radius') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Primary Service Area</label>
                  <select
                    name="service_radius"
                    value={form.service_radius}
                    onChange={handleChange}
                    className="w-full form-input"
                  >
                    <option value="">Select service area</option>
                    <option value="neighborhood">Neighborhood/Community</option>
                    <option value="city">City/Municipality</option>
                    <option value="county">County</option>
                    <option value="multi_county">Multi-county region</option>
                    <option value="state">State</option>
                    <option value="multi_state">Multi-state region</option>
                    <option value="national">National</option>
                    <option value="international">International</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'capacity' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Organizational Capacity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hasColumn('annual_budget') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Annual Budget</label>
                      <select
                        name="annual_budget"
                        value={form.annual_budget}
                        onChange={handleChange}
                        className="w-full form-input"
                      >
                        <option value="">Select budget range</option>
                        <option value="under_100k">Under $100,000</option>
                        <option value="100k_500k">$100,000 - $500,000</option>
                        <option value="500k_1m">$500,000 - $1,000,000</option>
                        <option value="1m_5m">$1,000,000 - $5,000,000</option>
                        <option value="5m_10m">$5,000,000 - $10,000,000</option>
                        <option value="over_10m">Over $10,000,000</option>
                      </select>
                    </div>
                  )}
                  {hasColumn('years_in_operation') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Years in Operation</label>
                      <input
                        type="number"
                        name="years_in_operation"
                        value={form.years_in_operation}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="5"
                        min="0"
                        max="100"
                      />
                    </div>
                  )}
                  {hasColumn('full_time_staff') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full-Time Staff</label>
                      <input
                        type="number"
                        name="full_time_staff"
                        value={form.full_time_staff}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="10"
                        min="0"
                      />
                    </div>
                  )}
                  {hasColumn('board_size') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Board Size</label>
                      <input
                        type="number"
                        name="board_size"
                        value={form.board_size}
                        onChange={handleChange}
                        className="w-full form-input"
                        placeholder="7"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Grant Experience */}
              <div className="space-y-4">
                {hasColumn('grant_experience') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grant Experience</label>
                    <select
                      name="grant_experience"
                      value={form.grant_experience}
                      onChange={handleChange}
                      className="w-full form-input"
                    >
                      <option value="">Select experience level</option>
                      <option value="none">No grant experience</option>
                      <option value="minimal">Minimal (1-2 grants)</option>
                      <option value="moderate">Moderate (3-10 grants)</option>
                      <option value="extensive">Extensive (10+ grants)</option>
                      <option value="expert">Expert (50+ grants)</option>
                    </select>
                  </div>
                )}
                {hasColumn('largest_grant') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Largest Grant Received</label>
                    <select
                      name="largest_grant"
                      value={form.largest_grant}
                      onChange={handleChange}
                      className="w-full form-input"
                    >
                      <option value="">Select amount</option>
                      <option value="under_10k">Under $10,000</option>
                      <option value="10k_50k">$10,000 - $50,000</option>
                      <option value="50k_100k">$50,000 - $100,000</option>
                      <option value="100k_500k">$100,000 - $500,000</option>
                      <option value="500k_1m">$500,000 - $1,000,000</option>
                      <option value="over_1m">Over $1,000,000</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Capacity Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasColumn('grant_writing_capacity') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grant Writing Capacity</label>
                    <select
                      name="grant_writing_capacity"
                      value={form.grant_writing_capacity}
                      onChange={handleChange}
                      className="w-full form-input"
                    >
                      <option value="">Select capacity</option>
                      <option value="none">No internal capacity</option>
                      <option value="limited">Limited internal capacity</option>
                      <option value="moderate">Moderate internal capacity</option>
                      <option value="strong">Strong internal capacity</option>
                      <option value="consultant">Use consultants</option>
                    </select>
                  </div>
                )}
                {hasColumn('data_collection_capacity') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Collection Capacity</label>
                    <select
                      name="data_collection_capacity"
                      value={form.data_collection_capacity}
                      onChange={handleChange}
                      className="w-full form-input"
                    >
                      <option value="">Select capacity</option>
                      <option value="basic">Basic data collection</option>
                      <option value="moderate">Moderate capacity</option>
                      <option value="strong">Strong capacity</option>
                      <option value="advanced">Advanced analytics</option>
                    </select>
                  </div>
                )}
              </div>

              {hasColumn('partnership_approach') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Partnership Approach</label>
                  <textarea
                    name="partnership_approach"
                    value={form.partnership_approach}
                    onChange={handleChange}
                    className="w-full form-input"
                    rows="3"
                    placeholder="Describe your approach to partnerships and collaboration"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'mission' && (
            <div className="space-y-6">
              {hasColumn('mission_statement') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mission Statement</label>
                  <textarea
                    name="mission_statement"
                    value={form.mission_statement}
                    onChange={handleChange}
                    className="w-full form-input"
                    rows="4"
                    placeholder="Your organization's mission statement"
                  />
                </div>
              )}

              {hasColumn('primary_service_areas') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Primary Service Areas</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {SERVICE_AREAS.map((area) => (
                      <label key={area.value} className="flex items-center p-2 border rounded-lg hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.primary_service_areas?.includes(area.value) || false}
                          onChange={() => toggleArray('primary_service_areas', area.value)}
                          className="mr-3"
                        />
                        <span className="text-sm">{area.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {hasColumn('target_demographics') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Demographics</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {TARGET_DEMOGRAPHICS.map((demo) => (
                      <label key={demo.value} className="flex items-center p-2 border rounded-lg hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.target_demographics?.includes(demo.value) || false}
                          onChange={() => toggleArray('target_demographics', demo.value)}
                          className="mr-3"
                        />
                        <span className="text-sm">{demo.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {hasColumn('key_outcomes') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Key Outcomes & Metrics</label>
                  <textarea
                    name="key_outcomes"
                    value={form.key_outcomes}
                    onChange={handleChange}
                    className="w-full form-input"
                    rows="3"
                    placeholder="Describe the key outcomes and success metrics your organization tracks"
                  />
                </div>
              )}

              {hasColumn('unique_differentiators') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unique Differentiators</label>
                  <p className="text-sm text-slate-500 mb-2">What makes your organization unique? (Top 3)</p>
                  <div className="space-y-2">
                    {[0, 1, 2].map((index) => (
                      <input
                        key={index}
                        type="text"
                        value={form.unique_differentiators?.[index] || ''}
                        onChange={(e) => {
                          const newDifferentiators = [...(form.unique_differentiators || ['', '', ''])]
                          newDifferentiators[index] = e.target.value
                          handleArrayChange('unique_differentiators', newDifferentiators)
                        }}
                        className="w-full form-input"
                        placeholder={`Differentiator ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'certifications' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Certifications & Set-Asides</h4>
                <p className="text-sm text-slate-600 mb-4">Select all certifications that apply to your organization</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hasColumn('minority_owned') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="minority_owned"
                        checked={form.minority_owned}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">Minority-Owned Business Enterprise (MBE)</span>
                    </label>
                  )}
                  {hasColumn('woman_owned') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="woman_owned"
                        checked={form.woman_owned}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">Woman-Owned Business Enterprise (WBE)</span>
                    </label>
                  )}
                  {hasColumn('veteran_owned') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="veteran_owned"
                        checked={form.veteran_owned}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">Veteran-Owned Small Business (VOSB)</span>
                    </label>
                  )}
                  {hasColumn('small_business') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="small_business"
                        checked={form.small_business}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">Small Business Administration (SBA)</span>
                    </label>
                  )}
                  {hasColumn('hubzone_certified') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="hubzone_certified"
                        checked={form.hubzone_certified}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">HUBZone Certified</span>
                    </label>
                  )}
                  {hasColumn('eight_a_certified') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="eight_a_certified"
                        checked={form.eight_a_certified}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">8(a) Business Development Program</span>
                    </label>
                  )}
                  {hasColumn('disadvantaged_business') && (
                    <label className="flex items-center p-3 border rounded-lg hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        name="disadvantaged_business"
                        checked={form.disadvantaged_business}
                        onChange={handleChange}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium">Disadvantaged Business Enterprise (DBE)</span>
                    </label>
                  )}
                </div>
              </div>
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
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Two-Factor Authentication</h3>
                <div className="min-h-[200px]">
                  {(() => {
                    try {
                      return <TwoFactorAuth />
                    } catch (error) {
                      console.error('TwoFactorAuth component error:', error)
                      return (
                        <div className="text-center py-8 text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
                          <p>Two-Factor Authentication temporarily unavailable</p>
                          <p className="text-xs mt-1">Check console for details</p>
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
              
              <div className="border-t pt-8">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Sessions</h3>
                  <div className="min-h-[150px]">
                    {(() => {
                      try {
                        return <ActiveSessionsManager />
                      } catch (error) {
                        console.error('ActiveSessionsManager component error:', error)
                        return (
                          <div className="text-center py-8 text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
                            <p>Session management temporarily unavailable</p>
                            <p className="text-xs mt-1">Check console for details</p>
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-8">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Device Management</h3>
                  <div className="min-h-[150px]">
                    {(() => {
                      try {
                        return <DeviceManager />
                      } catch (error) {
                        console.error('DeviceManager component error:', error)
                        return (
                          <div className="text-center py-8 text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
                            <p>Device management temporarily unavailable</p>
                            <p className="text-xs mt-1">Check console for details</p>
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-8">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">Password Management</h3>
                    <p className="text-sm text-slate-600">
                      Manage your account password and recovery options
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          // You can integrate the password reset flow here
                          window.location.href = '/auth/reset-password'
                        }}
                        className="px-4 py-2 text-white bg-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors text-center"
                      >
                        Change Password
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/auth/password-reset/request', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: user?.email })
                            })
                            if (response.ok) {
                              toast.success('Password reset code sent to your email')
                            }
                          } catch (error) {
                            toast.error('Failed to send reset email')
                          }
                        }}
                        className="px-4 py-2 text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        Send Reset Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-8">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  {(() => {
                    try {
                      return <DeleteAccount />
                    } catch (error) {
                      console.error('DeleteAccount component error:', error)
                      return (
                        <div className="text-center py-8 text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
                          <p>Delete account options temporarily unavailable</p>
                          <p className="text-xs mt-1">Check console for details</p>
                        </div>
                      )
                    }
                  })()}
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
