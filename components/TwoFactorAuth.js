'use client'
import { useState, useEffect } from 'react'
import { Shield, Smartphone, Key, QrCode, Copy, Check, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useSecurityData } from '../hooks/useSecurityData'

export default function TwoFactorAuth() {
  const { user: authUser } = useAuth()
  const { loading, error, twoFactorEnabled, refetch, user } = useSecurityData()
  const [setupStep, setSetupStep] = useState('check') // 'check', 'setup', 'verify', 'backup'
  const [setupLoading, setSetupLoading] = useState(false) // For individual 2FA operations
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)

  // Robust user ID getter as fallback
  const getRobustUserId = () => {
    // Try hooks first
    let userId = user?.id || authUser?.id
    
    // Fallback to localStorage if hooks fail
    if (!userId) {
      const authSources = [
        'sb-supabase-auth-token',
        'supabase.auth.token', 
        'sb-auth-token',
        'sb-localhost-auth-token'
      ];
      
      for (const key of authSources) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.user?.id) {
              userId = parsed.user.id;
              console.log(`✅ TwoFactorAuth: Got user ID from localStorage (${key})`);
              break;
            }
          } catch (e) {
            // Continue to next source
          }
        }
      }
    }
    
    return userId;
  };

  // Remove the old checkTwoFactorStatus function since we now use the hook

  const initiateTwoFactorSetup = async () => {
    try {
      // Debug logging
      console.log('🔍 TwoFactorAuth Debug:', {
        user: user,
        authUser: authUser,
        loading: loading,
        error: error
      })
      
      // Use robust user ID getter
      const userId = getRobustUserId()
      
      if (!userId) {
        console.error('❌ No user ID found:', { user, authUser, localStorage: 'checked' })
        throw new Error('User not authenticated - please refresh the page and try again')
      }

      console.log('✅ Found user ID:', userId)
      setSetupLoading(true)
      const response = await fetch('/api/auth/2fa/setup-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to setup 2FA')
      }

      const data = await response.json()
      console.log('✅ 2FA Setup Success:', {
        qr_code_url: data.qr_code_url,
        secret_length: data.secret?.length,
        user_email: data.user?.email
      })
      setQrCodeUrl(data.qr_code_url)
      setSecret(data.secret)
      setSetupStep('setup')
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toast.error('Failed to setup 2FA')
    } finally {
      setSetupLoading(false)
    }
  }

  const verifyTwoFactorSetup = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    try {
      setSetupLoading(true)
      const response = await fetch('/api/auth/2fa/verify-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: getRobustUserId(),
          token: verificationCode.replace(/\s/g, ''), // Remove spaces
          secret: secret
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Invalid verification code')
      }

      const data = await response.json()
      setBackupCodes(data.backup_codes)
      setSetupStep('backup')
      toast.success('2FA enabled successfully!')
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast.error(error.message)
    } finally {
      setSetupLoading(false)
    }
  }

  const completeTwoFactorSetup = () => {
    refetch() // Refresh data from API instead of setting local state
    setSetupStep('check')
    setVerificationCode('')
    setSecret('')
    setQrCodeUrl('')
    setBackupCodes([])
  }

  const disableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    try {
      setSetupLoading(true)
      const response = await fetch('/api/auth/2fa/disable-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: getRobustUserId() })
      })

      if (!response.ok) {
        throw new Error('Failed to disable 2FA')
      }

      refetch() // Refresh data from API instead of setting local state
      toast.success('Two-factor authentication disabled')
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toast.error('Failed to disable 2FA')
    } finally {
      setSetupLoading(false)
    }
  }

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'secret') {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
      } else {
        setCopiedBackup(true)
        setTimeout(() => setCopiedBackup(false), 2000)
      }
      toast.success('Copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Data is now loaded automatically by the useSecurityData hook

  if (loading && setupStep === 'check') {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        <div className="h-32 bg-slate-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span>Two-Factor Authentication</span>
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Add an extra layer of security to your account
        </p>
      </div>

      {setupStep === 'check' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            twoFactorEnabled 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  twoFactorEnabled 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">
                    {twoFactorEnabled ? '2FA is enabled' : '2FA is disabled'}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {twoFactorEnabled 
                      ? 'Your account is protected with 2FA' 
                      : 'Enable 2FA to secure your account'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={twoFactorEnabled ? disableTwoFactor : initiateTwoFactorSetup}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  twoFactorEnabled
                    ? 'text-red-600 hover:bg-red-50 border border-red-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Working...</span>
                  </div>
                ) : twoFactorEnabled ? (
                  'Disable 2FA'
                ) : (
                  'Enable 2FA'
                )}
              </button>
            </div>
          </div>

          {!twoFactorEnabled && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">How it works</h4>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• Install an authenticator app like Google Authenticator or Authy</li>
                    <li>• Scan the QR code to add your account</li>
                    <li>• Enter the 6-digit code to verify setup</li>
                    <li>• Save your backup codes in a secure location</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {setupStep === 'setup' && (
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Scan QR Code
            </h4>
            <p className="text-sm text-slate-600 mb-4">
              Use your authenticator app to scan this QR code
            </p>
            
            {qrCodeUrl && (() => {
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(qrCodeUrl)}`;
              console.log('🖼️ QR Code Debug:', {
                originalUrl: qrCodeUrl,
                qrImageUrl: qrImageUrl
              });
              return (
                <div className="inline-block p-4 bg-white border rounded-lg shadow-sm">
                  <img 
                    src={qrImageUrl}
                    alt="2FA QR Code" 
                    className="w-48 h-48" 
                    onLoad={() => console.log('✅ QR code image loaded')}
                    onError={(e) => {
                      console.error('❌ QR code image failed to load:', e);
                      console.error('Failed URL:', qrImageUrl);
                    }}
                  />
                </div>
              );
            })()}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Or enter this code manually:
              </label>
              <button
                onClick={() => copyToClipboard(secret, 'secret')}
                className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center space-x-1"
              >
                {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSecret ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <code className="block p-2 bg-white border rounded text-sm font-mono break-all">
              {secret}
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Enter verification code from your authenticator app:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                placeholder="000000"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-center text-lg tracking-widest"
                maxLength={6}
              />
              <button
                onClick={verifyTwoFactorSetup}
                disabled={loading || verificationCode.length !== 6}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setSetupStep('check')}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {setupStep === 'backup' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              Save Your Backup Codes
            </h4>
            <p className="text-sm text-slate-600">
              Store these codes in a safe place. You can use them to access your account if you lose your phone.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">
                Backup Codes (use each code only once):
              </label>
              <button
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'backup')}
                className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center space-x-1"
              >
                {copiedBackup ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedBackup ? 'Copied!' : 'Copy All'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code key={index} className="block p-2 bg-white border rounded text-sm font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Important</h4>
                <p className="text-sm text-amber-800 mt-1">
                  Save these backup codes now. Each code can only be used once and you won't be able to see them again.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={completeTwoFactorSetup}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
          >
            Complete Setup
          </button>
        </div>
      )}
    </div>
  )
}