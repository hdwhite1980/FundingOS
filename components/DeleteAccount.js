'use client'
import { useState } from 'react'
import { Trash2, AlertTriangle, Shield, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function DeleteAccount() {
  const { user, signOut } = useAuth()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [step, setStep] = useState(1) // 1: Warning, 2: Confirmation, 3: Final confirmation

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm')
      return
    }

    if (!password.trim()) {
      toast.error('Please enter your password to confirm deletion')
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          confirmationText,
          password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('Account deleted successfully')
      
      // Sign out and redirect
      await signOut()
      window.location.href = '/auth'

    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error(error.message || 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setConfirmationText('')
    setPassword('')
    setShowPassword(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          <span>Delete Account</span>
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Permanently delete your account and all associated data
        </p>
      </div>

      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-900">This action cannot be undone</h4>
            <p className="text-sm text-red-800 mt-1">
              Deleting your account will permanently remove all of your data, including:
            </p>
            <ul className="text-sm text-red-800 mt-2 ml-4 space-y-1">
              <li>• All projects and funding applications</li>
              <li>• Financial records and donation history</li>
              <li>• Angel investor portfolio and investments</li>
              <li>• AI chat history and preferences</li>
              <li>• Security settings and trusted devices</li>
              <li>• Account profile and organization details</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-slate-900">Ready to delete your account?</h4>
          <p className="text-sm text-slate-600">
            This will immediately log you out and delete all your data
          </p>
        </div>
        <button
          onClick={() => {
            resetModal()
            setShowDeleteModal(true)
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {step === 1 ? 'Delete Account' : step === 2 ? 'Confirm Deletion' : 'Final Confirmation'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowDeleteModal(false)
                  resetModal()
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-900">Before you proceed</span>
                    </div>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Download any important data you want to keep</li>
                      <li>• Cancel any active subscriptions or payments</li>
                      <li>• Inform collaborators about the account deletion</li>
                      <li>• Consider deactivating instead if you might return</li>
                    </ul>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium mb-2">This deletion will remove:</p>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <span>✗ {user?.email} account access</span>
                      <span>✗ All project and funding data</span>
                      <span>✗ Financial records and investments</span>
                      <span>✗ AI chat history and completions</span>
                      <span>✗ Security settings and devices</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-slate-600 mb-4">
                      Type <strong>"DELETE MY ACCOUNT"</strong> to confirm deletion
                    </p>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center font-mono"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-slate-600">
                      Enter your password to complete the deletion
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ This action is irreversible. All data will be permanently deleted.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Back
                </button>
              )}
              
              <div className="flex space-x-3 ml-auto">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    resetModal()
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                
                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 2 && confirmationText !== 'DELETE MY ACCOUNT'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !password.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Forever</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}